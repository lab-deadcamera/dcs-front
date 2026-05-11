import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Custom range slider with optional tick labels.
 * Used for DURATION (4s – 15s).
 *
 *   <ui-range-slider
 *     [min]="4" [max]="15" [step]="1"
 *     [value]="output().durationSeconds"
 *     [ticks]="[4, 8, 12, 15]"
 *     ariaLabelKey="STUDIO.OUTPUT.ARIA_DURATION"
 *     (valueChange)="onDurationChange($event)" />
 */
@Component({
  selector: 'ui-range-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full pt-2 pb-6">
      <input
        type="range"
        class="dcs-range w-full"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        (input)="onInput($event)"
        [attr.aria-label]="ariaLabel()"
      />

      @if (ticks().length) {
        <div class="pointer-events-none absolute inset-x-0 top-7 flex justify-between text-[10px] font-mono text-fg-muted">
          @for (t of ticks(); track t) {
            <span>{{ t }}{{ unit() }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .dcs-range {
        appearance: none;
        background: transparent;
        height: 22px;
      }
      .dcs-range::-webkit-slider-runnable-track {
        height: 2px;
        background: var(--color-ink-500);
        border-radius: 2px;
      }
      .dcs-range::-moz-range-track {
        height: 2px;
        background: var(--color-ink-500);
        border-radius: 2px;
      }
      .dcs-range::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        margin-top: -6px;
        border-radius: 50%;
        background: var(--color-brand-red);
        border: 2px solid var(--color-ink-950);
        cursor: pointer;
        box-shadow: 0 0 0 1px var(--color-brand-red);
      }
      .dcs-range::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--color-brand-red);
        border: 2px solid var(--color-ink-950);
        cursor: pointer;
      }
    `,
  ],
})
export class RangeSliderComponent {
  private readonly i18n = inject(TranslateService);

  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly value = input.required<number>();
  readonly ticks = input<number[]>([]);
  readonly unit = input<string>('');
  readonly ariaLabelKey = input<string | null>(null);

  readonly valueChange = output<number>();

  protected readonly ariaLabel = computed(() => {
    const k = this.ariaLabelKey();
    return k ? this.i18n.instant(k) : null;
  });

  protected onInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    this.valueChange.emit(v);
  }
}
