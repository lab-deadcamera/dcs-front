import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Take } from '@core/interfaces/session.models';

/**
 * "CARRETE DE TOMAS" — horizontal strip of take thumbnails.
 *
 * Replaces the old SessionReel. Shows all active takes (one per number)
 * as clickable thumbnails. Discarded takes are grouped in an accordion
 * below, where the user can reactivate them.
 *
 * Clicking a take emits `(selectTake)` with the take's index. Clicking
 * the reactivate button on a discarded take emits `(toggleActive)` with
 * the take's DB id and index.
 */
@Component({
  selector: 'app-takes-reel',
  imports: [TranslatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-5">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2 w-2 rounded-full bg-primary-500"></span>
        <h3 class="text-[12px] font-bold uppercase tracking-[0.22em] text-fg-strong">
          {{ 'STUDIO.TAKES_REEL.TITLE' | translate }}
        </h3>
      </div>

      <div class="mt-3 border-t border-ink-600 pt-3">
        @if (takes().length === 0 && discardedTakes().length === 0) {
          <p class="mt-2 text-[12px] italic text-fg-muted">
            {{ 'STUDIO.TAKES_REEL.EMPTY' | translate }}
          </p>
        } @else {
          <!-- Active takes -->
          @if (takes().length > 0) {
            <div class="mt-3 flex gap-3 overflow-x-auto">
              @for (take of takes(); track take.index) {
                <button
                  type="button"
                  class="relative h-20 w-32 flex-none overflow-hidden border bg-ink-900 transition-colors"
                  [class.border-primary-500]="take.index === selectedTakeIndex()"
                  [class.border-ink-500]="take.index !== selectedTakeIndex()"
                  (click)="selectTake.emit(take.index)"
                >
                  @if (take.video_url) {
                    <video
                      [src]="posterUrl(take.video_url)"
                      preload="metadata"
                      muted
                      playsinline
                      class="pointer-events-none h-full w-full object-cover"
                    ></video>
                  } @else {
                    <div class="flex h-full w-full items-center justify-center bg-ink-800">
                      <span class="font-mono text-[24px] font-bold text-fg-muted">
                        {{ take.index }}
                      </span>
                    </div>
                  }
                  <!-- Take number badge -->
                  <span
                    class="pointer-events-none absolute bottom-1 left-1 rounded bg-ink-950/70 px-1.5 font-mono text-[10px] text-fg-strong"
                  >
                    T{{ take.index | number: '2.0' }}
                  </span>
                  <!-- Active indicator -->
                  <span
                    class="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full"
                    [class.bg-green-500]="take.index === selectedTakeIndex()"
                    [class.bg-ink-500]="take.index !== selectedTakeIndex()"
                  ></span>
                </button>
              }
            </div>
          }

          <!-- Discarded takes (accordion) -->
          @if (discardedTakes().length > 0) {
            <div class="mt-4 border border-ink-700">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:bg-ink-800"
                (click)="discardOpen.set(!discardOpen())"
              >
                <span>
                  {{ 'STUDIO.TAKES_REEL.DISCARDED' | translate }}
                  ({{ discardedTakes().length }})
                </span>
                <span>{{ discardOpen() ? '▾' : '▸' }}</span>
              </button>

              @if (discardOpen()) {
                <div class="border-t border-ink-700 p-3">
                  <div class="flex flex-wrap gap-2">
                    @for (take of discardedTakes(); track take.id) {
                      <div
                        class="flex items-center gap-2 border border-ink-600 bg-ink-900 px-2 py-1.5 opacity-70"
                      >
                        <span class="font-mono text-[11px] text-fg-muted">
                          T{{ take.index | number: '2.0' }}
                        </span>
                        @if (take.video_url) {
                          <video
                            [src]="posterUrl(take.video_url)"
                            preload="metadata"
                            muted
                            playsinline
                            class="h-8 w-12 object-cover"
                          ></video>
                        }
                        <button
                          type="button"
                          class="rounded border border-ink-500 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-secondary-400 transition-colors hover:border-secondary-500 hover:text-secondary-300"
                          (click)="toggleActive.emit({ takeId: take.id!, takeIndex: take.index })"
                        >
                          {{ 'STUDIO.TAKES_REEL.REACTIVATE' | translate }}
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class TakesReelComponent {
  /** Active (current generation) takes. */
  readonly takes = input<readonly Take[]>([]);
  /** Discarded (older generation) takes. */
  readonly discardedTakes = input<readonly Take[]>([]);
  /** Currently selected take index (1-based) for highlighting. */
  readonly selectedTakeIndex = input<number>(1);

  /** Emitted when the user clicks a take thumbnail. */
  readonly selectTake = output<number>();
  /** Emitted when the user clicks "reactivate" on a discarded take. */
  readonly toggleActive = output<{ takeId: string; takeIndex: number }>();

  /** Accordion open state for discarded section. */
  protected readonly discardOpen = signal(false);

  /**
   * Append `#t=0.1` to the video URL so the browser seeks to ~100ms and
   * paints that frame as the visible poster.
   */
  protected posterUrl(url: string): string {
    return url.includes('#') ? url : `${url}#t=0.1`;
  }
}
