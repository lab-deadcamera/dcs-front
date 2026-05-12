import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 02 — PROMPT BUILDER.
 *
 * Two-textarea layout:
 *   1. User describes the scene.
 *   2. Read-only "Compiled Prompt" preview = raw + cinematography injection.
 * Followed by the big red GENERATE button.
 */
@Component({
  selector: 'app-prompt-builder',
  imports: [SectionHeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header
        number="06"
        labelKey="STUDIO.PROMPT.TITLE"
        hintKey="STUDIO.PROMPT.HINT"
      />

      <div class="mt-4">
        <textarea
          class="block w-full resize-none border border-ink-500 bg-ink-850 px-4 py-3 text-[13px] text-fg-strong placeholder:italic placeholder:text-fg-muted focus:border-brand-red focus:outline-none"
          rows="5"
          [value]="prompt.rawDescription()"
          (input)="onInput($event)"
          [placeholder]="placeholder()"
        ></textarea>
      </div>

      <div class="mt-4 border-l-2 border-brand-red bg-ink-850 px-4 py-3">
        <button
          type="button"
          class="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red"
          (click)="toggleExpanded()"
        >
          <span>
            <span
              class="inline-block transition-transform"
              [class.rotate-180]="!expanded()"
            >▼</span>
            {{ 'STUDIO.PROMPT.COMPILED' | translate }}
          </span>
          <span class="font-mono text-fg-muted normal-case tracking-normal">
            {{ 'STUDIO.PROMPT.CHARS' | translate: { n: prompt.compiledLength() } }}
          </span>
        </button>

        @if (expanded()) {
          <p
            class="mt-3 min-h-[1.5em] font-mono text-[12px] leading-relaxed text-fg whitespace-pre-wrap"
          >
            {{ prompt.compiledPrompt() || ('STUDIO.PROMPT.EMPTY_PREVIEW' | translate) }}
          </p>
        }
      </div>

      <!--
        Generate action — spans the full Prompt Builder column width
        (matches the viewer width above) for a confident submit affordance.
      -->
      <button
        type="button"
        class="mt-5 flex w-full items-center justify-center gap-3 bg-brand-red py-3 text-sm font-bold uppercase tracking-[0.28em] text-fg-strong transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="!prompt.canGenerate()"
        (click)="onGenerate()"
      >
        {{ 'STUDIO.PROMPT.GENERATE' | translate }}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  `,
})
export class PromptBuilderComponent {
  protected readonly prompt = inject(PromptStateService);
  private readonly i18n = inject(TranslateService);

  protected readonly expanded = signal(true);

  /** Wire this in the parent shell to actually fire the generation call. */
  readonly generate = output<void>();

  /** Re-resolve placeholder when the language changes. */
  private readonly lang = toSignal(this.i18n.onLangChange, { initialValue: null });

  protected readonly placeholder = computed(() => {
    // Track lang signal so the value updates on language switches.
    this.lang();
    return this.i18n.instant('STUDIO.PROMPT.PLACEHOLDER');
  });

  protected onInput(e: Event) {
    this.prompt.setRawDescription((e.target as HTMLTextAreaElement).value);
  }

  protected toggleExpanded() {
    this.expanded.update((v) => !v);
  }

  protected onGenerate(): void {
    if (!this.prompt.canGenerate()) return;
    this.generate.emit();
  }
}
