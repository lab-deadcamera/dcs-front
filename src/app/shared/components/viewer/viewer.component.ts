import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CornerFrameComponent } from '@shared/components/corner-frame/corner-frame.component';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 01 — VIEWER.
 *
 * Displays the active generated clip, or a "No clip loaded" placeholder
 * decorated with the four corner L-brackets and a tiny dot row.
 */
@Component({
  selector: 'app-viewer',
  imports: [SectionHeaderComponent, CornerFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-6 py-6">
      <ui-section-header
        number="01"
        label="VIEWER"
        hint="Final clip · evaluate quality, lip sync, sound, color"
      />

      <div
        class="relative mt-4 aspect-video w-full overflow-hidden bg-ink-900"
      >
        <ui-corner-frame position="top-left" />
        <ui-corner-frame position="top-right" />
        <ui-corner-frame position="bottom-left" />
        <ui-corner-frame position="bottom-right" />

        @if (prompt.activeClip(); as clip) {
          <video
            class="h-full w-full object-cover"
            [src]="clip.videoUrl"
            controls
          ></video>
        } @else {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            <!-- 4-dot status row, first red -->
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-red"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-fg-faint"></span>
            </div>
            <p class="font-script text-3xl text-fg-strong">No Clip Loaded</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              GENERATED OUTPUT APPEARS HERE
            </p>
          </div>
        }
      </div>
    </section>
  `,
})
export class ViewerComponent {
  protected readonly prompt = inject(PromptStateService);
}
