import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Editor, EditorModule } from 'primeng/editor';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { SourceAssetPipe } from '@app/core/pipes/source-asset.pipe';
import { StudioStore } from '@app/core/stores/studio.store';
import { UsedAssetKind } from '@core/interfaces/studio.models';

/**
 * Section 06 — PROMPT BUILDER.
 *
 * Rich-text editor (PrimeNG Editor / Quill, toolbar hidden) that holds
 * the prompt the user writes. Presets inject themselves into the matching
 * section headers so what the user sees is exactly the text that gets sent
 * to the Seedance API. Reference assets live as chips on top and travel
 * through the API payload separately.
 */
@Component({
  selector: 'app-prompt-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-builder.component.html',
  imports: [SectionHeaderComponent, SourceAssetPipe, EditorModule, FormsModule, TranslatePipe],
  styles: [
    `
      :host ::ng-deep .p-editor-toolbar {
        display: none !important;
      }
      :host ::ng-deep .p-editor-content .ql-editor {
        min-height: 300px;
        padding: 12px 16px;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.625;
        background: transparent;
      }
    `,
  ],
})
export class PromptBuilderComponent {
  @ViewChild('editor') private editorRef!: Editor;
  protected readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  /** Wire this in the parent shell to actually fire the generation call. */
  readonly generate = output<void>();

  /** When true, the generate button reads "VOLVER A GENERAR". */
  readonly isRegenerating = input(false);
  /** When false, the generate button is disabled (no take selected). */
  readonly takeSelected = input(true);

  /** Re-resolve placeholder when the language changes. */
  private readonly lang = toSignal(this.i18n.onLangChange, { initialValue: null });

  protected readonly placeholder = computed(() => {
    this.lang();
    return this.i18n.instant('STUDIO.PROMPT.PLACEHOLDER');
  });

  /** Button label: GENERAR or VOLVER A GENERAR. */
  protected readonly generateLabel = computed(() => {
    const lang = this.lang();
    const regen = this.isRegenerating();
    return this.i18n.instant(regen ? 'STUDIO.PROMPT.REGENERATE' : 'STUDIO.PROMPT.GENERATE');
  });

  // ── Reference assets grouped by kind ──────────────────────────────

