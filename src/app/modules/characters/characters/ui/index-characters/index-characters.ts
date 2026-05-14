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
  private readonly prompt = inject(PromptStateService);

  /** Parent can listen to close itself when an asset is used. */
  readonly assetUsed = output<string>();

  /** Which bucket is currently shown in the grid. */
  protected readonly activeType = signal<AssetType>('character');

  /**
   * Set of asset ids whose preview `<img>` failed to load. Used as the
   * sole fallback signal — actual thumbnail URLs come straight from
   * `character.files[].thumbnailUrl`, so there's no preview cache to
   * maintain anymore.
   */
  protected readonly brokenPreviews = signal<Set<string>>(new Set());

  protected readonly tabs: {
    id: AssetType;
    labelKey: string;
    icon: string;
  }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER', icon: 'pi pi-user'  },
    { id: 'location',  labelKey: 'CHARACTERS.TABS.LOCATION',  icon: 'pi pi-map'   },
    { id: 'prop',      labelKey: 'CHARACTERS.TABS.PROP',      icon: 'pi pi-box'   },
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
    this.characters.load().subscribe();
  }

  /**
   * Thumbnail URL for the card preview, or `null` if we should fall
   * back to the icon. Returns `thumbnail_url` (which comes pre-resized
   * from the backend) when the first attached file is an image; pure
   * video/audio assets always render via the icon path.
   */
  protected previewThumb(a: Character): string | null {
    if (this.brokenPreviews().has(a.id)) return null;
    const file = (a.files ?? []).find((f) => f.category === 'images');
    if (!file) return null;
    return file.thumbnailUrl ?? file.url ?? null;
  }

  /** Total file count for an asset — drives the +N badge. */
  protected fileCount(a: Character): number {
    return a.files?.length ?? 0;
  }

  /**
   * Flip this card's preview into broken state. Removing the image from
   * the DOM lets the always-rendered fallback icon shine through.
   */
  protected onPreviewError(characterId: string): void {
    this.brokenPreviews.update((set) => {
      if (set.has(characterId)) return set;
      const next = new Set(set);
      next.add(characterId);
      return next;
    });
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
      case 'location': return 'pi-map';
      case 'prop':     return 'pi-box';
      default:         return 'pi-user';
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

  protected onAssetCreated(_evt: { id: string; type: AssetType }): void {
    // The list endpoint now returns files inline, so a single `load()`
    // refresh pulls the new asset *and* its preview thumbnails in one go.
    this.characters.load().subscribe();
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

