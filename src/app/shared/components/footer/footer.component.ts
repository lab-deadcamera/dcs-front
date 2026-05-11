import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Footer strip:
 *   SEEDANCE STUDIO // V1.0 · ASSETS LIBRARY     THE ELECTRIC MIND · SOMOS DEAD CAMERA STUDIOS
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="flex items-center justify-between border-t border-ink-600 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted"
    >
      <p>
        SEEDANCE STUDIO
        <span class="mx-1 text-brand-red">//</span>
        V1.0
        <span class="mx-1 text-fg-faint">·</span>
        ASSETS LIBRARY
      </p>
      <p>
        THE ELECTRIC MIND
        <span class="mx-1 text-fg-faint">-</span>
        SOMOS DEAD CAMERA STUDIOS
      </p>
    </footer>
  `,
})
export class FooterComponent {}
