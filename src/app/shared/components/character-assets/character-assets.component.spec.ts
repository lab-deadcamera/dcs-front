import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { describe, beforeEach, it, expect, vi, Mock } from 'vitest';

import { CharacterAssetsComponent } from './character-assets.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { FilesApiService } from '@app/services';
import { CharactersService } from '@modules/characters/characters/services';
import { ReferenceAsset, UsedAsset } from '@core/interfaces/studio.models';

// ─── Test doubles ──────────────────────────────────────────────────────

interface CharRow {
  character: { id: string; name: string; metadata: string };
  files?: { file_id: string; filename: string }[];
}

@Injectable()
class StudioStoreStub {
  private readonly _used = signal<UsedAsset[]>([]);
  private readonly _free = signal<ReferenceAsset[]>([]);
  private readonly _first = signal<ReferenceAsset | null>(null);
  private readonly _last = signal<ReferenceAsset | null>(null);

  readonly usedAssets = this._used.asReadonly();
  readonly freeAssets = this._free.asReadonly();
  readonly firstFrame = this._first.asReadonly();
  readonly lastFrame = this._last.asReadonly();

  // Mirror real-store dedupe so the component's before/after length guard
  // exercises the same branch the production code does.
  readonly useAsset = vi.fn((a: UsedAsset) => {
    this._used.update((list) => (list.some((x) => x.fileId === a.fileId) ? list : [...list, a]));
  });

  readonly unuseAsset = vi.fn((idOrFileId: string) => {
    this._used.update((list) =>
      list.filter((a) => a.fileId !== idOrFileId && a.characterId !== idOrFileId),
    );
  });

  readonly setFirstFrame = vi.fn((a: ReferenceAsset | null) => this._first.set(a));
  readonly setLastFrame = vi.fn((a: ReferenceAsset | null) => this._last.set(a));
  readonly addFreeAsset = vi.fn((a: ReferenceAsset) =>
    this._free.update((list) => [...list, a]),
  );
  readonly removeFreeAsset = vi.fn((id: string) =>
    this._free.update((list) => list.filter((a) => a.id !== id)),
  );

  // Test helpers — not part of the real store.
  seedUsed(list: UsedAsset[]): void {
    this._used.set(list);
  }
}

@Injectable()
class CharactersServiceStub {
  private readonly _items = signal<CharRow[]>([]);
  readonly items = this._items.asReadonly();
  readonly load = vi.fn().mockReturnValue(of(null));
  setItems(items: CharRow[]): void {
    this._items.set(items);
  }
}

@Injectable()
class FilesApiStub {
  readonly serveUrl = vi.fn((id: string) => `/files/${id}/serve`);
  readonly upload = vi.fn();
}

function makeUsedAsset(overrides: Partial<UsedAsset>): UsedAsset {
  return {
    fileId: 'file-' + Math.random().toString(36).slice(2, 8),
    characterId: 'char-' + Math.random().toString(36).slice(2, 8),
    name: 'asset',
    filename: 'asset.png',
    kind: 'image',
    ...overrides,
  };
}

function makeRefAsset(overrides: Partial<ReferenceAsset>): ReferenceAsset {
  return {
    id: 'file-' + Math.random().toString(36).slice(2, 8),
    kind: 'image',
    filename: 'demo.png',
    thumbnailUrl: undefined,
    tag: '',
    slot: 'free',
    ...overrides,
  };
}

// ─── Suite ─────────────────────────────────────────────────────────────

