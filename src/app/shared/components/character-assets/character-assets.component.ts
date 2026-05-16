import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { ReferenceAsset } from '@core/interfaces/studio.models';
import { IndexCharacters } from '@modules/characters/characters/ui/index-characters/index-characters';
import { FilesApiService } from '@app/services';
import { inferKind } from '@app/shared/utils';
import { CharactersService } from '@modules/characters/characters/services';
import { AssetType, CharacterMetadata } from '@modules/characters/characters/interfaces';
import { UsedAssetKind } from '@core/interfaces/studio.models';

interface LibraryItem {
  id: string;
  name: string;
  /** First linked file id — null when the asset has no files. */
  fileId: string | null;
  /** First linked file's filename — used by the backend asset resolver. */
  filename: string;
  /** First linked file's serve URL — null when the asset has no files. */
  thumbUrl: string | null;
  fileKind: UsedAssetKind;
}

/**
 * Section 05 — CHARACTER & ASSETS.
 *
 *   [▸ CHARACTER STUDIO]   Generate trusted reference images · powered by Seedream
 *   [▸ MY ASSETS]          Private trusted library · BytePlus
 *
 *   ─── REFERENCE ASSETS ────────────────────────────  N assets
 *   [FIRST FRAME drop zone]      [LAST FRAME drop zone]
 *   [+]   (extra free asset slot, generates Image N / Video N tags)
 */
@Component({
  selector: 'app-character-assets',
  imports: [
    SectionHeaderComponent,
    DropZoneComponent,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    IndexCharacters,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-assets.html',
  providers: [MessageService],
})
export class CharacterAssetsComponent {
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);
  protected readonly studio = inject(StudioStore);
  protected readonly chars = inject(CharactersService);

  /**
   * Whether the "My Assets" band acts as an open disclosure — its body
   * (the Reference Assets panel: First/Last frame + free assets grid) is
   * mounted only when expanded. Defaults to open so first-time visitors
   * still see the asset drop-zones without an extra click.
   */
  protected readonly myAssetsExpanded = signal(true);

  /**
   * Whether the embedded Characters library dialog is open. Launched from
   * the "CREATE ASSETS" button inside the My Assets panel — provides the
   * full character CRUD inline so the user never has to leave the studio.
   */
  protected readonly charactersDialogVisible = signal(false);

  // ---------------------------------------------------------------------------
  // My Library quick-pick
  //
  // Surfaces every already-created asset (character / location / prop) as a
  // clickable thumbnail strip inside the Reference Assets panel — clicking
  // a tile toggles it into the prompt's used-asset list without having to
  // open the full library dialog. Source is the singleton `CharactersService`
  // signal so new assets created from the library dialog appear here too.
  // ---------------------------------------------------------------------------

  protected readonly activeLibraryType = signal<AssetType>('character');

  protected readonly libraryTabs: { id: AssetType; labelKey: string; icon: string }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER', icon: 'pi-user' },
    { id: 'location', labelKey: 'CHARACTERS.TABS.LOCATION', icon: 'pi-map' },
    { id: 'prop', labelKey: 'CHARACTERS.TABS.PROP', icon: 'pi-box' },
  ];

  protected readonly libraryByType = computed<Record<AssetType, LibraryItem[]>>(() => {
    const buckets: Record<AssetType, LibraryItem[]> = { character: [], location: [], prop: [] };
    for (const item of this.chars.items()) {
      let metadata: CharacterMetadata = {};
      try {
        metadata = item.character.metadata ? JSON.parse(item.character.metadata) : {};
      } catch {
        metadata = {};
      }
      const t: AssetType = (metadata.assetType as AssetType) ?? 'character';
      const firstFile = item.files?.[0];
      const fileId = firstFile?.file_id ?? null;
      (buckets[t] ?? buckets.character).push({
        id: item.character.id,
        name: item.character.name,
        fileId,
        filename: firstFile?.filename ?? item.character.name,
        thumbUrl: fileId ? this.filesApi.serveUrl(fileId) : null,
        fileKind: resolveUsedKind(metadata.fileKind),
      });
    }
    return buckets;
  });

  protected readonly visibleLibrary = computed(
    () => this.libraryByType()[this.activeLibraryType()] ?? [],
  );

  protected readonly libraryCounts = computed<Record<AssetType, number>>(() => {
    const b = this.libraryByType();
    return { character: b.character.length, location: b.location.length, prop: b.prop.length };
  });

  protected readonly usedAssetIds = computed(
    () => new Set(this.studio.usedAssets().map((a) => a.characterId)),
  );

  /** PrimeIcons class used as a fallback when a tile has no thumbnail. */
  protected readonly libraryFallbackIcon = computed(() => {
    switch (this.activeLibraryType()) {
      case 'location':
        return 'pi-map';
      case 'prop':
        return 'pi-box';
      default:
        return 'pi-user';
    }
  });

  constructor() {
    // Preload existing library so the quick-pick panel is populated on
    // first paint. Subsequent creates inside the library dialog refresh
    // the same singleton — `libraryByType` updates reactively.
    this.chars.load().subscribe();
  }

  protected toggleMyAssets(): void {
    this.myAssetsExpanded.update((v) => !v);
  }

  protected openCharactersLibrary(): void {
    this.charactersDialogVisible.set(true);
  }

  protected onCharactersDialogVisibility(v: boolean): void {
    this.charactersDialogVisible.set(v);
  }

  protected setLibraryType(t: AssetType): void {
    this.activeLibraryType.set(t);
  }

  protected isUsed(id: string): boolean {
    return this.usedAssetIds().has(id);
  }

  /**
   * Toggle the asset's presence in the prompt's used-asset list. Already-
   * used assets are removed (so the same tile acts as both add and undo)
   * and the prompt-builder chips reflect the change instantly.
   *
   * Assets without an uploaded file can't be sent as a reference — show
   * a warning toast instead of silently no-oping.
   */
  protected onPickLibraryAsset(a: LibraryItem): void {
    if (this.isUsed(a.id)) {
      this.studio.unuseAsset(a.id);
      return;
    }
    if (!a.fileId) {
      this.toast.add({
        severity: 'warn',
        summary: 'No file',
        detail: `"${a.name}" has no file uploaded yet — open the library to add one.`,
      });
      return;
    }
    this.studio.useAsset({
      fileId: a.fileId,
      characterId: a.id,
      name: a.name,
      filename: a.filename,
      kind: a.fileKind,
    });
    this.toast.add({
      severity: 'success',
      summary: 'Reference added',
      detail: a.name,
    });
  }

  protected onFirstFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
        return;
      }
      this.studio.setFirstFrame({
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'first-frame',
      });
    });
  }

  protected onLastFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
        return;
      }
      this.studio.setLastFrame({
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'last-frame',
      });
    });
  }

  protected onFreeAssets(files: File[]) {
    for (const f of files) {
      this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
        if (up.error || !up.data) {
          this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
          return;
        }
        this.studio.addFreeAsset({
          id: up.data.id,
          kind: inferKind(f),
          filename: up.data.filename,
          thumbnailUrl: this.filesApi.serveUrl(up.data.id),
          tag: '',
          slot: 'free',
        });
      });
    }
  }
}

function resolveUsedKind(raw: unknown): UsedAssetKind {
  if (raw === 'image' || raw === 'video' || raw === 'audio' || raw === 'mixed') return raw;
  return 'image';
}
