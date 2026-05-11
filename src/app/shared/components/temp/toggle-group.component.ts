import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ChipOption } from '../../../core/models/studio.models';

/**
 * Generic chip / pill selector.
 *
 * Used everywhere a row of small rectangular options appears:
 *   LENS · CAMERA BODY · CAMERA MOTION · COLOR GRADING · GENRE
 *   ASPECT RATIO · RESOLUTION
 *
 * Single-select by default; emits `valueChange` on every click.
 * Pass `null` value to clear selection from the outside.
 *
 *   <ui-toggle-group
 *     label="LENS"
 *     [options]="lensOptions"
 *     [value]="cine().lens"
 *     (valueChange)="onLensChange($event)" />
 */
@Component({
  selector: 'ui-toggle-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as l) {
      <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
        {{ l }}
      </p>
    }

    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      [attr.aria-label]="label()"
    >
      @for (opt of options(); track opt.value) {
        @let selected = isSelected(opt.value);
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="selected"
          [class]="chipClasses(selected)"
          (click)="onPick(opt.value)"
        >
          @if (selected) {
            <span
              class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-fg-strong align-middle"
            ></span>
          }
          <span>{{ opt.label }}</span>
        </button>
      }
    </div>
  `,
})
export class ToggleGroupComponent<V extends string = string> {
  readonly label = input<string | null>(null);
  readonly options = input.required<ChipOption<V>[]>();
  readonly value = input<V | null>(null);
  /** Visual variant — 'accent' fills selected chip with brand red. */
  readonly variant = input<'default' | 'accent'>('default');

  readonly valueChange = output<V | null>();

  private readonly currentValue = computed(() => this.value());

  protected isSelected(v: V) {
    return this.currentValue() === v;
  }

  protected onPick(v: V) {
    // Toggle off if user clicks the same chip again
    this.valueChange.emit(this.currentValue() === v ? null : v);
  }

  protected chipClasses(selected: boolean): string {
    const base =
      'inline-flex items-center rounded-[3px] border px-3 py-1.5 ' +
      'text-[11px] font-semibold uppercase tracking-[0.12em] ' +
      'transition-colors duration-150';

    if (this.variant() === 'accent' && selected) {
      return (
        base +
        ' border-brand-red bg-brand-red text-fg-strong'
      );
    }

    return selected
      ? base + ' border-fg-strong bg-ink-700 text-fg-strong'
      : base +
          ' border-ink-500 bg-ink-800 text-fg hover:border-fg-muted hover:text-fg-strong';
  }
}
