import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Hero — poster-style two-line headline:
 *
 *   LIGHTS,  CAMERA,  ⟨Vision⟩
 *   ACTION
 *
 * "STRIKE_1" / "STRIKE_2" are struck through, "SCRIPT" (Vision) is the
 * hand-script red word rotated over the baseline, "LIVE" (Action) is
 * the impact word — sized largest to anchor the hierarchy.
 */
@Component({
  selector: 'app-hero',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 pt-12 pb-14">
      <h1
        class="font-display text-fg-strong uppercase italic leading-[0.82] tracking-[-0.01em]"
        style="font-size: clamp(1rem, 3vw, 2.5rem);"
      >
        <span class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span class="hero-strike text-fg-muted">
            {{ 'STUDIO.HERO.STRIKE_1' | translate }}
          </span>
          <span class="hero-strike text-fg-muted">
            {{ 'STUDIO.HERO.STRIKE_2' | translate }}
          </span>
          <span
            class="font-script inline-block -translate-y-2 rotate-[-6deg] text-brand-red normal-case not-italic"
            style="font-size: 1.1em; line-height: 1;"
          >
            {{ 'STUDIO.HERO.SCRIPT' | translate }}
          </span>
        </span>
        <span
          class="mt-2 block text-fg-strong"
          style="font-size: 1.45em; letter-spacing: -0.02em;"
        >
          {{ 'STUDIO.HERO.LIVE' | translate }}
        </span>
      </h1>

      <div class="mt-6 flex items-center gap-3">
        <span aria-hidden="true" class="h-px w-12 bg-brand-red"></span>
        <p class="text-[12px] font-bold uppercase tracking-[0.22em] text-fg italic">
          {{ 'STUDIO.HERO.SUBTITLE_TOP' | translate }}
        </p>
      </div>
      <p
        class="ml-15 text-[12px] font-bold uppercase tracking-[0.22em]"
        style="color: var(--color-brand-green); margin-left: 3.75rem;"
      >
        {{ 'STUDIO.HERO.SUBTITLE_BOTTOM' | translate }}
      </p>
    </section>
  `,
})
export class HeroComponent {}
