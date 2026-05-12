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
          class="block w-full resize-none border border-ink-500 bg-ink-850 px-4 py-3 text-[13px] text-fg-strong placeholder:italic placeholder:text-fg-muted focus:border-primary-500 focus:outline-none"
          rows="5"
          [value]="prompt.rawDescription()"
          (input)="onInput($event)"
          [placeholder]="placeholder()"
        ></textarea>
      </div>

      <div class="mt-4 border-l-2 border-primary-500 bg-ink-850 px-4 py-3">
        <div class="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-500"
            (click)="toggleExpanded()"
          >
            <span
              class="inline-block transition-transform"
              [class.rotate-180]="!expanded()"
            >▼</span>
            <span>{{ 'STUDIO.PROMPT.COMPILED' | translate }}</span>
            @if (prompt.hasCompiledOverride()) {
              <span
                class="font-mono text-[10px] normal-case tracking-normal text-accent-500"
              >
                · {{ 'STUDIO.PROMPT.EDITED_BADGE' | translate }}
              </span>
            }
          </button>

          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-fg-muted">
              {{ 'STUDIO.PROMPT.CHARS' | translate: { n: prompt.compiledLength() } }}
            </span>

            @if (prompt.hasCompiledOverride() && !editingCompiled()) {
              <button
                type="button"
                class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-primary-500"
                (click)="onResetCompiled()"
                [attr.aria-label]="'STUDIO.PROMPT.RESET_COMPILED' | translate"
                [attr.title]="'STUDIO.PROMPT.RESET_COMPILED' | translate"
              >
                {{ 'STUDIO.PROMPT.RESET_COMPILED' | translate }}
              </button>
            }

            @if (!editingCompiled()) {
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-sm border border-ink-500 bg-ink-900 text-fg-muted transition-colors hover:border-primary-500 hover:text-primary-500 focus:outline-none"
                (click)="onStartEditing()"
                [attr.aria-label]="'STUDIO.PROMPT.EDIT_COMPILED' | translate"
                [attr.title]="'STUDIO.PROMPT.EDIT_COMPILED' | translate"
              >
                <svg
                  viewBox="0 0 16 16"
                  class="h-3.5 w-3.5"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                  <path d="M9.5 3.5l3 3" />
                </svg>
              </button>
            }
          </div>
        </div>

        @if (expanded()) {
          @if (editingCompiled()) {
            <textarea
              #editBox
              class="mt-3 block w-full resize-y border border-primary-500 bg-ink-900 px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-strong focus:outline-none"
              rows="8"
              [value]="editBuffer()"
              (input)="onEditInput($event)"
            ></textarea>
            <div class="mt-2 flex justify-end gap-2">
              <button
                type="button"
                class="px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
                (click)="onCancelEditing()"
              >
                {{ 'STUDIO.PROMPT.CANCEL_EDIT' | translate }}
              </button>
              <button
                type="button"
                class="bg-primary-500 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-strong transition-opacity hover:opacity-90"
                (click)="onSaveEditing()"
              >
                {{ 'STUDIO.PROMPT.SAVE_EDIT' | translate }}
              </button>
            </div>
          } @else {
            <p
              class="mt-3 min-h-[1.5em] font-mono text-[12px] leading-relaxed text-fg whitespace-pre-wrap"
            >
              {{ prompt.compiledPrompt() || ('STUDIO.PROMPT.EMPTY_PREVIEW' | translate) }}
            </p>
          }
        }
      </div>

      <!--
        Generate action — spans the full Prompt Builder column width
        (matches the viewer width above) for a confident submit affordance.
      -->
      <button
        type="button"
        class="mt-5 flex w-full items-center justify-center gap-3 bg-primary-500 py-3 text-sm font-bold uppercase tracking-[0.28em] text-fg-strong transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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

  /** Whether the inline editor for the compiled prompt is open. */
  protected readonly editingCompiled = signal(false);
  /** Buffer that holds the in-progress edit until the user hits Save. */
  protected readonly editBuffer = signal('');

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

  protected onStartEditing(): void {
    // Open the editor with whatever is currently being sent to the model
    // — either the existing override or the freshly-derived base.
    this.editBuffer.set(this.prompt.compiledPrompt());
    this.editingCompiled.set(true);
    if (!this.expanded()) this.expanded.set(true);
  }

  protected onEditInput(e: Event): void {
    this.editBuffer.set((e.target as HTMLTextAreaElement).value);
  }

  protected onCancelEditing(): void {
    this.editingCompiled.set(false);
  }

  protected onSaveEditing(): void {
    const text = this.editBuffer().trim();
    // Empty save → clear the override and fall back to the derived value.
    this.prompt.setCompiledOverride(text.length ? this.editBuffer() : null);
    this.editingCompiled.set(false);
  }

  protected onResetCompiled(): void {
    this.prompt.clearCompiledOverride();
  }
}
