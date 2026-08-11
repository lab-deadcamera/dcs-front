import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { ImageGenPanelComponent } from '@shared/components/image-gen-panel/image-gen-panel.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { ReferenceAsset } from '@core/interfaces/studio.models';
import { IndexCharacters } from '@modules/characters/characters/ui/index-characters/index-characters';
import { FilesApiService } from '@app/services';
import { inferKind } from '@app/shared/utils';
import { CharactersService } from '@modules/characters/characters/services';
import { AssetType, CharacterMetadata } from '@modules/characters/characters/interfaces';
import { UsedAssetKind } from '@core/interfaces/studio.models';
import { SourceAssetPipe } from '@app/core/pipes';
import { FileCategory } from '@app/core/interfaces';
import { Toast } from 'primeng/toast';

interface LibraryItem {
  id: string;
  name: string;
  /** All linked files — cada uno se envía como un reference independiente. */
  files: Array<{ fileId: string; filename: string; thumbUrl: string | null }>;
  /** Primer archivo (para la miniatura del tile). */
  firstFile: { fileId: string; filename: string; thumbUrl: string | null } | null;
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
    ImageGenPanelComponent,
    TranslatePipe,
    SourceAssetPipe,
    ButtonModule,
    DialogModule,
    IndexCharacters,
    Toast,
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
  private readonly i18n = inject(TranslateService);

  /**
   * Emitted once per file successfully added to the prompt's used-asset
   * list — the parent shell forwards this to the prompt-builder so the
   * matching `[Image N]` / `[Video N]` / `[Audio N]` token is inserted at
   * the cursor in the editor.
   */
  readonly assetPicked = output<UsedAssetKind>();

