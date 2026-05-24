import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable, WritableSignal, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { describe, beforeEach, it, expect, vi, Mock } from 'vitest';

import { PromptBuilderComponent } from './prompt-builder.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { UsedAsset } from '@core/interfaces/studio.models';

// ─── Test doubles ──────────────────────────────────────────────────────

/** Mutable fake of StudioStore — only the surface the component touches. */
@Injectable()
class StudioStoreStub {
  private readonly _used = signal<UsedAsset[]>([]);
  private readonly _raw = signal<string>('');
  private readonly _canGenerate = signal<boolean>(true);

  readonly usedAssets = this._used.asReadonly();
  readonly rawDescription = this._raw.asReadonly();
  readonly canGenerate = this._canGenerate.asReadonly();

  readonly setRawDescription = vi.fn((v: string) => this._raw.set(v));

  // Test-only helpers (not part of real StudioStore API).
  setUsedAssets(list: UsedAsset[]): void {
    this._used.set(list);
  }
  setCanGenerate(v: boolean): void {
    this._canGenerate.set(v);
  }
  setRawFromStore(v: string): void {
    this._raw.set(v);
  }
}

/** Quill stub — every Quill API the component reaches for. */
function makeQuillStub() {
  return {
    getSelection: vi.fn().mockReturnValue(null),
    getLength: vi.fn().mockReturnValue(1), // Quill always has a trailing \n
    getText: vi.fn().mockReturnValue('\n'),
    insertText: vi.fn(),
    deleteText: vi.fn(),
    setSelection: vi.fn(),
  };
}

