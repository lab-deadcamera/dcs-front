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

  /** Adds a reference to the prompt at the current cursor position. */
  addReference(reference: string): void {
    const quill = this.editorRef.getQuill();
    const cursorPosition = quill.getSelection()?.index || 0;
    quill.insertText(cursorPosition, `[${reference}]`);
  }
}
