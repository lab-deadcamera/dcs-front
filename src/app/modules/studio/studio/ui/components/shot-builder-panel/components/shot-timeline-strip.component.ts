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
        <span>{{ flow().title }}</span>
        @if (flow().subtitle) {
          <span>{{ flow().subtitle }}</span>
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
            [style]="{ flex: seg.end - seg.start + ' 0 0', background: seg.color || '#5e7073' }"
            [attr.data-shot]="seg.shotId"
            [attr.aria-label]="'STUDIO.SHOT_BUILDER.TIMELINE_SEG_ARIA' | translate: { id: seg.id, duration: seg.end - seg.start }"
          >
            <span>{{ seg.id }}</span>
          </button>
        }
        @if (slackSeconds() > 0) {
          <div
            class="strip-slack"
            [style]="{ flex: slackSeconds() + ' 0 0' }"
            [title]="'STUDIO.SHOT_BUILDER.TIMELINE_SLACK_TITLE' | translate: { slack: slackSeconds() }"
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
      .strip-block {
        margin: 0 0 8px;
      }

      .strip-label {
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
        margin-bottom: 9px;
      }

      .strip {
        display: flex;
        width: 100%;
        height: 54px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        overflow: hidden;
        gap: 1px;
        background: #0a1011;
      }

      .seg {
        position: relative;
        border-right: 1px solid black;
        cursor: pointer;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 5px;
        transition: filter 0.18s ease;
        min-width: 0;
        border: none;
        color: rgba(12, 19, 21, 0.92);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
      }
      .seg:last-child {
        border-right: none;
      }
      .seg:hover,
      .seg.lit {
        filter: brightness(1.28) saturate(1.1);
        z-index: 2;
      }
      .seg.lit {
        outline: 1px solid var(--ink, #ece6d8);
      }
      .seg.spike::after {
        content: '';
        position: absolute;
        top: 5px;
        left: 50%;
        transform: translateX(-50%);
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 9px #fff;
      }

      .strip-slack {
        flex: 0 0 auto;
        background: repeating-linear-gradient(
          45deg,
          #0e1719,
          #0e1719 4px,
          #0a1011 4px,
          #0a1011 8px
        );
      }

      .strip-scale {
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink-faint, #6a7977);
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
