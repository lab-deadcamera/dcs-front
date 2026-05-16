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
import { StudioStore } from '@app/core/stores/studio.store';

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

        <!-- Download icon — saves the currently-active clip as an .mp4. -->
        <button
          type="button"
          class="absolute top-3 right-[5.25rem] z-10 flex h-6 w-6 items-center justify-center rounded-sm border border-ink-500 bg-ink-850/80 text-fg-strong backdrop-blur-sm transition-colors hover:border-primary-500 hover:text-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          [disabled]="!canDownload()"
          (click)="onDownload()"
          [attr.aria-label]="'STUDIO.VIEWER.DOWNLOAD' | translate"
          [attr.title]="'STUDIO.VIEWER.DOWNLOAD' | translate"
          data-testid="viewer-download"
        >
          <svg
            viewBox="0 0 16 16"
            class="h-3.5 w-3.5"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 2v9" />
            <path d="M4 7l4 4 4-4" />
            <path d="M2.5 13.5h11" />
          </svg>
        </button>

        <!-- Reuse-prompt icon — repopulates the editor from the active clip. -->
        <button
          type="button"
          class="absolute top-3 right-12 z-10 flex h-6 w-6 items-center justify-center rounded-sm border border-ink-500 bg-ink-850/80 text-fg-strong backdrop-blur-sm transition-colors hover:border-secondary-500 hover:text-secondary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          [disabled]="!studio.activeClip()"
          (click)="onReuse()"
          [attr.aria-label]="'STUDIO.VIEWER.REUSE_PROMPT' | translate"
          [attr.title]="'STUDIO.VIEWER.REUSE_PROMPT' | translate"
        >
          <svg
            viewBox="0 0 16 16"
            class="h-3.5 w-3.5"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 8a6 6 0 1 1-1.76-4.24" />
            <path d="M14 2v4h-4" />
          </svg>
        </button>

        <button
          type="button"
          class="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-sm border border-ink-500 bg-ink-850/80 text-fg-strong backdrop-blur-sm transition-colors hover:border-primary-500 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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

        @if (studio.activeClip(); as clip) {
          <video
            class="h-full w-full object-contain"
            [src]="clip.videoUrl"
            controls
          ></video>
        } @else if (!studio.isReady()) {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" class="h-8 w-8 text-fg-faint" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p class="text-lg font-light italic text-fg-strong">
              {{ 'STUDIO.VIEWER.NO_SCENE_TITLE' | translate }}
            </p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              {{ 'STUDIO.VIEWER.NO_SCENE_HINT' | translate }}
            </p>
          </div>
        } @else {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
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
          Progress overlay — surfaces every in-flight backend generation as
          a progress-N% ring so the user can see how far each request is
          and how many are still running. Sits on top of the video / empty
          state without dismissing them so a previously-active clip stays
          visible while a fresh batch is queued.
        -->
        @if (studio.isGenerating()) {
          <div
            class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink-950/75 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            data-testid="viewer-progress"
          >
            <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              {{
                'STUDIO.VIEWER.GENERATING_COUNT'
                  | translate: { n: studio.pendingGenerations().length }
              }}
            </p>
            <div class="flex flex-wrap items-center justify-center gap-4">
              @for (g of studio.pendingGenerations(); track g.id) {
                <div class="flex flex-col items-center gap-1">
                  <p class="font-mono text-3xl tabular-nums text-primary-500">
                    {{ g.progress }}<span class="text-base text-fg-muted">%</span>
                  </p>
                  <div class="h-1 w-24 overflow-hidden bg-ink-700">
                    <div
                      class="h-full bg-primary-500 transition-all duration-300"
                      [style.width.%]="g.progress"
                    ></div>
                  </div>
                  @if (g.label) {
                    <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                      {{ g.label }}
                    </p>
                  }
                </div>
              }
            </div>
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
          [class.border-primary-500]="isHd()"
          [class.bg-primary-500/90]="isHd()"
          [class.text-fg-strong]="isHd()"
          [class.border-accent-500]="hdPending() && !isHd()"
          [class.bg-ink-900/80]="!isHd()"
          [class.border-ink-500]="!isHd() && !hdPending()"
          [class.text-fg]="!isHd() && !hdPending()"
          [class.text-accent-500]="hdPending() && !isHd()"
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
  protected readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);
  protected readonly isFullscreen = signal(false);
  protected readonly hdPending = signal(false);
  private hdTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly box = viewChild<ElementRef<HTMLDivElement>>('box');

  protected readonly isHd = computed(
    () => this.studio.output().resolution === '1080p',
  );

  /** Disable the download icon when there's no playable clip URL. */
  protected readonly canDownload = computed(() => {
    const clip = this.studio.activeClip();
    return !!clip?.videoUrl;
  });

  protected onReuse(): void {
    const clip = this.studio.activeClip();
    if (!clip) return;
    this.studio.reuseClip(clip.id);
  }

  /**
   * Save the active clip's video to disk.
   *
   * Tries to `fetch` the file and trigger a blob-download so the browser
   * uses the canonical filename. Falls back to a plain anchor with the
   * `download` attribute when the response is opaque / CORS-blocked —
   * Chromium then opens the URL in a new tab and the user can save it
   * manually, which is still better than no affordance at all.
   */
  protected async onDownload(): Promise<void> {
    const clip = this.studio.activeClip();
    if (!clip?.videoUrl) return;
    const filename = this.studio.filenameForClip(clip);
    try {
      const res = await fetch(clip.videoUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    } catch {
      triggerDownload(clip.videoUrl, filename, '_blank');
    }
  }

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
      this.studio.patchOutput({ resolution: '720p' });
      return;
    }
    if (this.hdPending()) {
      this.cancelHdPending();
      this.studio.patchOutput({ resolution: '1080p' });
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

function triggerDownload(href: string, filename: string, target?: '_blank'): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  if (target) a.target = target;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
