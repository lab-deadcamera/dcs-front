import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StudioStore } from '@app/core/stores/studio.store';

/**
 * Rating — compact 5-star strip shown between the Viewer and the Prompt
 * Builder. No title or header: the stars themselves are the affordance.
 * Disabled when there is no active clip.
 */
@Component({
  selector: 'app-rating',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 py-3">
      <div
        class="flex items-center gap-0.5"
        role="radiogroup"
        [attr.aria-label]="ariaGroup()"
      >
        @for (n of stars; track n) {
          @let lit = n <= effective();
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="rating() === n"
            [attr.aria-label]="ariaStar(n)"
            [disabled]="!hasClip()"
            class="flex h-5 w-5 items-center justify-center text-xs leading-none transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            [class.text-fg-faint]="!lit"
            [class.text-accent-500]="lit"
            (click)="set(n)"
            (mouseenter)="hover.set(n)"
            (mouseleave)="hover.set(0)"
          >
            ★
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
          <span
            class="ml-auto font-mono text-[10px] text-fg-muted"
            aria-hidden="true"
          >
            {{ rating() }}/5
          </span>
        }
      </div>
    </section>
  `,
})
export class RatingComponent {
  private readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  protected readonly stars = [1, 2, 3, 4, 5] as const;
  protected readonly hover = signal(0);

  protected readonly hasClip = computed(() => !!this.studio.activeClip());
  protected readonly rating = computed(
    () => this.studio.activeClip()?.rating ?? 0,
  );
  protected readonly effective = computed(
    () => this.hover() || this.rating(),
  );

  protected readonly ariaGroup = computed(() =>
    this.i18n.instant('STUDIO.RATING.ARIA_GROUP'),
  );

  protected ariaStar(n: number): string {
    return this.i18n.instant('STUDIO.RATING.ARIA_STAR', { n });
  }

  protected set(n: number): void {
    const clip = this.studio.activeClip();
    if (!clip) return;
    this.studio.setClipRating(clip.id, n);
  }
}
