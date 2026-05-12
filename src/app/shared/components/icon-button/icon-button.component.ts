import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/**
 * The bordered pill button used across the header:
 *   [👤 jander]   [🎬 SR · 20]   [📦 EXPORT (0)]   [🖥 API · no key]
 *
 * Each one has an icon glyph slot on the left, a label,
 * and optionally a colored badge on the right.
 *
 *   <ui-icon-button icon="👤" label="jander" iconColor="purple" />
 *   <ui-icon-button icon="🖥" label="API" badge="no key" badgeColor="red" />
 */
@Component({
  selector: 'ui-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="inline-flex items-center gap-2 border border-ink-500 bg-ink-850 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-fg-strong hover:border-fg-muted transition-colors"
      (click)="clicked.emit()"
    >
      @if (icon(); as i) {
        <span [class]="iconClasses()">{{ i }}</span>
      }
      <span [class]="labelClasses()">{{ label() }}</span>
      @if (badge(); as b) {
        <span [class]="badgeClasses()">{{ b }}</span>
      }
    </button>
  `,
})
export class IconButtonComponent {
  readonly icon = input<string | null>(null);
  readonly label = input.required<string>();
  readonly badge = input<string | null>(null);

  /** Icon tint — maps to brand color CSS vars. */
  readonly iconColor = input<'default' | 'purple' | 'red' | 'green' | 'yellow'>(
    'default',
  );
  readonly badgeColor = input<'default' | 'red' | 'green' | 'yellow'>('default');
  readonly labelColor = input<'default' | 'green' | 'red' | 'yellow'>('default');

  readonly clicked = output<void>();

  protected iconClasses() {
    const map: Record<string, string> = {
      default: 'text-fg',
      purple: 'text-[color:var(--color-brand-purple)]',
      red: 'text-primary-500',
      green: 'text-secondary-500',
      yellow: 'text-accent-500',
    };
    return 'text-sm ' + map[this.iconColor()];
  }

  protected labelClasses() {
    const map: Record<string, string> = {
      default: 'text-fg-strong',
      green: 'text-secondary-500',
      red: 'text-primary-500',
      yellow: 'text-accent-500',
    };
    return map[this.labelColor()];
  }

  protected badgeClasses() {
    const map: Record<string, string> = {
      default: 'text-fg-muted',
      red: 'text-primary-500 italic',
      green: 'text-secondary-500',
      yellow: 'text-accent-500',
    };
    return 'ml-1 font-normal normal-case tracking-normal ' + map[this.badgeColor()];
  }
}
