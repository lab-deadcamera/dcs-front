import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Take } from '@core/interfaces/session.models';

/**
 * Vertical column of small checkmarks rendered to the right of the viewer.
 *
 * Each take is a button with three visual states:
 *   · pending — empty box, dim border
 *   · current — empty box, accent border + glow (cursor sits here)
 *   · done    — filled box with a check
 *
 * Clicking toggles the take's status (see SessionStateService.toggleTake)
 * which also advances or rolls back the cursor. Keyboard activation is
 * handled by the native `<button>`; aria-checked communicates state to AT.
 */
@Component({
  selector: 'app-take-checklist',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center gap-1.5 px-2 py-6"
      role="group"
      [attr.aria-label]="ariaGroupLabel()"
    >
      <p
        class="mb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-fg-muted"
      >
        {{ scenePrefix() }}
      </p>
      @for (take of takes(); track take.index) {
        @let state = stateFor(take);
        <button
          type="button"
          role="checkbox"
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
          [attr.aria-checked]="take.status === 'done'"
          [attr.aria-label]="ariaFor(take, state)"
          [attr.title]="ariaFor(take, state)"
          [attr.data-testid]="'take-' + take.index"
          (click)="toggle.emit(take.index)"
        >
          @if (state === 'done') {
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
    </div>
  `,
})
export class TakeChecklistComponent {
  private readonly i18n = inject(TranslateService);

  readonly takes = input<readonly Take[]>([]);
  /** 0-based pointer into `takes`. */
  readonly currentIndex = input<number>(0);
  /** Optional short prefix shown above the column (e.g. scene code). */
  readonly scenePrefix = input<string>('');

  /** Emits the 1-based take number that the user clicked. */
  readonly toggle = output<number>();

  protected readonly ariaGroupLabel = computed(() =>
    this.i18n.instant('STUDIO.TAKE_CHECKLIST.TITLE'),
  );

  protected stateFor(take: Take): 'pending' | 'current' | 'done' {
    if (take.status === 'done') return 'done';
    const list = this.takes();
    const cursorIdx = this.currentIndex();
    if (list[cursorIdx]?.index === take.index) return 'current';
    return 'pending';
  }

  protected ariaFor(take: Take, state: 'pending' | 'current' | 'done'): string {
    const statusKey =
      state === 'done'
        ? 'STUDIO.TAKE_CHECKLIST.STATUS_DONE'
        : state === 'current'
          ? 'STUDIO.TAKE_CHECKLIST.STATUS_CURRENT'
          : 'STUDIO.TAKE_CHECKLIST.STATUS_PENDING';
    return this.i18n.instant('STUDIO.TAKE_CHECKLIST.TAKE_ARIA', {
      n: take.index,
      status: this.i18n.instant(statusKey),
    });
  }
}
