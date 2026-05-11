import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 *  LIGHTS,̶  CAMERA,̶  Vision  ACTION
 *   REINVENTED CINEMA.
 *   ABSOLUTE CREATIVE CONTROL.
 *
 * "LIGHTS" and "CAMERA" are visually struck through;
 * "Vision" is the hand-script red overlay; "ACTION" is the live word.
 */
@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 pt-10 pb-12">
      <h1
        class="font-display text-fg-strong leading-[0.9] uppercase italic"
        style="font-size: clamp(2.5rem, 6vw, 5.5rem);"
      >
        <span class="hero-strike">LIGHTS,</span>
        <span class="hero-strike ml-2">CAMERA,</span>
        <span
          class="font-script ml-3 inline-block -translate-y-1 rotate-[-4deg] text-brand-red normal-case"
          style="font-style: normal; font-size: 0.9em;"
        >
          Vision
        </span>
        <span class="ml-3">ACTION</span>
      </h1>

      <p class="mt-4 text-[13px] uppercase tracking-[0.18em] text-fg-muted italic">
        REINVENTED CINEMA.
      </p>
      <p
        class="text-[13px] uppercase tracking-[0.18em] font-bold"
        style="color: var(--color-brand-green);"
      >
        ABSOLUTE CREATIVE CONTROL.
      </p>
    </section>
  `,
})
export class HeroComponent {}
