import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Decorative L-brackets that frame the viewer.
 * Pure presentational SVG — no logic.
 *
 * Usage:
 *   <ui-corner-frame position="top-left" />
 *   <ui-corner-frame position="bottom-right" color="var(--primary-500)" />
 */
@Component({
  selector: 'ui-corner-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      [class]="containerClasses()"
      aria-hidden="true"
    >
      <path
        [attr.d]="path()"
        [attr.stroke]="color()"
        stroke-width="1.5"
        fill="none"
      />
    </svg>
  `,
})
export class CornerFrameComponent {
  /** Which corner of the parent to anchor to. Parent must be `relative`. */
  readonly position = input<
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  >('top-left');

  readonly color = input<string>('var(--primary-500)');

  protected containerClasses() {
    const base = 'pointer-events-none absolute h-6 w-6';
    switch (this.position()) {
      case 'top-left':     return `${base} top-3 left-3`;
      case 'top-right':    return `${base} top-3 right-3 rotate-90`;
      case 'bottom-left':  return `${base} bottom-3 left-3 -rotate-90`;
      case 'bottom-right': return `${base} bottom-3 right-3 rotate-180`;
    }
  }

  /** Always draws a top-left L; rotation handles the rest. */
  protected path() {
    return 'M 2 12 L 2 2 L 12 2';
  }
}
