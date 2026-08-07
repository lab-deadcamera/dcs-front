import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, forkJoin, from, map, mergeMap, Observable, of, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { CharactersService } from '../../services';
import {
  AssetType,
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../../interfaces';
import { CharacterFormDialogComponent } from '../components/character-form-dialog/character-form-dialog.component';
import { CharacterFilesDialogComponent } from '../components/character-files-dialog/character-files-dialog.component';
import { AssetCreateDialogComponent } from '../components/asset-create-dialog/asset-create-dialog.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { UsedAssetKind } from '@core/interfaces/studio.models';
import { toCharacter } from '@shared/utils';
import { FilesApiService } from '@app/services';
import { SourceThumbnailAssetPipe, SourceAssetPipe } from '@app/core/pipes';
import { FileEntity } from '@modules/files/files/interfaces';

/** Items revealed initially per tab before progressive render kicks in. */
const INITIAL_RENDER_COUNT = 200;
/** Items revealed per "Load 50 more" click. */
const RENDER_STEP = 50;

/**
 * Characters library — typed asset board.
 *
 * The library is split into three buckets driven by `metadata.assetType`:
 * CHARACTER · LOCATION · PROP. The top row exposes one "New …" button
 * per type which opens the shared `<app-asset-create-dialog>` wizard
 * (name + description + drag-drop multi-file upload). The tab strip
 * below filters the grid to the currently-active bucket.
 *
 * Existing edit / delete / file-manage flows still go through the
 * single-row `CharacterFormDialogComponent` and `CharacterFilesDialogComponent`.
 */
@Component({
  selector: 'app-index-characters',
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    CharacterFormDialogComponent,
    CharacterFilesDialogComponent,
    AssetCreateDialogComponent,
    SourceThumbnailAssetPipe,
    SourceAssetPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-characters.html',
  styleUrl: './index-characters.css',
})
export class IndexCharacters implements OnInit {
  @Output() charactersChanged = new EventEmitter<void>();

  protected readonly characters = inject(CharactersService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly filesApi = inject(FilesApiService);
  private readonly studio = inject(StudioStore);

  showUseButton = input<boolean>(false);

  /**
   * Optional header overrides. Host contexts (e.g. the Scene Resources
   * modal) can relabel the library's title/subtitle without touching the
   * shared `CHARACTERS.*` i18n, which other surfaces still rely on.
   */
  readonly headerTitle = input<string>();
  readonly headerHint = input<string>();

  /** Parent can listen to close itself when an asset is used. */
  readonly assetUsed = output<string>();

  /** Which bucket is currently shown in the grid. */
  protected readonly activeType = signal<AssetType>('character');

  /**
   * Per-asset preview metadata used by the card grid.
   *
   *   fileIds      — up to PREVIEW_GRID_MAX linked files rendered as a
   *                  thumbnail mosaic inside the card.
   *   count        — total number of linked files (drives the +N overlay
   *                  on the last tile when more files exist than tiles).
   *   brokenIds    — file ids whose `<img>` errored out; the fallback
   *                  icon shows through for those tiles only.
   *
   * Populated lazily after `load()` completes. Cached for the session —
   * `onAssetCreated` only refetches for the new asset, not the whole list.
   */
  protected readonly previewMap = signal<Record<string, PreviewInfo>>({});

  /** Max thumbnails rendered in the card preview mosaic. */
  protected readonly PREVIEW_GRID_MAX = 4;

  protected readonly tabs: {
    id: AssetType;
    labelKey: string;
    icon: string;
  }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER', icon: 'pi pi-user' },
    { id: 'location', labelKey: 'CHARACTERS.TABS.LOCATION', icon: 'pi pi-map' },
    { id: 'prop', labelKey: 'CHARACTERS.TABS.PROP', icon: 'pi pi-box' },
    { id: 'audio', labelKey: 'CHARACTERS.TABS.AUDIO', icon: 'pi pi-volume-up' },
  ];

  /** Assets of the active type, revealed progressively (200 → +50 per click). */
  protected readonly visibleAssets = computed<Character[]>(() => {
    const all = this.characters.itemsByType()[this.activeType()] ?? [];
    const limit = this.renderLimits()[this.activeType()] ?? INITIAL_RENDER_COUNT;
    return all.slice(0, limit);
  });

  /** True when more items can be revealed in the active tab: either the tab
   *  still has loaded-but-unrevealed items, or the server has more to fetch. */
  protected readonly hasMoreVisibleAssets = computed(() => {
    const all = this.characters.itemsByType()[this.activeType()] ?? [];
    return this.visibleAssets().length < all.length || this.characters.hasMore();
  });

  /** Loading flag for the "Load 50 more" fetch (keeps the grid visible). */
  protected readonly loadMoreLoading = signal(false);

  /** Reveal limit per asset type, so each tab scrolls independently. */
  protected readonly renderLimits = signal<Partial<Record<AssetType, number>>>({});

  /** Reveal the next 50 items of the active tab. When the tab's loaded bucket
   *  is exhausted and the server has more, fetch the next chunk and append. */
  protected loadMoreAssets(): void {
    if (this.loadMoreLoading()) return;
    const type = this.activeType();
    this.renderLimits.update((limits) => ({
      ...limits,
      [type]: (limits[type] ?? INITIAL_RENDER_COUNT) + RENDER_STEP,
    }));

    const all = this.characters.itemsByType()[type] ?? [];
    const limit = this.renderLimits()[type] ?? INITIAL_RENDER_COUNT;
    if (limit >= all.length && this.characters.hasMore()) {
      this.loadMoreLoading.set(true);
      this.characters.loadMore().subscribe({
        next: () => this.loadMoreLoading.set(false),
        error: () => this.loadMoreLoading.set(false),
      });
    }
  }

  // ── Search ──────────────────────────────────────────────────────
  protected readonly searchValue = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected onSearchInput(value: string): void {
    this.searchValue.set(value);
    // Reset the reveal limits so the (re)loaded results render from 200.
    this.renderLimits.set({});
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.characters.setSearchQuery(value);
    }, 400);
  }

  // ── Mass upload ──────────────────────────────────────────────────
  /** True while the mass-upload pipeline is running (spinner on the button). */
  protected readonly massUploading = signal(false);

  /** Human label for the active asset type — the type mass upload applies. */
  protected readonly activeTypeLabel = computed(() => {
    switch (this.activeType()) {
      case 'location':
        return 'Locations';
      case 'prop':
        return 'Props';
      case 'audio':
        return 'Audio';
      default:
        return 'Characters';
    }
  });

  /** Singular form of the active type, for the mass-upload tooltip. */
  protected readonly activeTypeSingular = computed(() => {
    switch (this.activeType()) {
      case 'location':
        return 'location';
      case 'prop':
        return 'prop';
      case 'audio':
        return 'audio';
      default:
        return 'character';
    }
  });

  /** File types the mass upload accepts — only audio when the Audio tab is active. */
  protected readonly massAccept = computed(() =>
    this.activeType() === 'audio' ? 'audio/*' : 'image/*',
  );

  /** Tooltip for the mass-upload button, matching the active type's file kind. */
  protected readonly massUploadTooltip = computed(() =>
    this.activeType() === 'audio'
      ? 'Upload multiple audio files — creates one audio per file, named after each file'
      : `Upload multiple images — creates one ${this.activeTypeSingular()} per image, named after each file`,
  );

  /** Mass-create one asset per selected image: the resource name comes from
   *  the filename, and the asset type is the one filtered at that moment. */
  protected onMassFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];
    if (target) target.value = ''; // allow re-selecting the same files
    if (files.length === 0 || this.massUploading()) return;

    const type = this.activeType();
    this.massUploading.set(true);

    forkJoin(files.map((file) => this.createAssetFromFile(file, type))).subscribe({
      next: (ids) => {
        this.massUploading.set(false);
        const created = ids.filter((id): id is string => Boolean(id));
        const total = files.length;
        this.toast.add({
          severity: created.length === total ? 'success' : created.length > 0 ? 'warn' : 'error',
          summary: 'Mass upload',
          detail:
            created.length === total
              ? `${created.length} assets created`
              : `${created.length}/${total} assets created`,
        });
        if (created.length > 0) {
          // Refresh the list from the server and fetch thumbnails only for the
          // newcomers (same pattern as onAssetCreated).
          this.characters.load().subscribe();
          for (const id of created) this.fetchPreviewFor(id);
          this.charactersChanged.emit();
        }
      },
      error: () => {
        this.massUploading.set(false);
        this.toast.add({ severity: 'error', summary: 'Mass upload', detail: 'Upload failed' });
      },
    });
  }

  /** Create one asset from a single file: POST /characters (name from the
   *  filename, assetType from the active tab), upload the file, and link it.
   *  The Audio tab accepts/uploads audio files; the rest accept images.
   *  Resolves to the new asset id, or null on any failure. */
  private createAssetFromFile(file: File, type: AssetType): Observable<string | null> {
    const name = (file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled').slice(0, 120);
    const isAudio = type === 'audio';
    return this.characters
      .create({
        name,
        description: '',
        metadata: { assetType: type, fileKind: isAudio ? 'audio' : 'image' },
      })
      .pipe(
        switchMap((res) => {
          if (res.error || !res.data) {
            this.toast.add({
              severity: 'warn',
              summary: 'Create failed',
              detail: `${name}: ${res.msg}`,
            });
            return of(null);
          }
          const newId = res.data.id;
          return this.filesApi
            .upload({ file, category: isAudio ? 'audio' : 'images', storage: 'persistent' })
            .pipe(
              switchMap((up) => {
                if (up.error || !up.data) {
                  this.toast.add({
                    severity: 'warn',
                    summary: 'Upload failed',
                    detail: `${name}: ${up.msg}`,
                  });
                  return of(null);
                }
                const fileId = (up.data as FileEntity).id;
                return this.characters.assignFile(newId, fileId, 'reference').pipe(
                  map((link) => (link.error ? null : newId)),
                  catchError(() => of(null)),
                );
              }),
              catchError(() => of(null)),
            );
        }),
        catchError(() => of(null)),
      );
  }

  // ── Edit / File / Create ────────────────────────────────────────
  protected readonly editDialogVisible = signal(false);
  protected readonly editDialogTarget = signal<Character | null>(null);
  protected readonly submitting = signal(false);

  // File manager dialog (per asset).
  protected readonly filesDialogVisible = signal(false);
  protected readonly filesDialogTarget = signal<Character | null>(null);

  // Create wizard.
  protected readonly createDialogVisible = signal(false);
  protected readonly createDialogType = signal<AssetType>('character');

  ngOnInit(): void {
    this.loadAssets();
  }

  protected loadAssets(): void {
    this.characters.load().subscribe((res) => {
      if (!res.error && res.data) {
        const chars = res.data.items.map((c: any) => toCharacter(c.character));
        this.loadPreviews(chars);
      }
    });
  }

  /**
   * Fan out `GET /characters/{id}/files` for every asset, capped at 3
   * concurrent in-flight requests so a large library doesn't hammer the
   * backend. The UI updates incrementally as each response lands.
   */
  private loadPreviews(items: Character[]): void {
    from(items)
      .pipe(mergeMap((c) => this.characters.listFiles(c.id).pipe(map((r) => ({ c, r }))), 3))
      .subscribe(({ c, r }) => {
        if (!r.error && r.data && r.data.length > 0) {
          this.previewMap.update((m) => ({
            ...m,
            [c.id]: {
              fileIds: r.data!.slice(0, this.PREVIEW_GRID_MAX).map((f) => f.file_id),
              count: r.data!.length,
              brokenIds: new Set<string>(),
            },
          }));
        }
      });
  }

  /** Refresh the preview entry for a single asset (used after create). */
  private fetchPreviewFor(characterId: string): void {
    this.characters.listFiles(characterId).subscribe((r) => {
      if (!r.error && r.data && r.data.length > 0) {
        this.previewMap.update((m) => ({
          ...m,
          [characterId]: {
            fileIds: r.data!.slice(0, this.PREVIEW_GRID_MAX).map((f) => f.file_id),
            count: r.data!.length,
            brokenIds: new Set<string>(),
          },
        }));
      }
    });
  }

  /** Direct serve URL for a file — used as `<img src>` on asset cards. */
  protected serveUrl(fileId: string): string {
    return this.filesApi.serveUrl(fileId);
  }

  /**
   * Mark one tile's image as broken without dropping the file metadata.
   * The +N overlay still renders from `count`; only that single `<img>`
   * is hidden so the fallback icon shows through for that tile.
   */
  protected onPreviewError(characterId: string, fileId: string): void {
    this.previewMap.update((m) => {
      const cur = m[characterId];
      if (!cur || cur.brokenIds.has(fileId)) return m;
      const brokenIds = new Set(cur.brokenIds);
      brokenIds.add(fileId);
      return { ...m, [characterId]: { ...cur, brokenIds } };
    });
  }

  /**
   * Tailwind grid-template classes for the thumbnail mosaic:
   *   1 file → single full tile
   *   2 files → 2 cols × 1 row
   *   3-4 files → 2 × 2
   */
  protected gridClass(count: number): string {
    if (count <= 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-2 grid-rows-1';
    return 'grid-cols-2 grid-rows-2';
  }

  /**
   * Decide whether to attempt an `<img>` render for this asset.
   *
   * Image kinds (and unknown/mixed) try the preview; pure video / audio
   * skip the `<img>` and let the fallback icon represent the kind so
   * the user is not stuck waiting on a request that can never render.
   */
  protected shouldRenderImage(a: Character): boolean {
    if (a.metadata?.['fileKind'] === 'video') return false;
    if (a.metadata?.['fileKind'] === 'audio') return false;
    return true;
  }

  /**
   * PrimeIcons class for the always-rendered fallback layer.
   *
   * If the asset has a known non-image `fileKind` we surface that
   * (`pi-video` / `pi-volume-up`) so the kind is communicated even
   * before any file URL is resolved. Otherwise we fall back to the
   * asset-type icon (`pi-user` / `pi-map` / `pi-box`).
   */
  protected fallbackIcon(a: Character): string {
    const kind = a.metadata?.['fileKind'];
    if (kind === 'video') return 'pi-video';
    if (kind === 'audio') return 'pi-volume-up';
    switch (this.activeType()) {
      case 'location':
        return 'pi-map';
      case 'prop':
        return 'pi-box';
      default:
        return 'pi-user';
    }
  }

  /**
   * Push the asset into the Prompt Builder's reference list. The chip is
   * surfaced above the prompt textarea and the file id travels to the
   * Seedance API in the generation payload's `content[]`. Emits
   * `assetUsed` so the parent can dismiss the library dialog and let the
   * user see the prompt update.
   *
   * If the asset has no uploaded file yet, we can't reference it — warn
   * the user instead of queueing an unusable entry.
   */
  protected useAsset(asset: Character): void {
    const preview = this.previewMap()[asset.id];
    const fileId = preview?.fileIds?.[0];
    if (!fileId) {
      this.toast.add({
        severity: 'warn',
        summary: 'No file',
        detail: `"${asset.name}" has no file uploaded yet — add one before referencing it.`,
      });
      return;
    }
    const kind = resolveKind(asset.metadata?.['fileKind']);
    // Respect the @imageN slot inherited from the chapter assignment when the
    // character is assigned to the current episode.
    const assignedSlot = this.studio
      .chapterCharacterData()
      .find((c) => c.id === asset.id)?.slot;
    this.studio.useAsset({
      fileId,
      characterId: asset.id,
      name: asset.name,
      filename: asset.name,
      kind,
      slot: assignedSlot || undefined,
    });
    this.toast.add({
      severity: 'success',
      summary: 'Reference added',
      detail: asset.name,
    });
    this.assetUsed.emit(asset.id);
  }

  protected setActiveType(t: AssetType): void {
    this.activeType.set(t);
  }

  protected openCreate(type: AssetType): void {
    this.activeType.set(type);
    this.createDialogType.set(type);
    this.createDialogVisible.set(true);
  }

  protected onAssetCreated(evt: { id: string; type: AssetType }): void {
    // Refresh the list so the new asset is visible in its tab, and
    // hit the per-character endpoint ONLY for the newcomer — every
    // other card already has a cached preview entry.
    this.characters.load().subscribe();
    this.fetchPreviewFor(evt.id);
  }

  protected openEdit(asset: Character): void {
    this.editDialogTarget.set(asset);
    this.editDialogVisible.set(true);
  }

  protected openFiles(asset: Character): void {
    this.filesDialogTarget.set(asset);
    this.filesDialogVisible.set(true);
  }

  protected onUpdate(evt: { id: string; patch: UpdateCharacterRequest }): void {
    if (Object.keys(evt.patch).length === 0) {
      this.editDialogVisible.set(false);
      this.fetchPreviewFor(evt.id);
      return;
    }
    this.submitting.set(true);
    this.characters.update(evt.id, evt.patch).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Updated' });
      this.editDialogVisible.set(false);
      this.charactersChanged.emit();
      this.fetchPreviewFor(evt.id);
    });
  }

  /**
   * The shared form dialog still emits a `create` event for legacy use,
   * but the typed create flow now goes through `AssetCreateDialogComponent`.
   * Forward to it so behaviour stays correct if edit-dialog is opened
   * without a target.
   */
  protected onCreateLegacy(payload: CreateCharacterRequest): void {
    this.submitting.set(true);
    this.characters.create(payload).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Created' });
      this.editDialogVisible.set(false);
      this.charactersChanged.emit();
    });
  }

  protected confirmDelete(asset: Character): void {
    this.confirm.confirm({
      header: 'Delete asset',
      message: `Delete "${asset.name}"? This is a soft delete.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.characters.delete(asset.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Deleted' });
        }),
    });
  }

  protected metadataPreview(c: Character): string {
    const entries = Object.entries(c.metadata).filter(
      ([k]) => k !== 'assetType' && k !== 'fileKind',
    );
    if (entries.length === 0) return '—';
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ');
  }
}

function resolveKind(raw: unknown): UsedAssetKind {
  if (raw === 'image' || raw === 'video' || raw === 'audio' || raw === 'mixed') {
    return raw;
  }
  return 'image';
}

interface PreviewInfo {
  /** First N linked file ids (capped at PREVIEW_GRID_MAX) for the mosaic. */
  fileIds: string[];
  /** Total number of linked files (drives the +N overlay on the last tile). */
  count: number;
  /** File ids whose `<img>` emitted an error and should hide. */
  brokenIds: Set<string>;
}
