import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
        number="04"
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
            <p class="text-2xl font-light italic text-fg-strong">
              {{ 'STUDIO.VIEWER.EMPTY_TITLE' | translate }}
            </p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              {{ 'STUDIO.VIEWER.EMPTY_HINT' | translate }}
            </p>
          </div>
        }

        <!--
          HD (1080p) toggle anchored to the bottom-right corner of the
          viewer. Lives here (instead of in Output Format) so it sits next
          to the preview and uses a two-click confirm to prevent accidents.
        -->
        <button
          type="button"
          class="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm transition-colors focus:outline-none"
          [class.border-brand-red]="isHd()"
          [class.bg-brand-red/90]="isHd()"
          [class.text-fg-strong]="isHd()"
          [class.border-brand-yellow]="hdPending() && !isHd()"
          [class.bg-ink-900/80]="!isHd()"
          [class.border-ink-500]="!isHd() && !hdPending()"
          [class.text-fg]="!isHd() && !hdPending()"
          [class.text-brand-yellow]="hdPending() && !isHd()"
          [attr.aria-pressed]="isHd()"
          [attr.aria-label]="ariaHdLabel()"
          (click)="onHdClick()"
        >
          @if (isHd()) {
            <span aria-hidden="true">●</span>
          } @else {
            <span aria-hidden="true">★</span>
          }
          <span>1080p</span>
          @if (hdPending() && !isHd()) {
            <span class="font-mono normal-case tracking-normal italic">
              {{ 'STUDIO.OUTPUT.HD_CONFIRM' | translate }}
            </span>
          }
        </button>
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
export class ViewerComponent implements OnDestroy {
  protected readonly prompt = inject(PromptStateService);
  private readonly i18n = inject(TranslateService);
  protected readonly isFullscreen = signal(false);
  protected readonly hdPending = signal(false);
  private hdTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly box = viewChild<ElementRef<HTMLDivElement>>('box');

  protected readonly isHd = computed(
    () => this.prompt.output().resolution === '1080p',
  );

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

  /** Two-click confirm to flip 1080p on; a single click drops it back to 720p. */
  protected onHdClick(): void {
    if (this.isHd()) {
      this.cancelHdPending();
      this.prompt.patchOutput({ resolution: '720p' });
      return;
    }
    if (this.hdPending()) {
      this.cancelHdPending();
      this.prompt.patchOutput({ resolution: '1080p' });
      return;
    }
    this.hdPending.set(true);
    if (this.hdTimer) clearTimeout(this.hdTimer);
    this.hdTimer = setTimeout(() => this.hdPending.set(false), 3000);
  }

  protected ariaHdLabel(): string {
    const key = this.isHd()
      ? 'STUDIO.VIEWER.HD_ARIA_ON'
      : this.hdPending()
        ? 'STUDIO.VIEWER.HD_ARIA_PENDING'
        : 'STUDIO.VIEWER.HD_ARIA_OFF';
    return this.i18n.instant(key);
  }

  private cancelHdPending(): void {
    this.hdPending.set(false);
    if (this.hdTimer) {
      clearTimeout(this.hdTimer);
      this.hdTimer = null;
    }
  }

  ngOnDestroy(): void {
    if (this.hdTimer) clearTimeout(this.hdTimer);
  }
}
