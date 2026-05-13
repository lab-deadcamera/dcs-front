import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * "SESSION REEL" — horizontal strip of generated clip thumbnails.
 * Empty state shows the placeholder text from the original design.
 */
@Component({
  selector: 'app-session-reel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-5">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2 w-2 rounded-full bg-primary-500"></span>
        <h3 class="text-[12px] font-bold uppercase tracking-[0.22em] text-fg-strong">
          {{ 'STUDIO.SESSION_REEL.TITLE' | translate }}
        </h3>
      </div>

      <div class="mt-3 border-t border-ink-600 pt-3">
        @if (prompt.sessionClips().length === 0) {
          <p class="mt-2 text-[12px] italic text-fg-muted">
            {{ 'STUDIO.SESSION_REEL.EMPTY' | translate }}
          </p>
        } @else {
          <div class="mt-3 flex gap-3 overflow-x-auto">
            @for (clip of prompt.sessionClips(); track clip.id) {
              <button
                type="button"
                class="relative h-20 w-32 flex-none overflow-hidden border transition-colors"
                [class.border-primary-500]="clip.id === prompt.activeClipId()"
                [class.border-ink-500]="clip.id !== prompt.activeClipId()"
                (click)="prompt.selectClip(clip.id)"
              >
                @if (clip.thumbnailUrl) {
                  <img
                    [src]="clip.thumbnailUrl"
                    [alt]="clip.prompt"
                    class="h-full w-full object-cover"
                  />
                } @else {
                  <span class="flex h-full w-full items-center justify-center bg-ink-800 font-mono text-[10px] text-fg-muted">
                    {{ clip.durationSeconds }}s
                  </span>
                }
              </button>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class SessionReelComponent {
  protected readonly prompt = inject(PromptStateService);
}
