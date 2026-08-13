import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StudioStore } from '@app/core/stores/studio.store';
import { CHECK_STAR_VALUES, displayRating, isChecksRating } from '@app/shared/utils';

/** One selectable rating affordance (a star, or a check mark in checks mode). */
interface RatingSlot {
  /** Star-equivalent value this slot sets when clicked (1-5). */
  value: number;
  /** Symbol rendered: '★' for stars, '✓' / '✓✓' for checks. */
  label: string;
}

/** Preset sizes for the rating buttons, mapped to Tailwind box/glyph classes. */
export type RatingSize = 'sm' | 'md' | 'lg' | 'xl';

const SLOT_SIZES: Record<RatingSize, { box: string; glyph: string }> = {
  sm: { box: 'h-4 w-4', glyph: 'text-[10px]' },
  md: { box: 'h-5 w-5', glyph: 'text-xs' },
  lg: { box: 'h-6 w-6', glyph: 'text-sm' },
  xl: { box: 'h-7 w-7', glyph: 'text-base' },
};

/**
 * Rating — compact strip shown between the Viewer and the Prompt Builder.
 * No title or header: the affordance itself is the control.
 *
 * Two display systems, selected per environment via `RATING_MODE`:
 *  - 'stars'  5 star buttons (identity 1-5).
 *  - 'checks' one check = 3 stars, double check = 5. Stored ratings are
 *             rounded for display (4→5, 2→3, 1→0) and a click on a check
 *             stores its star-equivalent value (3 or 5). Only the selected
 *             check is colored; the other stays unlit.
 *
 * The button size is controlled by the `size` input ('sm' | 'md' | 'lg').
 *
 * Disabled when there is no active clip.
 */
@Component({
  selector: 'app-rating',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .rating {
        border: solid 1px;
        border-radius: 4px;
        padding: 2px;
      }
    `,
  ],
  template: `
    <section class="px-6 py-3">
      <div class="flex items-center gap-0.5" role="radiogroup" [attr.aria-label]="ariaGroup()">
        @for (slot of slots(); track slot.value) {
          @let lit = isChecksRating() ? slot.value === effective() : slot.value <= effective();
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="display() === slot.value"
            [attr.aria-label]="ariaSlot(slot)"
            [disabled]="!hasClip()"
            class="rating flex items-center justify-center leading-none transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            [class]="sizeClasses().box"
            [class]="sizeClasses().glyph"
            [class.text-fg-faint]="!lit"
            [class.text-accent-500]="lit"
            (click)="set(slot.value)"
            (mouseenter)="hover.set(slot.value)"
            (mouseleave)="hover.set(0)"
          >
            {{ slot.label }}
          </button>
        }

        @if (rating() > 0 && hasClip()) {
          <button
            type="button"
            class="ml-2 text-[10px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-primary-500"
            (click)="set(0)"
          >
            {{ 'STUDIO.RATING.CLEAR' | translate }}
          </button>
        }

        @if (rating() > 0) {
          <span class="ml-auto font-mono text-[10px] text-fg-muted" aria-hidden="true">
            {{ display() }}/5
          </span>
        }
      </div>
    </section>
  `,
})
export class RatingComponent {
  private readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  /** Button size for stars and checks. */
  readonly size = input<RatingSize>('xl');

  protected readonly isChecksRating = isChecksRating;
  protected readonly hover = signal(0);

  protected readonly hasClip = computed(() => !!this.studio.activeClip());
  protected readonly rating = computed(() => this.studio.activeClip()?.rating ?? 0);
  /** Star-equivalent shown for the stored rating in the active mode
   *  (checks mode rounds 4→5, 2→3, 1→0). */
  protected readonly display = computed(() => displayRating(this.rating()));
  protected readonly effective = computed(() => this.hover() || this.display());
  protected readonly sizeClasses = computed(() => SLOT_SIZES[this.size()]);

  /** Affordances to render: 5 stars, or 2 checks (1 check = 3, double = 5). */
  protected readonly slots = computed<RatingSlot[]>(() => {
    if (!isChecksRating()) {
      return [1, 2, 3, 4, 5].map((n) => ({ value: n, label: '★' }));
    }
    return CHECK_STAR_VALUES.map((value, i) => ({
      value,
      label: '✓'.repeat(i + 1),
    }));
  });

  protected readonly ariaGroup = computed(() => this.i18n.instant('STUDIO.RATING.ARIA_GROUP'));

  protected ariaSlot(slot: RatingSlot): string {
    return this.i18n.instant('STUDIO.RATING.ARIA_STAR', { n: slot.value });
  }

  protected set(n: number): void {
    const clip = this.studio.activeClip();
    if (!clip) return;
    this.studio.setClipRating(clip.id, n);
  }
}