  /**
   * Whether the "Image Generation" band acts as an open disclosure — its
   * body mounts <app-image-gen-panel> only when expanded. Defaults to
   * collapsed so the heavier-weight panel doesn't load until the user
   * opts in.
   */
  protected readonly imageGenExpanded = signal(false);

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
    { id: 'audio', labelKey: 'FILES.TABS.AUDIO', icon: 'pi-volume-up' },
  ];

  /** True when chapter assignments have been loaded and the set is empty. */
  protected readonly libraryEmpty = computed(
    () => this.studio.assignmentsLoaded() && this.studio.chapterCharacterIds().size === 0,
  );

  protected readonly libraryByType = computed<Record<AssetType, LibraryItem[]>>(() => {
    const assignedIds = this.studio.chapterCharacterIds();

    // If assignments have been loaded and the set is empty, the chapter has
    // no related characters — show nothing rather than dumping the whole
    // library.
    if (this.libraryEmpty()) {
      return { character: [], location: [], prop: [], audio: [] };
    }

    const buckets: Record<AssetType, LibraryItem[]> = {
      character: [],
      location: [],
      prop: [],
      audio: [],
    };
    const seenIds = new Set<string>();
    for (const item of this.chars.items()) {
      if (assignedIds.size > 0 && !assignedIds.has(item.character.id)) continue;
      seenIds.add(item.character.id);
      let metadata: CharacterMetadata = {};
      try {
        metadata = item.character.metadata ? JSON.parse(item.character.metadata) : {};
      } catch {
        metadata = {};
      }
      const t: AssetType = (metadata.assetType as AssetType) ?? 'character';
      const files = (item.files ?? []).map((f) => ({
        fileId: f.file_id,
        filename: f.filename,
        // Prefer the backend's purpose-built 300×300 thumbnail; fall back
        // to the full serve URL when the wire payload omits it.
        thumbUrl: f.thumbnail_url || (f.file_id ? this.filesApi.serveUrl(f.file_id) : null),
      }));
      const firstFile = files[0] ?? null;
      (buckets[t] ?? buckets.character).push({
        id: item.character.id,
        name: item.character.name,
        files,
        firstFile,
        fileKind: resolveUsedKind(metadata.fileKind),
      });
    }
    return buckets;
  });

  /**
   * Ids the user has hidden from the quick-pick. This is a view-only
   * preference (the asset stays in the Characters library) persisted to
   * localStorage so it survives reloads on this browser.
   */
  protected readonly hiddenIds = signal<ReadonlySet<string>>(loadHiddenLibraryIds());

  protected readonly visibleLibrary = computed(() => {
    const hidden = this.hiddenIds();
    return (this.libraryByType()[this.activeLibraryType()] ?? []).filter((a) => !hidden.has(a.id));
  });

  /** Counts reflect what's actually shown (hidden items excluded). */
  protected readonly libraryCounts = computed<Record<AssetType, number>>(() => {
    const b = this.libraryByType();
    const hidden = this.hiddenIds();
    const count = (arr: LibraryItem[]) => arr.filter((a) => !hidden.has(a.id)).length;
    return {
      character: count(b.character),
      location: count(b.location),
      prop: count(b.prop),
      audio: count(b.audio),
    };
  });

  /** How many items are hidden in the active tab — drives the "show hidden" link. */
  protected readonly hiddenInActiveTab = computed(() => {
    const hidden = this.hiddenIds();
    return (this.libraryByType()[this.activeLibraryType()] ?? []).filter((a) => hidden.has(a.id))
      .length;
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
      case 'audio':
        return 'pi-volume-up';
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

  /**
   * Ids of thumbnails that failed to load (deleted/trashed files left in a
   * stale cache, non-image first files, etc.). Tracked so the tile can fall
   * back to the placeholder icon instead of showing a broken-image glyph.
   */
  protected readonly brokenThumbs = signal<ReadonlySet<string>>(new Set());

  protected isThumbBroken(id: string): boolean {
    return this.brokenThumbs().has(id);
  }

  protected onThumbError(id: string): void {
    this.brokenThumbs.update((s) => {
      if (s.has(id)) return s;
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }

  protected toggleImageGen(): void {
    this.imageGenExpanded.update((v) => !v);
  }

  protected toggleMyAssets(): void {
    this.myAssetsExpanded.update((v) => !v);
  }

  protected openCharactersLibrary(): void {
    this.charactersDialogVisible.set(true);
  }

  protected onCharactersDialogVisibility(v: boolean): void {
    this.charactersDialogVisible.set(v);
    // Refresh the quick-pick when the dialog closes so any assets created
    // or deleted inside it (and their files) are reflected immediately.
    if (!v) this.chars.load().subscribe();
  }

  protected setLibraryType(t: AssetType): void {
    this.activeLibraryType.set(t);
  }

  /**
   * Hide an asset from the quick-pick without deleting it from the
   * Characters library. Also drops it from the prompt's used list so the
   * prompt stays consistent with what's visible.
   */
  protected hideFromLibrary(id: string, event: Event): void {
    event.stopPropagation();
    this.hiddenIds.update((s) => {
      if (s.has(id)) return s;
      const next = new Set(s);
      next.add(id);
      return next;
    });
    saveHiddenLibraryIds(this.hiddenIds());
    if (this.isUsed(id)) this.studio.unuseAsset(id);
  }

  /** Restore every hidden asset back into the quick-pick. */
  protected showHiddenLibrary(): void {
    this.hiddenIds.set(new Set());
    saveHiddenLibraryIds(this.hiddenIds());
  }

  protected isUsed(id: string): boolean {
    return this.usedAssetIds().has(id);
  }

  /**
   * Toggle the asset's presence in the prompt's used-asset list. Already-
   * used assets are removed (so the same tile acts as both add and undo)
   * and the prompt-builder chips reflect the change instantly.
   *
   * Cuando se selecciona un personaje se agregan TODAS sus imágenes como
   * referencias independientes en content[].
   *
   * Assets without an uploaded file can't be sent as a reference — show
   * a warning toast instead of silently no-oping.
   */
  protected onPickLibraryAsset(a: LibraryItem): void {
    if (this.isUsed(a.id)) {
      this.studio.unuseAsset(a.id);
      return;
    }

    if (a.files.length === 0) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.instant('STUDIO.ASSETS.TOAST_NO_FILE'),
        detail: this.i18n.instant('STUDIO.ASSETS.TOAST_NO_FILE_DETAIL', { name: a.name }),
      });
      return;
    }
    for (const f of a.files) {
      const before = this.studio.usedAssets().length;
      // Respect the [ImageN] slot inherited from the chapter assignment:
      // characters keep it in chapterCharacterData, assets in chapterAssetSlots.
      const charSlot = this.studio
        .chapterCharacterData()
        .find((c) => c.id === a.id)?.slot;
      const assetSlot = this.studio.chapterAssetSlots().get(f.fileId);
      this.studio.useAsset({
        fileId: f.fileId,
        characterId: a.id,
        name: a.name,
        filename: f.filename,
        kind: a.fileKind,
        slot: charSlot || assetSlot || undefined,
      });
      // useAsset dedupes by fileId — only emit when an entry actually
      // appeared, so the prompt-builder doesn't insert a stale token.
      if (this.studio.usedAssets().length > before) {
        this.assetPicked.emit(a.fileKind);
      }
    }
    this.toast.add({
      severity: 'success',
      summary: this.i18n.instant('STUDIO.ASSETS.TOAST_REFERENCE_ADDED'),
      detail: this.i18n.instant('STUDIO.ASSETS.TOAST_REFERENCE_ADDED_DETAIL', {
        name: a.name,
        n: a.files.length,
      }),
    });
  }

  protected onFirstFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UPLOAD_ERROR'),
          detail: up.msg,
        });
        return;
      }
      const asset: ReferenceAsset = {
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'first-frame',
      };
      this.studio.setFirstFrame(asset);
      this.onPickFreeAsset(asset);
    });
  }

  protected onLastFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UPLOAD_ERROR'),
          detail: up.msg,
        });
        return;
      }
      const asset: ReferenceAsset = {
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'last-frame',
      };
      this.studio.setLastFrame(asset);
      this.onPickFreeAsset(asset);
    });
  }

  protected onFreeAssets(files: File[]) {
    for (const f of files) {
      let category: FileCategory = 'images';
      if (f.type.startsWith('video/')) {
        category = 'videos';
      } else if (f.type.startsWith('audio/')) {
        category = 'audio';
      } else if (f.type.startsWith('image/')) {
        category = 'images';
      } else {
        this.toast.add({
          severity: 'warn',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UNSUPPORTED'),
          detail: this.i18n.instant('STUDIO.ASSETS.TOAST_UNSUPPORTED_DETAIL'),
        });
        continue;
      }

      this.filesApi.upload({ file: f, category, storage: 'temp' }).subscribe((up) => {
        if (up.error || !up.data) {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UPLOAD_ERROR'),
          detail: up.msg,
        });
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
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_ASSET_ADDED'),
          detail: this.i18n.instant('STUDIO.ASSETS.TOAST_ASSET_ADDED_DETAIL', {
            name: f.name,
          }),
        });
      });
    }
  }

  /**
   * Toggle an uploaded file in the references list. Free uploads share
   * the same `usedAssets` bucket as library picks, so they get numbered
   * in the per-kind sequence (`[Image1]`, `[Image2]`, …) based on the
   * order they were clicked, interleaved with library picks. Reuses the
   * same `assetPicked` output so the parent inserts the matching token
   * into the editor exactly like a library pick.
   */
  protected onPickFreeAsset(a: ReferenceAsset): void {
    if (this.isUsed(a.id)) {
      this.studio.unuseAsset(a.id);
      return;
    }
    this.studio.useAsset({
      fileId: a.id,
      // No backing character — reuse the file id so unuseAsset(a.id)
      // matches whether the caller passes a characterId or a fileId.
      characterId: a.id,
      name: a.filename,
      filename: a.filename,
      kind: a.kind,
      slot: this.studio.chapterAssetSlots().get(a.id) || undefined,
    });
    this.assetPicked.emit(a.kind);
  }

  /**
   * Remove the upload from the grid entirely, and unpick it if it was
   * also sitting in the references list. The editor-side `[ImageN]`
   * cleanup is handled by the prompt-builder's prune effect, which
   * watches `usedAssets()` shrinkage.
   */
  protected onRemoveFreeAsset(id: string): void {
    this.studio.unuseAsset(id);
    this.studio.removeFreeAsset(id);
  }
}

function resolveUsedKind(raw: unknown): UsedAssetKind {
  if (raw === 'image' || raw === 'video' || raw === 'audio' || raw === 'mixed') return raw;
  return 'image';
}

/** localStorage slot for the per-browser "hidden from quick-pick" ids. */
const HIDDEN_LIBRARY_KEY = 'dcs-hidden-library-assets';

function loadHiddenLibraryIds(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_LIBRARY_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveHiddenLibraryIds(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(HIDDEN_LIBRARY_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / disabled storage — ignore */
  }
}
