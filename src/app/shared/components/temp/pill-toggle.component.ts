import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

/**
 * Two-state pill toggle used for SOUND (OFF | ON) and ENGINE (FAST | PRO).
 *
 * Both labels are visible; the selected half is highlighted in brand red.
 *
 *   <ui-pill-toggle
 *     leftLabel="OFF"
 *     rightLabel="ON"
 *     [value]="output().sound ? 'right' : 'left'"
 *     (valueChange)="toggleSound($event)" />
 */
@Component({
  selector: 'ui-pill-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="group"
      class="inline-flex overflow-hidden rounded-[3px] border border-ink-500 bg-ink-800 font-mono text-[11px] tracking-[0.18em]"
    >
      <button
        type="button"
        [class]="halfClasses('left')"
        (click)="select('left')"
        [attr.aria-pressed]="value() === 'left'"
      >
        {{ leftLabel() }}
      </button>
      <button
        type="button"
        [class]="halfClasses('right')"
        (click)="select('right')"
        [attr.aria-pressed]="value() === 'right'"
      >
        {{ rightLabel() }}
      </button>
    </div>
  `,
})
export class PillToggleComponent {
  readonly leftLabel = input.required<string>();
  readonly rightLabel = input.required<string>();
  readonly value = input<'left' | 'right'>('left');
  /** Which side is "active accent" red. Default = the selected side. */
  readonly accentSide = input<'left' | 'right' | 'selected'>('selected');

  readonly valueChange = output<'left' | 'right'>();

  protected select(side: 'left' | 'right') {
    if (this.value() !== side) this.valueChange.emit(side);
  }

  protected halfClasses(side: 'left' | 'right') {
    const selected = this.value() === side;
    const accent = this.accentSide() === 'selected'
      ? selected
      : this.accentSide() === side;

    const base = 'px-3 py-1.5 font-bold uppercase transition-colors';

    if (selected && accent) {
      return base + ' bg-brand-red text-fg-strong';
    }
    if (selected) {
      return base + ' bg-ink-700 text-fg-strong';
    }
    return base + ' text-fg-muted hover:text-fg-strong';
  }
}