function makeEditorStub(quill: ReturnType<typeof makeQuillStub>) {
  return { getQuill: vi.fn().mockReturnValue(quill) };
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

// Helper: tick once so queued microtasks (effect → queueMicrotask in prune) run.
const flushMicrotasks = () => Promise.resolve();

// ─── Suite ─────────────────────────────────────────────────────────────

describe('PromptBuilderComponent', () => {
  let fixture: ComponentFixture<PromptBuilderComponent>;
  let component: PromptBuilderComponent;
  let studio: StudioStoreStub;
  let translate: { instant: Mock; onLangChange: Subject<unknown> };
  let quill: ReturnType<typeof makeQuillStub>;
  let editor: ReturnType<typeof makeEditorStub>;

  beforeEach(async () => {
    translate = {
      instant: vi.fn((key: string) => `T(${key})`),
      onLangChange: new Subject<unknown>(),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: StudioStore, useClass: StudioStoreStub },
        { provide: TranslateService, useValue: translate },
      ],
    })
      // Swap the heavy PrimeNG template for an empty one — we test the
      // class logic, not the Quill / SectionHeader / SourceAssetPipe DOM.
      .overrideComponent(PromptBuilderComponent, {
        set: { template: '<div></div>', imports: [], styles: [] },
      })
      .compileComponents();

    studio = TestBed.inject(StudioStore) as unknown as StudioStoreStub;
    fixture = TestBed.createComponent(PromptBuilderComponent);
    component = fixture.componentInstance;

    quill = makeQuillStub();
    editor = makeEditorStub(quill);
    // First detectChanges runs the ViewChild query which (with the empty
    // template) would set `editorRef = undefined` on every CD cycle. Define
    // it as a getter so it survives subsequent change-detection passes.
    fixture.detectChanges();
    Object.defineProperty(component, 'editorRef', {
      get: () => editor,
      // No-op setter so Angular's query writer doesn't throw or reset us.
      set: () => undefined,
      configurable: true,
    });
  });

  // ─── Construction ───────────────────────────────────────────────────

  describe('construction', () => {
    it('creates the component', () => {
      expect(component).toBeTruthy();
    });

    it('hydrates editorContent from studio.rawDescription on construction', () => {
      // The new fixture above hydrated from empty string. Verify a fresh
      // construction reads the store's current value.
      studio.setRawFromStore('seeded prompt');
      const fresh = TestBed.createComponent(PromptBuilderComponent);
      const inst = fresh.componentInstance;
      expect((inst as unknown as { editorContent: WritableSignal<string> }).editorContent()).toBe(
        'seeded prompt',
      );
    });
  });

  // ─── Inputs ─────────────────────────────────────────────────────────

  describe('inputs', () => {
    it('isRegenerating defaults to false', () => {
      expect(component.isRegenerating()).toBe(false);
    });

    it('takeSelected defaults to true', () => {
      expect(component.takeSelected()).toBe(true);
    });

    it('canPreview defaults to false', () => {
      expect(component.canPreview()).toBe(false);
    });
  });

  // ─── Computed: kind-filtered asset lists ────────────────────────────

  describe('asset filtering computeds', () => {
    it('starts empty for all three kinds', () => {
      const c = component as unknown as {
        imageAssets: () => UsedAsset[];
        videoAssets: () => UsedAsset[];
        audioAssets: () => UsedAsset[];
      };
      expect(c.imageAssets()).toEqual([]);
      expect(c.videoAssets()).toEqual([]);
      expect(c.audioAssets()).toEqual([]);
    });

    it('imageAssets includes both "image" and "mixed" kinds', () => {
      studio.setUsedAssets([
        makeUsedAsset({ fileId: 'i1', kind: 'image' }),
        makeUsedAsset({ fileId: 'm1', kind: 'mixed' }),
        makeUsedAsset({ fileId: 'v1', kind: 'video' }),
      ]);
      const c = component as unknown as { imageAssets: () => UsedAsset[] };
      expect(c.imageAssets().map((a) => a.fileId)).toEqual(['i1', 'm1']);
    });

    it('videoAssets includes only "video"', () => {
      studio.setUsedAssets([
        makeUsedAsset({ fileId: 'v1', kind: 'video' }),
        makeUsedAsset({ fileId: 'v2', kind: 'video' }),
        makeUsedAsset({ fileId: 'i1', kind: 'image' }),
      ]);
      const c = component as unknown as { videoAssets: () => UsedAsset[] };
      expect(c.videoAssets().map((a) => a.fileId)).toEqual(['v1', 'v2']);
    });

    it('audioAssets includes only "audio"', () => {
      studio.setUsedAssets([
        makeUsedAsset({ fileId: 'a1', kind: 'audio' }),
        makeUsedAsset({ fileId: 'a2', kind: 'audio' }),
        makeUsedAsset({ fileId: 'i1', kind: 'image' }),
      ]);
      const c = component as unknown as { audioAssets: () => UsedAsset[] };
      expect(c.audioAssets().map((a) => a.fileId)).toEqual(['a1', 'a2']);
    });

    it('updates reactively when usedAssets changes', () => {
      const c = component as unknown as { imageAssets: () => UsedAsset[] };
      expect(c.imageAssets()).toEqual([]);
      studio.setUsedAssets([makeUsedAsset({ fileId: 'i1', kind: 'image' })]);
      expect(c.imageAssets()).toHaveLength(1);
    });
  });

  // ─── Computed: generateLabel, placeholder ───────────────────────────

  describe('generateLabel computed', () => {
    it('returns GENERATE key by default', () => {
      const c = component as unknown as { generateLabel: () => string };
      expect(c.generateLabel()).toBe('T(STUDIO.PROMPT.GENERATE)');
    });

    it('returns REGENERATE key when isRegenerating is true', () => {
      fixture.componentRef.setInput('isRegenerating', true);
      fixture.detectChanges();
      const c = component as unknown as { generateLabel: () => string };
      expect(c.generateLabel()).toBe('T(STUDIO.PROMPT.REGENERATE)');
    });
  });

  describe('placeholder computed', () => {
    it('returns translated PLACEHOLDER key', () => {
      const c = component as unknown as { placeholder: () => string };
      expect(c.placeholder()).toBe('T(STUDIO.PROMPT.PLACEHOLDER)');
    });
  });

  // ─── Pure helpers: iconForKind, labelFor ───────────────────────────

  describe('iconForKind', () => {
    const c = () => component as unknown as { iconForKind: (k: string) => string };

    it('returns pi-video for "video"', () => {
      expect(c().iconForKind('video')).toBe('pi-video');
    });
    it('returns pi-volume-up for "audio"', () => {
      expect(c().iconForKind('audio')).toBe('pi-volume-up');
    });
    it('returns pi-folder for "mixed"', () => {
      expect(c().iconForKind('mixed')).toBe('pi-folder');
    });
    it('returns pi-image for "image" (default branch)', () => {
      expect(c().iconForKind('image')).toBe('pi-image');
    });
  });

  describe('labelFor', () => {
    const c = () =>
      component as unknown as { labelFor: (k: string) => 'Image' | 'Video' | 'Audio' };

    it('maps image → Image', () => {
      expect(c().labelFor('image')).toBe('Image');
    });
    it('maps mixed → Image (mixed shares the image bucket)', () => {
      expect(c().labelFor('mixed')).toBe('Image');
    });
    it('maps video → Video', () => {
      expect(c().labelFor('video')).toBe('Video');
    });
    it('maps audio → Audio', () => {
      expect(c().labelFor('audio')).toBe('Audio');
    });
  });

  // ─── onTextChange ──────────────────────────────────────────────────

  describe('onTextChange', () => {
    it('forwards textValue to studio.setRawDescription', () => {
      (component as unknown as { onTextChange: (e: { textValue: string }) => void }).onTextChange({
        textValue: 'hello world',
      });
      expect(studio.setRawDescription).toHaveBeenCalledWith('hello world');
    });

    it('coerces an undefined textValue to empty string', () => {
      (
        component as unknown as { onTextChange: (e: { textValue?: string }) => void }
      ).onTextChange({ textValue: undefined });
      expect(studio.setRawDescription).toHaveBeenCalledWith('');
    });
  });

  // ─── onGenerate / onPreview ────────────────────────────────────────

  describe('onGenerate', () => {
    it('emits generate when canGenerate is true', () => {
      const spy = vi.fn();
      component.generate.subscribe(spy);
      (component as unknown as { onGenerate: () => void }).onGenerate();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does NOT emit when canGenerate is false', () => {
      studio.setCanGenerate(false);
      const spy = vi.fn();
      component.generate.subscribe(spy);
      (component as unknown as { onGenerate: () => void }).onGenerate();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onPreview', () => {
    it('emits preview when canGenerate is true', () => {
      const spy = vi.fn();
      component.preview.subscribe(spy);
      (component as unknown as { onPreview: () => void }).onPreview();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does NOT emit when canGenerate is false', () => {
      studio.setCanGenerate(false);
      const spy = vi.fn();
      component.preview.subscribe(spy);
      (component as unknown as { onPreview: () => void }).onPreview();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── addReference ──────────────────────────────────────────────────

  describe('addReference', () => {
    it('inserts " [text]" at the current Quill selection index', () => {
      quill.getSelection.mockReturnValueOnce({ index: 5, length: 0 });
      component.addReference('Image1');
      expect(quill.insertText).toHaveBeenCalledWith(5, ' [Image1]');
    });

    it('falls back to (length - 1) when no selection (clamped at 0)', () => {
      quill.getSelection.mockReturnValueOnce(null);
      quill.getLength.mockReturnValueOnce(10);
      component.addReference('Image1');
      expect(quill.insertText).toHaveBeenCalledWith(9, ' [Image1]');
    });

    it('never inserts at a negative index even if Quill reports length 0', () => {
      quill.getSelection.mockReturnValueOnce(null);
      quill.getLength.mockReturnValueOnce(0);
      component.addReference('Image1');
      expect(quill.insertText).toHaveBeenCalledWith(0, ' [Image1]');
    });

    it('moves the cursor to right after the inserted token', () => {
      quill.getSelection.mockReturnValueOnce({ index: 5, length: 0 });
      component.addReference('Image1');
      // ' [Image1]' is 9 chars; 5 + 9 = 14
      expect(quill.setSelection).toHaveBeenCalledWith(14, 0);
    });
  });

  // ─── addReferenceForKind ───────────────────────────────────────────

  describe('addReferenceForKind', () => {
    it('numbers image picks using the current imageAssets count', () => {
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'image' }),
        makeUsedAsset({ kind: 'image' }),
        makeUsedAsset({ kind: 'image' }),
      ]);
      component.addReferenceForKind('image');
      expect(quill.insertText).toHaveBeenCalledWith(expect.any(Number), ' [Image3]');
    });

    it('routes "mixed" through the image counter (mixed kind shares the image bucket)', () => {
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'image' }),
        makeUsedAsset({ kind: 'mixed' }),
      ]);
      component.addReferenceForKind('mixed');
      expect(quill.insertText).toHaveBeenCalledWith(expect.any(Number), ' [Image2]');
    });

    it('numbers video picks using the videoAssets count', () => {
      studio.setUsedAssets([makeUsedAsset({ kind: 'video' })]);
      component.addReferenceForKind('video');
      expect(quill.insertText).toHaveBeenCalledWith(expect.any(Number), ' [Video1]');
    });

    it('numbers audio picks using the audioAssets count', () => {
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'audio' }),
        makeUsedAsset({ kind: 'audio' }),
      ]);
      component.addReferenceForKind('audio');
      expect(quill.insertText).toHaveBeenCalledWith(expect.any(Number), ' [Audio2]');
    });
  });

  // ─── pruneStaleTokens (private, accessed via [])  ──────────────────

  describe('pruneStaleTokens', () => {
    const prune = (label: 'Image' | 'Video' | 'Audio', max: number) =>
      (
        component as unknown as {
          pruneStaleTokens: (l: typeof label, m: number) => void;
        }
      ).pruneStaleTokens(label, max);

    it('removes only tokens whose index exceeds maxAllowed', () => {
      quill.getText.mockReturnValue('intro [Image1] mid [Image2] tail [Image3]\n');
      prune('Image', 1);
      // Tokens removed: [Image2] (idx 19, len 9) and [Image3] (idx 33, len 9, with leading space → 10)
      // Actual matches captured with the leading-space pattern: " [Image2]" (len 9) and " [Image3]" (len 9).
      expect(quill.deleteText).toHaveBeenCalledTimes(2);
    });

    it('iterates in reverse so earlier match indices remain valid', () => {
      quill.getText.mockReturnValue('a [Image2] b [Image3] c\n');
      const calls: number[] = [];
      quill.deleteText.mockImplementation((idx: number) => {
        calls.push(idx);
      });
      prune('Image', 1);
      // First call should be the LATER index, second the earlier.
      expect(calls[0]).toBeGreaterThan(calls[1]);
    });

    it('absorbs a single leading space so we do not leave double spaces', () => {
      quill.getText.mockReturnValue('hi [Image2]\n');
      prune('Image', 1);
      // Match length is 9 (includes the leading space before "[")
      expect(quill.deleteText).toHaveBeenCalledWith(expect.any(Number), 9);
    });

    it('does nothing when there are no stale tokens', () => {
      quill.getText.mockReturnValue('intro [Image1] only\n');
      prune('Image', 5);
      expect(quill.deleteText).not.toHaveBeenCalled();
    });

    it('only deletes the matching label kind', () => {
      quill.getText.mockReturnValue('[Image2] [Video2] [Audio2]\n');
      prune('Video', 1);
      // Only Video deletion expected.
      expect(quill.deleteText).toHaveBeenCalledTimes(1);
    });

    it('pushes the cleaned text back into the studio store', () => {
      quill.getText
        .mockReturnValueOnce('hi [Image2]\n') // initial scan
        .mockReturnValueOnce('hi \n'); // after delete (for the setRawDescription call)
      prune('Image', 1);
      expect(studio.setRawDescription).toHaveBeenCalledWith('hi ');
    });

    it('no-ops safely when editorRef is unset', () => {
      // Re-define over the getter installed in beforeEach so the falsy guard
      // (`if (!this.editorRef) return;`) actually fires.
      Object.defineProperty(component, 'editorRef', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      // Should not throw.
      expect(() => prune('Image', 0)).not.toThrow();
      expect(quill.deleteText).not.toHaveBeenCalled();
    });

    it('no-ops safely when getQuill() returns null', () => {
      editor.getQuill.mockReturnValueOnce(null);
      expect(() => prune('Image', 0)).not.toThrow();
      expect(quill.deleteText).not.toHaveBeenCalled();
    });
  });

  // ─── Effects ──────────────────────────────────────────────────────

  describe('effects: store → editor sync', () => {
    it('updates editorContent when rawDescription changes externally', () => {
      studio.setRawFromStore('externally set');
      fixture.detectChanges();
      const ec = (component as unknown as { editorContent: WritableSignal<string> }).editorContent;
      expect(ec()).toBe('externally set');
    });

    it('skips the echo write when the change originated from the editor', () => {
      // Simulate user typing — sets skipStoreSync inside onTextChange.
      (component as unknown as { onTextChange: (e: { textValue: string }) => void }).onTextChange({
        textValue: 'typed in editor',
      });
      // Store now reflects "typed in editor"; the effect should NOT overwrite
      // the editor's HTML (which may have richer formatting) with the plain
      // text. Editor content stays whatever it was.
      const editorContent = (
        component as unknown as { editorContent: WritableSignal<string> }
      ).editorContent;
      const before = editorContent();
      fixture.detectChanges();
      // No external change actually happened: the store's value is what the
      // editor just set, so the comparison `currentText !== storeVal` would
      // still match (stripHtml of '' vs 'typed in editor'). The skipStoreSync
      // flag guards the very next effect tick.
      expect(editorContent()).toBe(before);
    });
  });

  describe('effects: prune on usedAssets shrinkage', () => {
    it('prunes Image tokens when imageAssets shrinks', async () => {
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'image', fileId: 'i1' }),
        makeUsedAsset({ kind: 'image', fileId: 'i2' }),
      ]);
      fixture.detectChanges();
      quill.getText.mockReturnValue('go [Image1] [Image2]\n');
      // Shrink: drop one image.
      studio.setUsedAssets([makeUsedAsset({ kind: 'image', fileId: 'i1' })]);
      fixture.detectChanges();
      await flushMicrotasks(); // effect schedules prune via queueMicrotask
      expect(quill.deleteText).toHaveBeenCalled();
    });

    it('prunes Video tokens when videoAssets shrinks', async () => {
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'video', fileId: 'v1' }),
        makeUsedAsset({ kind: 'video', fileId: 'v2' }),
      ]);
      fixture.detectChanges();
      quill.getText.mockReturnValue('clip [Video1] [Video2]\n');
      studio.setUsedAssets([makeUsedAsset({ kind: 'video', fileId: 'v1' })]);
      fixture.detectChanges();
      await flushMicrotasks();
      expect(quill.deleteText).toHaveBeenCalled();
    });

    it('does NOT prune when usedAssets grows', async () => {
      studio.setUsedAssets([makeUsedAsset({ kind: 'image', fileId: 'i1' })]);
      fixture.detectChanges();
      studio.setUsedAssets([
        makeUsedAsset({ kind: 'image', fileId: 'i1' }),
        makeUsedAsset({ kind: 'image', fileId: 'i2' }),
      ]);
      fixture.detectChanges();
      await flushMicrotasks();
      expect(quill.deleteText).not.toHaveBeenCalled();
    });

    it('does not prune on the initial run (prevents wiping hydrated text)', async () => {
      // Component already constructed; prune effect ran once with prev=0 and
      // next=0 → no shrinkage. Verify by leaving usedAssets empty and asserting
      // no delete was issued.
      fixture.detectChanges();
      await flushMicrotasks();
      expect(quill.deleteText).not.toHaveBeenCalled();
    });
  });
});
