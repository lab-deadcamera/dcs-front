import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Take } from '@core/interfaces/session.models';
import {
  isChecksRating,
  RESOLVE_URL,
  ratingSymbols,
  ratingToChecks,
} from '@app/shared/utils';
import { StudioStore } from '@app/core/stores/studio.store';
import { Tooltip } from 'primeng/tooltip';

/**
 * Vertical column of small checkmarks rendered to the right of the viewer.
 *
 * Each take is a button with three visual states:
 *   · pending — empty box, dim border
 *   · current — empty box, accent border + glow (cursor sits here)
 *   · done    — filled box with a check
 *
 * Clicking previews the take's video. In 'checks' rating mode (see
 * `RATING_MODE`), clicking also cycles the take's rating — one check →
 * two checks → cleared — and the button shows ✓ / ✓✓ for the rating.
 * Keyboard activation is handled by the native `<button>`;
 * aria-checked communicates state to AT.
 */
@Component({
  selector: 'app-take-checklist',
  imports: [Tooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative flex flex-col items-center gap-1.5 px-2 py-6"
      role="group"
      [attr.aria-label]="ariaGroupLabel()"
    >
      <p class="mb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-fg-muted">
        {{ scenePrefix() || '–––' }}
      </p>

      @if (locked()) {
        <!--
          Locked state: shows a static lock icon + tooltip text when the
          user hasn't selected a scene through the gate dialog yet.
        -->
        <div
          class="flex h-7 w-7 items-center justify-center rounded-sm border border-ink-700 bg-ink-900"
          [attr.title]="tooltipText()"
        >
          <svg
            viewBox="0 0 16 16"
            class="h-3.5 w-3.5 text-fg-muted"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3.5" y="7" width="9" height="7" rx="1" />
            <path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" />
          </svg>
        </div>
        <span
          class="mt-1 max-w-[3rem] text-center font-mono text-[7px] leading-tight text-fg-muted"
        >
          {{ tooltipText() }}
        </span>
      } @else {
        @for (take of takes(); track take.number) {
          @let state = stateFor(take);
          <button
            type="button"
            role="checkbox"
            pTooltip="{{ 'Take: ' + take.number }}"
            class="group flex h-7 w-7 items-center justify-center rounded-sm border text-[10px] font-mono tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            [class.border-ink-600]="state === 'pending'"
            [class.text-fg-muted]="state === 'pending'"
            [class.bg-ink-900]="state === 'pending'"
            [class.border-accent-500]="state === 'current'"
            [class.text-accent-500]="state === 'current'"
            [class.bg-ink-900]="state === 'current'"
            [class.border-primary-500]="state === 'done'"
            [class.bg-primary-500]="state === 'done'"
            [class.text-ink-950]="state === 'done'"
            [class.border-green-500]="state === 'confirmed'"
            [class.bg-green-700]="state === 'confirmed'"
            [class.text-white]="state === 'confirmed'"
            [attr.aria-checked]="ariaChecked(take)"
            [attr.data-testid]="'take-' + take.index"
            (click)="onClick(take)"
          >
            @if (isChecksRating()) {
              @let checks = ratingSymbols(take.rating ?? 0);
              @if (checks) {
                {{ checks }}
              } @else {
                {{ take.index }}
              }
            } @else if (state === 'done' || state === 'confirmed') {
              <svg
                viewBox="0 0 16 16"
                class="h-3.5 w-3.5"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 8.5l3.5 3.5L13 4.5" />
              </svg>
            } @else {
              {{ take.index }}
            }
          </button>
        }
      }
    </div>
  `,
})
export class TakeChecklistComponent {
  private readonly i18n = inject(TranslateService);
  protected readonly studio = inject(StudioStore);

  readonly takes = input<readonly Take[]>([]);

  /** 0-based pointer into `takes`. */
  readonly currentIndex = input<number>(0);
  /** Optional short prefix shown above the column (e.g. scene code). */
  readonly scenePrefix = input<string>('');
  /** When true, the checklist is locked — shows a tooltip instead of toggles. */
  readonly locked = input(false);

  /** Emits the 1-based take number that the user clicked. */
  readonly toggle = output<number>();

  protected readonly ariaGroupLabel = computed(() =>
    this.i18n.instant('STUDIO.TAKE_CHECKLIST.TITLE'),
  );

  protected readonly tooltipText = computed(() =>
    this.i18n.instant('STUDIO.TAKE_CHECKLIST.LOCKED_TOOLTIP'),
  );

  protected readonly isChecksRating = isChecksRating;
  protected readonly ratingSymbols = ratingSymbols;

  protected stateFor(take: Take): 'pending' | 'current' | 'done' | 'confirmed' {
    if (take.status === 'confirmed') return 'confirmed';
    if (take.status === 'done') return 'done';
    const list = this.takes();
    const cursorIdx = this.currentIndex();
    if (list[cursorIdx]?.index === take.index) return 'current';
    return 'pending';
  }

  /** Number of check marks shown for a take's rating in checks mode. */
  protected checksFor(take: Take): number {
    return ratingToChecks(take.rating ?? 0);
  }

  protected ariaChecked(take: Take): boolean {
    if (isChecksRating()) return this.checksFor(take) > 0;
    return take.status === 'done' || take.status === 'confirmed';
  }

  onClick(take: Take): void {
    this.studio.setImagePreview(RESOLVE_URL(take.video_url) ?? '');
    if (!isChecksRating()) return;
    // Cycle the rating in checks mode: 0 → 1 check (3★) → 2 checks (5★) → 0.
    const checks = this.checksFor(take);
    const next = checks === 0 ? 3 : checks === 1 ? 5 : 0;
    this.studio.setTakeRating(take.index, next);
  }
}