  protected readonly imageAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'image' || a.kind === 'mixed'),
  );
  protected readonly videoAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'video'),
  );
  protected readonly audioAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'audio'),
  );

  protected readonly sectionLabels: {
    image: string;
    video: string;
    audio: string;
  } = {
      image: 'STUDIO.PROMPT.REFERENCES_IMAGES',
      video: 'STUDIO.PROMPT.REFERENCES_VIDEO',
      audio: 'STUDIO.PROMPT.REFERENCES_AUDIO',
    };

  // ── Editor content ───────────────────────────────────────────────

  /** HTML content bound to the PrimeNG Editor via ngModel. */
  protected editorContent = signal('');

  /** Flag to prevent syncing store → editor when the change originated from the editor. */
  private skipStoreSync = false;

  /**
   * Last observed count per token-prefix. Tokens are pruned only when a
   * count *decreases*, so legitimate text written manually (or hydrated
   * from storage on first paint) is never wiped out by the initial run.
   */
  private prevCounts = { image: 0, video: 0, audio: 0 };

  constructor() {
    this.editorContent.set(this.studio.rawDescription());

    effect(() => {
      const storeVal = this.studio.rawDescription();
      if (!this.skipStoreSync) {
        const currentText = this.stripHtml(this.editorContent());
        if (currentText !== storeVal) {
          this.editorContent.set(storeVal);
        }
      }
      this.skipStoreSync = false;
    });

    // When the user removes a chip, drop the highest-numbered matching
    // tokens from the editor so the prompt text mirrors the chip strip.
    // Chips always renumber to 1..N per kind in display order, so pruning
    // anything with N > current-count is correct regardless of which
    // asset was removed. Deferred via microtask so Quill is settled
    // before we mutate it from inside a reactive effect.
    effect(() => {
      const next = {
        image: this.imageAssets().length,
        video: this.videoAssets().length,
        audio: this.audioAssets().length,
      };
      const shrunk = {
        image: next.image < this.prevCounts.image,
        video: next.video < this.prevCounts.video,
        audio: next.audio < this.prevCounts.audio,
      };
      this.prevCounts = next;
      if (!shrunk.image && !shrunk.video && !shrunk.audio) return;
      queueMicrotask(() => {
        if (shrunk.image) this.pruneStaleTokens('Image', next.image);
        if (shrunk.video) this.pruneStaleTokens('Video', next.video);
        if (shrunk.audio) this.pruneStaleTokens('Audio', next.audio);
      });
    });
  }

  /** Called by the editor on every user keystroke. Syncs plain text to the store. */
  protected onTextChange(event: { textValue: string }) {
    this.skipStoreSync = true;
    this.studio.setRawDescription(event.textValue || '');
  }

  protected onGenerate(): void {
    if (!this.studio.canGenerate()) return;
    this.generate.emit();
  }

  /** PrimeIcons class for the chip representing each asset kind. */
  protected iconForKind(kind: UsedAssetKind): string {
    switch (kind) {
      case 'video':
        return 'pi-video';
      case 'audio':
        return 'pi-volume-up';
      case 'mixed':
        return 'pi-folder';
      default:
        return 'pi-image';
    }
  }

  /** Strip HTML tags to get plain text. */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Adds a reference to the prompt at the current cursor position.
   * If the editor has no selection (never focused), falls back to the end
   * of the document so the chip lands next to the last typed letter rather
   * than at position 0.
   */
  addReference(reference: string): void {
    const quill = this.editorRef.getQuill();
    const selection = quill.getSelection();
    // Quill always appends a trailing newline → length-1 is the end of content.
    const fallbackEnd = Math.max(0, quill.getLength() - 1);
    const cursorPosition = selection?.index ?? fallbackEnd;
    const text = ` [${reference}]`;
    quill.insertText(cursorPosition, text);
    quill.setSelection(cursorPosition + text.length, 0);
  }

  /**
   * Canonical English label for a chip kind. Hardcoded (not translated)
   * because the token also ships to the model in the payload and must
   * match the frame hint vocabulary ("Image 1", "Video 1", "Audio 1").
   */
  protected labelFor(kind: UsedAssetKind): 'Image' | 'Video' | 'Audio' {
    if (kind === 'video') return 'Video';
    if (kind === 'audio') return 'Audio';
    return 'Image';
  }

  /**
   * Inserts a reference label whose number matches the chip the user just
   * picked from the library (e.g. picking a third image emits `[Image3]`).
   * Reads the count from the same filtered signals that render the chip
   * strip so labels stay in sync with what the user sees.
   */
  addReferenceForKind(kind: UsedAssetKind): void {
    const label = this.labelFor(kind);
    const count =
      kind === 'video'
        ? this.videoAssets().length
        : kind === 'audio'
          ? this.audioAssets().length
          : this.imageAssets().length;
    this.addReference(`${label}${count}`);
  }

  /**
   * Remove every `[<label>N]` token whose N exceeds `maxAllowed`. Iterates
   * in reverse so deletions don't shift the indices of earlier matches.
   * Absorbs a single leading space so we don't leave double spaces behind
   * the way `addReference` inserts them.
   */
  private pruneStaleTokens(label: 'Image' | 'Video' | 'Audio', maxAllowed: number): void {
    if (!this.editorRef) return;
    const quill = this.editorRef.getQuill();
    if (!quill) return;
    const text = quill.getText();
    const pattern = new RegExp(` ?\\[${label}(\\d+)\\]`, 'g');
    const stale: Array<{ index: number; length: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (parseInt(m[1], 10) > maxAllowed) {
        stale.push({ index: m.index, length: m[0].length });
      }
    }
    if (stale.length === 0) return;
    for (let i = stale.length - 1; i >= 0; i--) {
      quill.deleteText(stale[i].index, stale[i].length);
    }
    // Keep the store in sync — Quill's text-change event normally feeds
    // onTextChange, but we set the flag preemptively in case the event
    // path is suppressed for `api`-source edits.
    this.skipStoreSync = true;
    this.studio.setRawDescription(quill.getText().replace(/\n+$/, ''));
  }
}

