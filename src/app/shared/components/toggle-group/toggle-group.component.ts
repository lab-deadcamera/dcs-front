import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { inject } from '@angular/core';
import { ChipOption } from '@core/interfaces/studio.models';

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
 *     labelKey="STUDIO.CINEMATOGRAPHY.LENS"
 *     [options]="lensOptions"
 *     [value]="cine().lens"
 *     (valueChange)="onLensChange($event)" />
 */
@Component({
  selector: 'ui-toggle-group',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (labelKey(); as l) {
      <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
        {{ l | translate }}
      </p>
    }

    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      [attr.aria-label]="ariaLabel()"
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
              class="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
              [class.bg-secondary-500]="variant() === 'default'"
              [class.bg-fg-strong]="variant() === 'accent'"
            ></span>
          }
          <span class="whitespace-nowrap">
            {{ opt.label ?? (opt.labelKey | translate) }}
          </span>
          @if (opt.editable) {
            <span
              role="button"
              tabindex="-1"
              class="ml-2 inline-block text-[10px] leading-none text-fg-muted transition-colors hover:text-primary-500"
              [attr.aria-label]="'COMMON.EDIT' | translate"
              (click)="onEdit($event, opt.value)"
            >✎</span>
          }
          @if (opt.removable) {
            <span
              role="button"
              tabindex="-1"
              class="ml-1 inline-block leading-none text-fg-muted transition-colors hover:text-primary-500"
              [attr.aria-label]="'COMMON.DELETE' | translate"
              (click)="onRemove($event, opt.value)"
            >×</span>
          }
        </button>
      }
    </div>
  `,
})
export class ToggleGroupComponent<V extends string = string> {
  private readonly i18n = inject(TranslateService);

  readonly labelKey = input<string | null>(null);
  readonly options = input.required<ChipOption<V>[]>();
  readonly value = input<V | null>(null);
  /** Visual variant — 'accent' fills selected chip with brand red. */
  readonly variant = input<'default' | 'accent'>('default');

  readonly valueChange = output<V | null>();
  /** Emitted when the user clicks the × on a `removable` chip. */
  readonly remove = output<V>();
  /** Emitted when the user clicks the ✎ on an `editable` chip. */
  readonly edit = output<V>();

  protected readonly ariaLabel = computed(() => {
    const k = this.labelKey();
    return k ? this.i18n.instant(k) : null;
  });

  protected isSelected(v: V) {
    return this.value() === v;
  }

  protected onPick(v: V) {
    this.valueChange.emit(this.value() === v ? null : v);
  }

  protected onRemove(e: MouseEvent, v: V): void {
    // Don't let the click bubble up and fire the chip's own select handler.
    e.stopPropagation();
    e.preventDefault();
    this.remove.emit(v);
  }

  protected onEdit(e: MouseEvent, v: V): void {
    e.stopPropagation();
    e.preventDefault();
    this.edit.emit(v);
  }

  protected chipClasses(selected: boolean): string {
    const base =
      'inline-flex items-center rounded-[3px] border px-3 py-1.5 ' +
      'text-[11px] font-semibold uppercase tracking-[0.12em] ' +
      'transition-colors duration-150';

    if (this.variant() === 'accent' && selected) {
      return base + ' border-primary-500 bg-primary-500 text-fg-strong';
    }

    // Selected presets show a green border so the user can scan at a glance
    // which options feed into the compiled prompt.
    return selected
      ? base + ' border-secondary-500 bg-ink-700 text-fg-strong'
      : base +
          ' border-ink-500 bg-ink-800 text-fg hover:border-fg-muted hover:text-fg-strong';
  }
}
