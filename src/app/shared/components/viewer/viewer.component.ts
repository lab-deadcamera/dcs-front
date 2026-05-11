import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CornerFrameComponent } from '@shared/components/corner-frame/corner-frame.component';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 01 — VIEWER.
 *
 * Resizable horizontally (drag bottom-right). Height auto-tracks
 * width via `aspect-video` so the 16:9 ratio is locked.
 * A fullscreen toggle lives in the top-right corner; the video uses
 * `object-contain` so the 16:9 ratio is preserved (letterboxed if the
 * screen ratio differs).
 */
@Component({
  selector: 'app-viewer',
  imports: [SectionHeaderComponent, CornerFrameComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:fullscreenchange)': 'syncFullscreen()',
  },
  template: `
    <section class="px-6 py-6">
      <ui-section-header
        number="01"
        labelKey="STUDIO.VIEWER.TITLE"
        hintKey="STUDIO.VIEWER.HINT"
      />

      <div
        #box
        class="viewer-box relative mt-4 aspect-video w-full bg-ink-900"
      >
        <ui-corner-frame position="top-left" />
        <ui-corner-frame position="top-right" />
        <ui-corner-frame position="bottom-left" />
        <ui-corner-frame position="bottom-right" />

        <button
          type="button"
          class="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm border border-ink-500 bg-ink-850/80 text-fg-strong backdrop-blur-sm transition-colors hover:border-brand-red hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
          (click)="toggleFullscreen()"
          [attr.aria-label]="
            (isFullscreen()
              ? 'STUDIO.VIEWER.FULLSCREEN_EXIT'
              : 'STUDIO.VIEWER.FULLSCREEN_ENTER') | translate
          "
        >
          @if (isFullscreen()) {
            <svg
              viewBox="0 0 16 16"
              class="h-4 w-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
            </svg>
          } @else {
            <svg
              viewBox="0 0 16 16"
              class="h-4 w-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
            </svg>
          }
        </button>

        @if (prompt.activeClip(); as clip) {
          <video
            class="h-full w-full object-contain"
            [src]="clip.videoUrl"
            controls
          ></video>
        } @else {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-red"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
            </div>
            <p class="font-script text-3xl text-fg-strong">
              {{ 'STUDIO.VIEWER.EMPTY_TITLE' | translate }}
            </p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              {{ 'STUDIO.VIEWER.EMPTY_HINT' | translate }}
            </p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }

      .viewer-box {
        resize: horizontal;
        overflow: hidden;
        min-width: 320px;
        max-width: 100%;
      }

      .viewer-box:fullscreen {
        width: 100vw;
        height: 100vh;
        max-width: none;
        aspect-ratio: auto;
        resize: none;
        background: var(--color-ink-950);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .viewer-box::backdrop {
        background: var(--color-ink-950);
      }
    `,
  ],
})
export class ViewerComponent {
  protected readonly prompt = inject(PromptStateService);
  protected readonly isFullscreen = signal(false);
  private readonly box = viewChild<ElementRef<HTMLDivElement>>('box');

  protected async toggleFullscreen(): Promise<void> {
    const el = this.box()?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  }

  protected syncFullscreen(): void {
    this.isFullscreen.set(document.fullscreenElement === this.box()?.nativeElement);
  }
}
