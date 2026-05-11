import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 *  LIGHTS,̶  CAMERA,̶  Vision  ACTION
 *   REINVENTED CINEMA.
 *   ABSOLUTE CREATIVE CONTROL.
 *
 * "STRIKE_1" and "STRIKE_2" are visually struck through;
 * "SCRIPT" is the hand-script red overlay; "LIVE" is the active word.
 */
@Component({
  selector: 'app-hero',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 pt-10 pb-12">
      <h1
        class="font-display text-fg-strong leading-[0.9] uppercase italic"
        style="font-size: clamp(2.5rem, 6vw, 5.5rem);"
      >
        <span class="hero-strike">{{ 'STUDIO.HERO.STRIKE_1' | translate }}</span>
        <span class="hero-strike ml-2">{{ 'STUDIO.HERO.STRIKE_2' | translate }}</span>
        <span
          class="font-script ml-3 inline-block -translate-y-1 rotate-[-4deg] text-brand-red normal-case"
          style="font-style: normal; font-size: 0.9em;"
        >
          {{ 'STUDIO.HERO.SCRIPT' | translate }}
        </span>
        <span class="ml-3">{{ 'STUDIO.HERO.LIVE' | translate }}</span>
      </h1>

      <p class="mt-4 text-[13px] uppercase tracking-[0.18em] text-fg-muted italic">
        {{ 'STUDIO.HERO.SUBTITLE_TOP' | translate }}
      </p>
      <p
        class="text-[13px] uppercase tracking-[0.18em] font-bold"
        style="color: var(--color-brand-green);"
      >
        {{ 'STUDIO.HERO.SUBTITLE_BOTTOM' | translate }}
      </p>
    </section>
  `,
})
export class HeroComponent {}
