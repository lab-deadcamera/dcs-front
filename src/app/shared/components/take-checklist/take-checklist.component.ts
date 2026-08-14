import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, output } from '@angular/core';
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

/** Ventana (ms) para distinguir un clic simple de un doble clic en el rating. */
const DOUBLE_CLICK_DELAY = 300;

/**
 * Vertical column of small checkmarks rendered to the right of the viewer.
 *
 * Each take is a button with three visual states:
 *   · pending — empty box, dim border
 *   · current — empty box, accent border + glow (cursor sits here)
 *   · done    — filled box with a check
 *
 * Clicking selects the take and previews its video in the viewer. In
 * 'checks' rating mode (see `RATING_MODE`), a single click also cycles the
 * take's rating — one check → two checks → cleared — but only when the
 * clicked take is the one already in the viewer; a double-click cycles the
 * rating of any take. The button shows ✓ / ✓✓ for the rating.
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
            (dblclick)="onDoubleClick(take)"
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
export class TakeChecklistComponent implements OnDestroy {
  private readonly i18n = inject(TranslateService);
  protected readonly studio = inject(StudioStore);

  /** Pending single-click rating timer; cleared when a double-click follows. */
  private clickTimer: ReturnType<typeof setTimeout> | null = null;

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
    // Clic simple: selecciona la toma y carga su video en el visor.
    this.loadTakeVideo(take);

    if (!isChecksRating()) return;

    // Rating: un clic simple solo califica la toma que ya está en el visor.
    // Se usa un timer corto para distinguirlo del doble clic (que califica
    // cualquier toma). En un doble clic, el segundo click limpia el timer del
    // primero y onDoubleClick califica una sola vez.
    const wasCurrent = this.isCurrentTake(take);
    this.clearRatingTimer();
    this.clickTimer = setTimeout(() => {
      this.clickTimer = null;
      if (wasCurrent) this.cycleRating(take);
    }, DOUBLE_CLICK_DELAY);
  }

  /** Doble clic: califica cualquier toma (modo checks), sin importar cuál esté en el visor. */
  onDoubleClick(take: Take): void {
    this.clearRatingTimer();
    if (!isChecksRating()) return;
    this.cycleRating(take);
  }

  /** Carga el video de una toma en el visor (mismo patrón que onSelectTake en index-studio). */
  private loadTakeVideo(take: Take): void {
    this.studio.selectTake(take.index);
    const video = take.video_local_url || take.video_url;
    this.studio.setImagePreview(video ? RESOLVE_URL(video) : '');
    if (!video) return;
    this.studio.pushClip({
      id: crypto.randomUUID(),
      prompt: '',
      videoLocalUrl: video,
      createdAt: Date.now(),
      durationSeconds: 5,
      resolution: '480p',
      takeIndex: take.index,
      rating: take.rating,
    });
  }

  /** True si la toma es la que el visor muestra actualmente (antes de seleccionarla). */
  private isCurrentTake(take: Take): boolean {
    const list = this.takes();
    return list[this.currentIndex()]?.index === take.index;
  }

  /** Cicla el rating en modo checks: 0 → 1 check (3★) → 2 checks (5★) → 0. */
  private cycleRating(take: Take): void {
    const checks = this.checksFor(take);
    const next = checks === 0 ? 3 : checks === 1 ? 5 : 0;
    this.studio.setTakeRating(take.index, next);
  }

  private clearRatingTimer(): void {
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearRatingTimer();
  }
}
