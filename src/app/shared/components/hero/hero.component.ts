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
    <section class="px-6 pt-10 pb-10 text-center">
      <h1
        class="font-display text-fg-strong uppercase italic leading-none tracking-[-0.01em] whitespace-nowrap"
        style="font-size: clamp(1.275rem, 3.3vw, 2.625rem);"
      >
        <span class="hero-strike text-fg-muted">
          {{ 'STUDIO.HERO.STRIKE_1' | translate }}
        </span>
        <span class="hero-strike ml-3 text-fg-muted">
          {{ 'STUDIO.HERO.STRIKE_2' | translate }}
        </span>
        <span
          class="font-script ml-3 inline-block -translate-y-1 rotate-[-6deg] text-brand-red normal-case not-italic"
          style="font-size: 1.15em; line-height: 1;"
        >
          {{ 'STUDIO.HERO.SCRIPT' | translate }}
        </span>
        <span class="ml-3">
          {{ 'STUDIO.HERO.LIVE' | translate }}
        </span>
      </h1>

      <div class="mt-5 flex items-center justify-center gap-3">
        <span aria-hidden="true" class="h-px w-10 bg-brand-red"></span>
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-fg italic">
          {{ 'STUDIO.HERO.SUBTITLE_TOP' | translate }}
        </p>
        <span aria-hidden="true" class="text-fg-faint">·</span>
        <p
          class="text-[11px] font-bold uppercase tracking-[0.22em]"
          style="color: var(--color-brand-green);"
        >
          {{ 'STUDIO.HERO.SUBTITLE_BOTTOM' | translate }}
        </p>
      </div>
    </section>
  `,
})
export class HeroComponent {}
