import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The recurring "01 VIEWER" / "02 PROMPT BUILDER" header pattern.
 *
 * Big red numeral + white uppercase label on the left,
 * muted italic helper text on the right.
 *
 *   <ui-section-header
 *     number="01"
 *     labelKey="STUDIO.VIEWER.TITLE"
 *     hintKey="STUDIO.VIEWER.HINT" />
 */
@Component({
  selector: 'ui-section-header',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-end justify-between gap-4 border-b border-ink-600 pb-3">
      <div class="flex items-baseline gap-3">
        <span
          class="font-display text-3xl leading-none text-brand-red"
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
  `,
})
export class SectionHeaderComponent {
  readonly number = input.required<string>();
  readonly labelKey = input.required<string>();
  readonly hintKey = input<string | null>(null);
}
