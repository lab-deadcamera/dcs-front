import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { from, map, mergeMap } from 'rxjs';

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
import { PromptStateService, UsedAssetKind } from '@app/core/stores/prompt.state';
import { toCharacter } from '@shared/utils';
import { FilesApiService } from '@app/services';

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
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    CharacterFormDialogComponent,
    CharacterFilesDialogComponent,
    AssetCreateDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-characters.html',
  styleUrl: './index-characters.css',
})
export class IndexCharacters implements OnInit {
  protected readonly characters = inject(CharactersService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly filesApi = inject(FilesApiService);
  private readonly prompt = inject(PromptStateService);

  /** Parent can listen to close itself when an asset is used. */
  readonly assetUsed = output<string>();

  /** Which bucket is currently shown in the grid. */
  protected readonly activeType = signal<AssetType>('character');

  /**
   * Per-asset preview metadata used by the card grid.
   *
   *   fileId       — first linked file, used to build the `<img src>`.
   *   count        — total number of linked files (drives the +N badge).
   *   imageBroken  — set when `<img>` errors out; the card falls back to
   *                  the type/kind icon but the +N badge stays so the
   *                  user still sees there are files attached.
   *
   * Populated lazily after `load()` completes. Cached for the session —
   * `onAssetCreated` only refetches for the new asset, not the whole list.
   */
  protected readonly previewMap = signal<Record<string, PreviewInfo>>({});

  protected readonly tabs: {
    id: AssetType;
    labelKey: string;
    icon: string;
  }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER', icon: 'pi pi-user' },
    { id: 'location', labelKey: 'CHARACTERS.TABS.LOCATION', icon: 'pi pi-map' },
    { id: 'prop', labelKey: 'CHARACTERS.TABS.PROP', icon: 'pi pi-box' },
  ];

  protected readonly visibleAssets = computed<Character[]>(
    () => this.characters.itemsByType()[this.activeType()] ?? [],
  );

  // Edit dialog (name / description) — reused for any type.
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
      if (!res.error && res.data) this.loadPreviews(res.data.map((c) => toCharacter(c.character)));
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
            [c.id]: { fileId: r.data![0].file_id, count: r.data!.length },
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
            fileId: r.data![0].file_id,
            count: r.data!.length,
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
   * Mark this card's image as broken without dropping the file metadata.
   * The +N badge still renders from `count`; only the `<img>` is hidden
   * and the fallback icon shows through.
   */
  protected onPreviewError(characterId: string): void {
    this.previewMap.update((m) => {
      const cur = m[characterId];
      if (!cur || cur.imageBroken) return m;
      return { ...m, [characterId]: { ...cur, imageBroken: true } };
    });
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
   * Push the asset into the Prompt Builder's reference list. The token
   * shows up as `@asset_name` in the compiled prompt and as a typed chip
   * above the textarea. Emits `assetUsed` so the parent can dismiss the
   * library dialog and let the user see the prompt update.
   */
  protected useAsset(asset: Character): void {
    const kind = resolveKind(asset.metadata?.['fileKind']);
    this.prompt.useAsset({
      id: asset.id,
      name: asset.name,
      kind,
    });
    this.toast.add({
      severity: 'success',
      summary: 'OK',
      detail: `@${asset.name.replace(/\s+/g, '_')} added to prompt`,
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
  /** First linked file id — used to construct the `<img src>`. */
  fileId: string;
  /** Total number of linked files (drives the +N badge). */
  count: number;
  /** True after the `<img>` element emitted (error). */
  imageBroken?: boolean;
}
