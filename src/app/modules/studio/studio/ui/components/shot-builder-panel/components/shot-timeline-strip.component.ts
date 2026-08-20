import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SequenceFlow } from '@app/core/interfaces';

@Component({
  selector: 'app-shot-timeline-strip',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strip-block">
      <div class="strip-label">
        <span>{{ flow().title | translate }}</span>
        @if (flow().subtitle) {
          <span>{{ flow().subtitle | translate }}</span>
        }
      </div>

      <div
        class="strip"
        role="list"
        [attr.aria-label]="'STUDIO.SHOT_BUILDER.TIMELINE_ARIA' | translate"
        (click)="onStripClick($event)"
        (mouseenter)="onStripHover($event, true)"
        (mouseleave)="onStripHover($event, false)"
      >
        @for (seg of flow().segments; track seg.id) {
          <button
            class="seg"
            [class.spike]="seg.marker"
            [style]="{ flex: seg.end - seg.start + ' 0 0', color: seg.color || '#5e7073' }"
            [attr.data-shot]="seg.shotId"
            [attr.aria-label]="
              'STUDIO.SHOT_BUILDER.TIMELINE_SEG_ARIA'
                | translate: { id: seg.id, duration: seg.end - seg.start }
            "
          >
            <span class="mb-1.5">{{ seg.id }}</span>
            @if ((seg.cuts ?? 0) > 0) {
              <span
                class="seg-cuts"
                [title]="seg.cuts + ' ' + ('STUDIO.SHOT_BUILDER.CUTS' | translate)"
                >{{ '|'.repeat(seg.cuts ?? 0) }}</span
              >
            } @else {
              <span class="seg-cuts text-transparent!">|</span>
            }
          </button>
        }
        @if (slackSeconds() > 0) {
          <div
            class="strip-slack"
            [style]="{ flex: slackSeconds() + ' 0 0' }"
            [title]="
              'STUDIO.SHOT_BUILDER.TIMELINE_SLACK_TITLE' | translate: { slack: slackSeconds() }
            "
          ></div>
        }
      </div>

      <div class="strip-scale">
        @for (t of scaleLabels(); track t) {
          <span>{{ t }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        --void: #050505;
        --plate: #0d0d0d;
        --plate2: #121212;
        --line: #242200;
        --line2: #3a3800;
        --ink: #e8e8e0;
        --dim: #8a8a7a;
        --faint: #55554a;
        --hud: #00e0ff;
        --acid: #a6ff00;
        --gold: #fcee0a;
        --mono: 'Share Tech Mono', ui-monospace, Menlo, monospace;
        --tech: 'Chakra Petch', 'Share Tech Mono', ui-sans-serif, sans-serif;
        --sk: -11deg;
      }
      .strip-block {
        margin: 0 0 8px;
      }

      .strip-label {
        display: flex;
        justify-content: space-between;
        font-family: var(--tech);
        font-size: 10.5px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--faint);
        margin-bottom: 9px;
      }

      .strip {
        display: flex;
        width: 100%;
        height: 48px;
        gap: 3px;
        transform: skewX(var(--sk));
        padding: 0;
      }

      .seg {
        position: relative;
        border: none;
        border-top: 2px solid currentColor;
        cursor: pointer;
        min-width: 9px;
        background: var(--plate);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        padding-bottom: 4px;
        overflow: hidden;
        transition:
          filter 0.16s ease,
          transform 0.16s ease;
        font-family: var(--mono);
        font-size: 10px;
        letter-spacing: 0.04em;
        color: var(--ink);
      }
      .seg::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, currentColor, transparent 70%);
        opacity: 0.15;
        pointer-events: none;
      }
      .seg span {
        position: relative;
        z-index: 1;
        transform: skewX(calc(var(--sk) * -1));
        font-weight: 700;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        max-width: 100%;
      }
      .seg .seg-cuts {
        font-family: var(--tech);
        font-size: 7.5px;
        line-height: 1;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: currentColor;
      }
      .seg:last-child {
        border-right: none;
      }
      .seg:hover,
      .seg.lit {
        filter: brightness(1.3) saturate(1.1);
        transform: translateY(-3px);
        z-index: 2;
      }
      .seg:hover span,
      .seg.lit span {
        color: #fff;
      }
      .seg.lit {
        box-shadow: 0 0 0 1px var(--gold);
      }
      .seg.spike::after {
        content: '';
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 9px var(--gold);
        z-index: 2;
      }

      .strip-slack {
        flex: 0 0 auto;
        background: repeating-linear-gradient(
          45deg,
          #1a1810,
          #1a1810 4px,
          #0d0d0d 4px,
          #0d0d0d 8px
        );
      }

      .strip-scale {
        display: flex;
        justify-content: space-between;
        font-family: var(--tech);
        font-size: 10px;
        color: var(--faint);
        margin-top: 7px;
      }
    `,
  ],
})
export class ShotTimelineStripComponent {
  readonly flow = input.required<SequenceFlow>();
  readonly durationCap = input(80);

  readonly shotHighlight = output<string>();

  protected readonly slackSeconds = computed(() => {
    return Math.max(0, this.durationCap() - this.flow().duration);
  });

  protected readonly scaleLabels = computed(() => {
    const cap = this.durationCap();
    return [
      `0s`,
      `${Math.round(cap * 0.25)}s`,
      `${Math.round(cap * 0.5)}s`,
      `${Math.round(cap * 0.75)}s`,
      `${cap}s`,
    ];
  });

  protected onStripClick(event: MouseEvent): void {
    const btn = (event.target as HTMLElement).closest('.seg') as HTMLElement | null;
    if (!btn) return;
    const shotId = btn.getAttribute('data-shot');
    if (shotId) {
      this.shotHighlight.emit(shotId);
    }
  }

  protected onStripHover(event: MouseEvent, entering: boolean): void {
    const btn = (event.target as HTMLElement).closest('.seg') as HTMLElement | null;
    if (!btn) return;
    const shotId = btn.getAttribute('data-shot');
    if (!shotId) return;
    const el = document.getElementById('shot-' + shotId);
    if (el) {
      if (entering) {
        el.classList.add('lit');
      } else {
        el.classList.remove('lit');
      }
    }
  }
}
