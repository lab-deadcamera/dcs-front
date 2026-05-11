import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { SectionHeaderComponent } from '../../shared/ui/section-header/section-header.component';
import { PromptStateService } from '../../state/prompt.state';

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
  standalone: true,
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 py-6">
      <ui-section-header
        number="02"
        label="PROMPT BUILDER"
        hint="Describe the scene · the cinematographic style is injected automatically"
      />

      <!-- Raw input -->
      <div class="mt-4">
        <textarea
          class="block w-full resize-none border border-ink-500 bg-ink-850 px-4 py-3 text-[13px] text-fg-strong placeholder:italic placeholder:text-fg-muted focus:border-brand-red focus:outline-none"
          rows="5"
          [value]="prompt.rawDescription()"
          (input)="onInput($event)"
          [placeholder]="placeholder"
        ></textarea>
      </div>

      <!-- Compiled prompt preview -->
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
            COMPILED PROMPT
          </span>
          <span class="font-mono text-fg-muted normal-case tracking-normal">
            {{ prompt.compiledLength() }} chars
          </span>
        </button>

        @if (expanded()) {
          <p
            class="mt-3 min-h-[1.5em] font-mono text-[12px] leading-relaxed text-fg whitespace-pre-wrap"
          >
            {{ prompt.compiledPrompt() || '_' }}
          </p>
        }
      </div>

      <!-- Generate -->
      <button
        type="button"
        class="mt-5 flex w-full items-center justify-center gap-3 bg-brand-red py-4 text-sm font-bold uppercase tracking-[0.28em] text-fg-strong transition-opacity hover:opacity-90 disabled:opacity-40"
        [disabled]="!prompt.compiledPrompt()"
        (click)="generate.emit()"
      >
        GENERATE <span aria-hidden="true">→</span>
      </button>
    </section>
  `,
})
export class PromptBuilderComponent {
  protected readonly prompt = inject(PromptStateService);
  protected readonly expanded = signal(true);

  /** Wire this in the parent shell to actually fire the generation call. */
  readonly generate = output<void>();

  protected readonly placeholder =
    'Describe la escena. Sé específico: sujeto, acción, setting, atmósfera. ' +
    'El lenguaje cinematográfico se inyecta automáticamente desde tus selecciones.';

  protected onInput(e: Event) {
    this.prompt.setRawDescription((e.target as HTMLTextAreaElement).value);
  }

  protected toggleExpanded() {
    this.expanded.update((v) => !v);
  }
}
