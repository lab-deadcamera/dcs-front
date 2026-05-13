import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The recurring "01 VIEWER" / "02 PROMPT BUILDER" header pattern.
 *
 * Big red numeral + white uppercase label on the left,
 * muted italic helper text on the right.
 *
 * When `collapsible` is true the whole header becomes the disclosure
 * trigger for its section body — it renders as a `<button>`, exposes
 * `aria-expanded`, and emits `toggle` on click. A chevron on the right
 * rotates 180° while expanded. The number + title remain unchanged so
 * the visual step rhythm of the page is preserved.
 *
 *   <ui-section-header
 *     number="02"
 *     labelKey="STUDIO.CINEMATOGRAPHY.TITLE"
 *     [collapsible]="true"
 *     [expanded]="expanded()"
 *     (toggle)="expanded.update(v => !v)" />
 */
@Component({
  selector: 'ui-section-header',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (collapsible()) {
      <button
        type="button"
        class="flex w-full items-end justify-between gap-4 border-b border-ink-600 pb-3 text-left transition-colors hover:bg-ink-850/40 focus:outline-none"
        (click)="toggle.emit()"
        [attr.aria-expanded]="expanded()"
      >
        <div class="flex items-baseline gap-3">
          <span
            class="font-display text-3xl leading-none text-primary-500"
            [style.font-style]="'italic'"
          >
            {{ number() }}
          </span>
          <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-fg-strong">
            {{ labelKey() | translate }}
          </h2>
        </div>

        <div class="flex items-center gap-3">
          @if (hintKey(); as h) {
            <p class="text-[13px] italic text-fg-muted">{{ h | translate }}</p>
          }
          <span
            aria-hidden="true"
            class="inline-block text-fg-muted transition-transform duration-150"
            [class.rotate-180]="expanded()"
          >▾</span>
        </div>
      </button>
    } @else {
      <header class="flex items-end justify-between gap-4 border-b border-ink-600 pb-3">
        <div class="flex items-baseline gap-3">
          <span
            class="font-display text-3xl leading-none text-primary-500"
            [style.font-style]="'italic'"
          >
            {{ number() }}
          </span>
          <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-fg-strong">
            {{ labelKey() | translate }}
          </h2>
        </div>

        @if (hintKey(); as h) {
          <p class="text-[13px] italic text-fg-muted">{{ h | translate }}</p>
        }
      </header>
    }
  `,
})
export class SectionHeaderComponent {
  readonly number = input.required<string>();
  readonly labelKey = input.required<string>();
  readonly hintKey = input<string | null>(null);
  /** When true, renders the header as a clickable disclosure trigger. */
  readonly collapsible = input<boolean>(false);
  /** Current open/closed state — drives chevron rotation + aria-expanded. */
  readonly expanded = input<boolean>(true);
  readonly toggle = output<void>();
}