describe('CharacterAssetsComponent', () => {
  let fixture: ComponentFixture<CharacterAssetsComponent>;
  let component: CharacterAssetsComponent;
  let studio: StudioStoreStub;
  let chars: CharactersServiceStub;
  let files: FilesApiStub;
  let toast: { add: Mock };

  beforeEach(async () => {
    toast = { add: vi.fn() };

    await TestBed.configureTestingModule({
      providers: [
        { provide: StudioStore, useClass: StudioStoreStub },
        { provide: CharactersService, useClass: CharactersServiceStub },
        { provide: FilesApiService, useClass: FilesApiStub },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        // Real component has `providers: [MessageService]`. We rely on
        // overrideComponent below to drop that and route to our stub.
      ],
    })
      .overrideComponent(CharacterAssetsComponent, {
        set: {
          template: '<div></div>',
          imports: [],
          styles: [],
          providers: [{ provide: MessageService, useValue: toast }],
        },
      })
      .compileComponents();

    studio = TestBed.inject(StudioStore) as unknown as StudioStoreStub;
    chars = TestBed.inject(CharactersService) as unknown as CharactersServiceStub;
    files = TestBed.inject(FilesApiService) as unknown as FilesApiStub;

    fixture = TestBed.createComponent(CharacterAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Construction ───────────────────────────────────────────────────

  describe('construction', () => {
    it('creates the component', () => {
      expect(component).toBeTruthy();
    });

    it('preloads the characters library on construction', () => {
      expect(chars.load).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Disclosure / dialog signals ────────────────────────────────────

  describe('myAssetsExpanded signal', () => {
    const c = () => component as unknown as { myAssetsExpanded: () => boolean; toggleMyAssets: () => void };

    it('defaults to true (open on first paint)', () => {
      expect(c().myAssetsExpanded()).toBe(true);
    });

    it('toggleMyAssets flips the value', () => {
      c().toggleMyAssets();
      expect(c().myAssetsExpanded()).toBe(false);
      c().toggleMyAssets();
      expect(c().myAssetsExpanded()).toBe(true);
    });
  });

  describe('charactersDialogVisible signal', () => {
    const c = () =>
      component as unknown as {
        charactersDialogVisible: () => boolean;
        openCharactersLibrary: () => void;
        onCharactersDialogVisibility: (v: boolean) => void;
      };

    it('defaults to false', () => {
      expect(c().charactersDialogVisible()).toBe(false);
    });

    it('openCharactersLibrary sets it to true', () => {
      c().openCharactersLibrary();
      expect(c().charactersDialogVisible()).toBe(true);
    });

    it('onCharactersDialogVisibility forwards both values', () => {
      c().onCharactersDialogVisibility(true);
      expect(c().charactersDialogVisible()).toBe(true);
      c().onCharactersDialogVisibility(false);
      expect(c().charactersDialogVisible()).toBe(false);
    });
  });

  // ─── Library type tabs ─────────────────────────────────────────────

  describe('activeLibraryType signal', () => {
    const c = () =>
      component as unknown as {
        activeLibraryType: () => string;
        setLibraryType: (t: 'character' | 'location' | 'prop') => void;
      };

    it('defaults to "character"', () => {
      expect(c().activeLibraryType()).toBe('character');
    });

    it('setLibraryType updates the active tab', () => {
      c().setLibraryType('location');
      expect(c().activeLibraryType()).toBe('location');
      c().setLibraryType('prop');
      expect(c().activeLibraryType()).toBe('prop');
    });
  });

  // ─── libraryByType / visibleLibrary / libraryCounts ─────────────────

  describe('libraryByType', () => {
    const c = () =>
      component as unknown as {
        libraryByType: () => Record<'character' | 'location' | 'prop', unknown[]>;
      };

    it('returns three empty buckets when there are no characters', () => {
      const b = c().libraryByType();
      expect(b.character).toEqual([]);
      expect(b.location).toEqual([]);
      expect(b.prop).toEqual([]);
    });

    it('groups items by metadata.assetType', () => {
      chars.setItems([
        {
          character: { id: 'c1', name: 'Hero', metadata: JSON.stringify({ assetType: 'character' }) },
          files: [],
        },
        {
          character: { id: 'l1', name: 'Beach', metadata: JSON.stringify({ assetType: 'location' }) },
          files: [],
        },
        {
          character: { id: 'p1', name: 'Sword', metadata: JSON.stringify({ assetType: 'prop' }) },
          files: [],
        },
      ]);
      const b = c().libraryByType();
      expect(b.character).toHaveLength(1);
      expect(b.location).toHaveLength(1);
      expect(b.prop).toHaveLength(1);
    });

    it('falls back to "character" when assetType is missing', () => {
      chars.setItems([
        { character: { id: 'x', name: 'Unknown', metadata: '{}' }, files: [] },
      ]);
      const b = c().libraryByType();
      expect(b.character).toHaveLength(1);
    });

    it('falls back to "character" when metadata is malformed JSON', () => {
      chars.setItems([
        { character: { id: 'x', name: 'Bad JSON', metadata: '{not-json' }, files: [] },
      ]);
      const b = c().libraryByType();
      expect(b.character).toHaveLength(1);
    });

    it('treats an empty metadata string as no metadata (defaults to character)', () => {
      chars.setItems([
        { character: { id: 'x', name: 'Empty', metadata: '' }, files: [] },
      ]);
      const b = c().libraryByType();
      expect(b.character).toHaveLength(1);
    });

    it('maps file thumbnails through FilesApiService.serveUrl', () => {
      chars.setItems([
        {
          character: { id: 'c1', name: 'Hero', metadata: '{}' },
          files: [{ file_id: 'F1', filename: 'hero.png' }],
        },
      ]);
      const b = c().libraryByType() as Record<string, Array<{ files: { thumbUrl: string }[] }>>;
      expect(b['character'][0].files[0].thumbUrl).toBe('/files/F1/serve');
      expect(files.serveUrl).toHaveBeenCalledWith('F1');
    });

    it('handles items with no files array (uses [] and null firstFile)', () => {
      chars.setItems([{ character: { id: 'c1', name: 'NoFiles', metadata: '{}' } }]);
      const b = c().libraryByType() as Record<
        string,
        Array<{ files: unknown[]; firstFile: unknown }>
      >;
      expect(b['character'][0].files).toEqual([]);
      expect(b['character'][0].firstFile).toBeNull();
    });

    it('coerces unknown fileKind metadata to "image"', () => {
      chars.setItems([
        {
          character: {
            id: 'c1',
            name: 'Weird',
            metadata: JSON.stringify({ assetType: 'character', fileKind: 'nonsense' }),
          },
          files: [],
        },
      ]);
      const b = c().libraryByType() as Record<string, Array<{ fileKind: string }>>;
      expect(b['character'][0].fileKind).toBe('image');
    });

    it('preserves valid fileKind values', () => {
      chars.setItems([
        {
          character: {
            id: 'v1',
            name: 'Clip',
            metadata: JSON.stringify({ assetType: 'character', fileKind: 'video' }),
          },
          files: [],
        },
      ]);
      const b = c().libraryByType() as Record<string, Array<{ fileKind: string }>>;
      expect(b['character'][0].fileKind).toBe('video');
    });
  });

  describe('visibleLibrary', () => {
    const setType = (t: 'character' | 'location' | 'prop') =>
      (
        component as unknown as { setLibraryType: (t: 'character' | 'location' | 'prop') => void }
      ).setLibraryType(t);
    const visible = () => (component as unknown as { visibleLibrary: () => unknown[] }).visibleLibrary();

    beforeEach(() => {
      chars.setItems([
        { character: { id: 'c', name: 'C', metadata: JSON.stringify({ assetType: 'character' }) } },
        { character: { id: 'l', name: 'L', metadata: JSON.stringify({ assetType: 'location' }) } },
        { character: { id: 'p', name: 'P', metadata: JSON.stringify({ assetType: 'prop' }) } },
      ]);
    });

    it('returns the bucket matching activeLibraryType', () => {
      expect(visible()).toHaveLength(1);
      setType('location');
      expect(visible()).toHaveLength(1);
      setType('prop');
      expect(visible()).toHaveLength(1);
    });
  });

  describe('libraryCounts', () => {
    it('returns zeros when empty', () => {
      const counts = (
        component as unknown as { libraryCounts: () => Record<string, number> }
      ).libraryCounts();
      expect(counts).toEqual({ character: 0, location: 0, prop: 0 });
    });

    it('reflects the number of items per type', () => {
      chars.setItems([
        { character: { id: 'c1', name: 'A', metadata: JSON.stringify({ assetType: 'character' }) } },
        { character: { id: 'c2', name: 'B', metadata: JSON.stringify({ assetType: 'character' }) } },
        { character: { id: 'l1', name: 'C', metadata: JSON.stringify({ assetType: 'location' }) } },
      ]);
      const counts = (
        component as unknown as { libraryCounts: () => Record<string, number> }
      ).libraryCounts();
      expect(counts).toEqual({ character: 2, location: 1, prop: 0 });
    });
  });

  // ─── usedAssetIds / isUsed ──────────────────────────────────────────

  describe('usedAssetIds and isUsed', () => {
    it('starts empty', () => {
      const ids = (component as unknown as { usedAssetIds: () => Set<string> }).usedAssetIds();
      expect(ids.size).toBe(0);
    });

    it('reflects characterIds from studio.usedAssets', () => {
      studio.seedUsed([makeUsedAsset({ characterId: 'X' }), makeUsedAsset({ characterId: 'Y' })]);
      const ids = (component as unknown as { usedAssetIds: () => Set<string> }).usedAssetIds();
      expect([...ids].sort()).toEqual(['X', 'Y']);
    });

    it('isUsed returns true for picked ids and false otherwise', () => {
      studio.seedUsed([makeUsedAsset({ characterId: 'X' })]);
      const c = component as unknown as { isUsed: (id: string) => boolean };
      expect(c.isUsed('X')).toBe(true);
      expect(c.isUsed('not-picked')).toBe(false);
    });
  });

  // ─── libraryFallbackIcon ───────────────────────────────────────────

  describe('libraryFallbackIcon', () => {
    const setType = (t: 'character' | 'location' | 'prop') =>
      (
        component as unknown as { setLibraryType: (t: 'character' | 'location' | 'prop') => void }
      ).setLibraryType(t);
    const icon = () =>
      (component as unknown as { libraryFallbackIcon: () => string }).libraryFallbackIcon();

    it('uses pi-user for the character tab (default)', () => {
      expect(icon()).toBe('pi-user');
    });
    it('uses pi-map for the location tab', () => {
      setType('location');
      expect(icon()).toBe('pi-map');
    });
    it('uses pi-box for the prop tab', () => {
      setType('prop');
      expect(icon()).toBe('pi-box');
    });
  });

  // ─── onPickLibraryAsset ────────────────────────────────────────────

  describe('onPickLibraryAsset', () => {
    interface LibItem {
      id: string;
      name: string;
      files: { fileId: string; filename: string; thumbUrl: string | null }[];
      firstFile: unknown;
      fileKind: 'image' | 'video' | 'audio' | 'mixed';
    }
    const pick = (a: LibItem) =>
      (component as unknown as { onPickLibraryAsset: (a: LibItem) => void }).onPickLibraryAsset(a);

    it('un-uses an already-picked asset', () => {
      studio.seedUsed([makeUsedAsset({ characterId: 'A' })]);
      pick({ id: 'A', name: 'A', files: [], firstFile: null, fileKind: 'image' });
      expect(studio.unuseAsset).toHaveBeenCalledWith('A');
      expect(studio.useAsset).not.toHaveBeenCalled();
    });

    it('shows a warning toast when the asset has no files yet', () => {
      pick({ id: 'B', name: 'Orphan', files: [], firstFile: null, fileKind: 'image' });
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn', summary: 'No file' }),
      );
      expect(studio.useAsset).not.toHaveBeenCalled();
    });

    it('calls useAsset once per file and emits assetPicked once per file', () => {
      const pickedSpy = vi.fn();
      component.assetPicked.subscribe(pickedSpy);
      pick({
        id: 'B',
        name: 'Trio',
        files: [
          { fileId: 'f1', filename: 'a.png', thumbUrl: null },
          { fileId: 'f2', filename: 'b.png', thumbUrl: null },
          { fileId: 'f3', filename: 'c.png', thumbUrl: null },
        ],
        firstFile: null,
        fileKind: 'image',
      });
      expect(studio.useAsset).toHaveBeenCalledTimes(3);
      expect(pickedSpy).toHaveBeenCalledTimes(3);
      // Each emit carries the file kind.
      expect(pickedSpy).toHaveBeenNthCalledWith(1, 'image');
    });

    it('does NOT emit assetPicked when useAsset dedupes (length unchanged)', () => {
      const pickedSpy = vi.fn();
      component.assetPicked.subscribe(pickedSpy);
      // Pre-seed one of the file ids so the deduping branch fires.
      studio.seedUsed([makeUsedAsset({ fileId: 'f1', characterId: 'OTHER' })]);
      pick({
        id: 'B',
        name: 'PartialDup',
        files: [
          { fileId: 'f1', filename: 'dup.png', thumbUrl: null }, // already in usedAssets
          { fileId: 'f2', filename: 'fresh.png', thumbUrl: null }, // new
        ],
        firstFile: null,
        fileKind: 'image',
      });
      // useAsset called twice (it's a no-op for the first), but emit only once.
      expect(studio.useAsset).toHaveBeenCalledTimes(2);
      expect(pickedSpy).toHaveBeenCalledTimes(1);
    });

    it('shows a success toast with the file count after adding', () => {
      pick({
        id: 'C',
        name: 'Pair',
        files: [
          { fileId: 'f1', filename: 'a.png', thumbUrl: null },
          { fileId: 'f2', filename: 'b.png', thumbUrl: null },
        ],
        firstFile: null,
        fileKind: 'image',
      });
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Reference added',
          detail: 'Pair (2 files)',
        }),
      );
    });

    it('singularizes "file" in the success toast for a single file', () => {
      pick({
        id: 'D',
        name: 'Solo',
        files: [{ fileId: 'f1', filename: 'a.png', thumbUrl: null }],
        firstFile: null,
        fileKind: 'image',
      });
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'Solo (1 file)' }),
      );
    });
  });

  // ─── onFirstFrame / onLastFrame ────────────────────────────────────

  describe('onFirstFrame', () => {
    const trigger = (files: File[]) =>
      (component as unknown as { onFirstFrame: (f: File[]) => void }).onFirstFrame(files);

    it('is a no-op when no files are dropped', () => {
      trigger([]);
      expect(files.upload).not.toHaveBeenCalled();
    });

    it('uploads the first file and calls studio.setFirstFrame on success', () => {
      const file = new File([new Uint8Array([0])], 'frame.png', { type: 'image/png' });
      files.upload.mockReturnValue(
        of({ error: false, msg: 'ok', data: { id: 'F-1', filename: 'frame.png' } }) as Observable<unknown>,
      );
      trigger([file]);
      expect(files.upload).toHaveBeenCalledWith({
        file,
        category: 'images',
        storage: 'temp',
      });
      expect(studio.setFirstFrame).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'F-1',
          filename: 'frame.png',
          slot: 'first-frame',
          thumbnailUrl: '/files/F-1/serve',
        }),
      );
    });

    it('shows an error toast and skips setFirstFrame when upload errors', () => {
      const file = new File([new Uint8Array([0])], 'bad.png', { type: 'image/png' });
      files.upload.mockReturnValue(
        of({ error: true, msg: 'boom', data: undefined }) as Observable<unknown>,
      );
      trigger([file]);
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Upload error', detail: 'boom' }),
      );
      expect(studio.setFirstFrame).not.toHaveBeenCalled();
    });
  });

  describe('onLastFrame', () => {
    const trigger = (files: File[]) =>
      (component as unknown as { onLastFrame: (f: File[]) => void }).onLastFrame(files);

    it('is a no-op when no files are dropped', () => {
      trigger([]);
      expect(files.upload).not.toHaveBeenCalled();
    });

    it('uploads the first file and calls studio.setLastFrame on success', () => {
      const file = new File([new Uint8Array([0])], 'end.png', { type: 'image/png' });
      files.upload.mockReturnValue(
        of({ error: false, msg: 'ok', data: { id: 'L-1', filename: 'end.png' } }) as Observable<unknown>,
      );
      trigger([file]);
      expect(studio.setLastFrame).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'L-1', slot: 'last-frame' }),
      );
    });

    it('shows an error toast on upload failure', () => {
      const file = new File([new Uint8Array([0])], 'bad.png', { type: 'image/png' });
      files.upload.mockReturnValue(
        of({ error: true, msg: 'nope', data: undefined }) as Observable<unknown>,
      );
      trigger([file]);
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'nope' }),
      );
      expect(studio.setLastFrame).not.toHaveBeenCalled();
    });
  });

  // ─── onFreeAssets ──────────────────────────────────────────────────

  describe('onFreeAssets', () => {
    const trigger = (filesArr: File[]) =>
      (component as unknown as { onFreeAssets: (f: File[]) => void }).onFreeAssets(filesArr);

    it('uploads every file and adds each to the store on success', () => {
      const f1 = new File([new Uint8Array([0])], '1.png', { type: 'image/png' });
      const f2 = new File([new Uint8Array([0])], '2.png', { type: 'image/png' });
      files.upload
        .mockReturnValueOnce(
          of({ error: false, msg: 'ok', data: { id: 'A', filename: '1.png' } }) as Observable<unknown>,
        )
        .mockReturnValueOnce(
          of({ error: false, msg: 'ok', data: { id: 'B', filename: '2.png' } }) as Observable<unknown>,
        );
      trigger([f1, f2]);
      expect(files.upload).toHaveBeenCalledTimes(2);
      expect(studio.addFreeAsset).toHaveBeenCalledTimes(2);
      expect(studio.addFreeAsset).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: 'A', slot: 'free' }),
      );
      expect(studio.addFreeAsset).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: 'B', slot: 'free' }),
      );
    });

    it('skips addFreeAsset and toasts an error when a single upload fails', () => {
      const f1 = new File([new Uint8Array([0])], 'bad.png', { type: 'image/png' });
      files.upload.mockReturnValue(
        of({ error: true, msg: 'fail', data: undefined }) as Observable<unknown>,
      );
      trigger([f1]);
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'fail' }),
      );
      expect(studio.addFreeAsset).not.toHaveBeenCalled();
    });

    it('does not call upload when no files were dropped', () => {
      trigger([]);
      expect(files.upload).not.toHaveBeenCalled();
    });
  });

  // ─── onPickFreeAsset ───────────────────────────────────────────────

  describe('onPickFreeAsset', () => {
    const pick = (a: ReferenceAsset) =>
      (component as unknown as { onPickFreeAsset: (a: ReferenceAsset) => void }).onPickFreeAsset(a);

    it('un-uses the asset when already used', () => {
      const a = makeRefAsset({ id: 'F1' });
      // Pre-pick via useAsset (characterId = fileId for free picks).
      studio.useAsset({
        fileId: 'F1',
        characterId: 'F1',
        name: 'demo',
        filename: 'demo.png',
        kind: 'image',
      });
      studio.useAsset.mockClear();
      studio.unuseAsset.mockClear();
      pick(a);
      expect(studio.unuseAsset).toHaveBeenCalledWith('F1');
      expect(studio.useAsset).not.toHaveBeenCalled();
    });

    it('uses the asset with characterId == fileId and emits assetPicked', () => {
      const spy = vi.fn();
      component.assetPicked.subscribe(spy);
      const a = makeRefAsset({ id: 'F2', filename: 'pic.png', kind: 'video' });
      pick(a);
      expect(studio.useAsset).toHaveBeenCalledWith({
        fileId: 'F2',
        characterId: 'F2',
        name: 'pic.png',
        filename: 'pic.png',
        kind: 'video',
      });
      expect(spy).toHaveBeenCalledWith('video');
    });
  });

  // ─── onRemoveFreeAsset ─────────────────────────────────────────────

  describe('onRemoveFreeAsset', () => {
    it('calls both unuseAsset and removeFreeAsset for the same id', () => {
      (
        component as unknown as { onRemoveFreeAsset: (id: string) => void }
      ).onRemoveFreeAsset('FX');
      expect(studio.unuseAsset).toHaveBeenCalledWith('FX');
      expect(studio.removeFreeAsset).toHaveBeenCalledWith('FX');
    });
  });
});
