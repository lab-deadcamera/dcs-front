import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Footer strip:
 *   SEEDANCE STUDIO // v1.0 · Assets Library    The Electric Mind - We are Dead Camera Studios
 */
@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="flex items-center justify-between border-t border-ink-600 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted"
    >
      <p>
        {{ 'HEADER.BRAND.SEEDANCE_STUDIO' | translate }}
        <span class="mx-1 text-primary-500">//</span>
        {{ 'STUDIO.FOOTER.VERSION' | translate }}
        <span class="mx-1 text-fg-faint">·</span>
        {{ 'STUDIO.FOOTER.LIBRARY' | translate }}
      </p>
      <p>
        {{ 'STUDIO.FOOTER.TAGLINE' | translate }}
        <span class="mx-1 text-fg-faint">-</span>
        {{ 'STUDIO.FOOTER.STUDIO' | translate }}
      </p>
    </footer>
  `,
})
export class FooterComponent {}
