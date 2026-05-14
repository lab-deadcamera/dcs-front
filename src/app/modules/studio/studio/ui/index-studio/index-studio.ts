import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HeroComponent } from '@shared/components/hero/hero.component';
import { ViewerComponent } from '@shared/components/viewer/viewer.component';
import { PromptBuilderComponent } from '@shared/components/prompt-builder/prompt-builder.component';
import { SessionReelComponent } from '@shared/components/session-reel/session-reel.component';
import { CinematographyComponent } from '@shared/components/cinematography/cinematography.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { RatingComponent } from '@shared/components/rating/rating.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { MAX_BATCH_COUNT, PromptStateService } from '@app/core/stores/prompt.state';
import { StudioStateService } from '@app/core/stores/studio.state';
import { ModelService } from '@app/services';

@Component({
  selector: 'app-index-studio',
  imports: [
    HeroComponent,
    ViewerComponent,
    PromptBuilderComponent,
    SessionReelComponent,
    CinematographyComponent,
    OutputFormatComponent,
    CharacterAssetsComponent,
    RatingComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index-studio.html',
  styleUrl: './index-studio.css',
})
export class IndexStudio implements OnInit, OnDestroy {
  protected readonly prompt = inject(PromptStateService);
  private readonly studioState = inject(StudioStateService);
  private readonly modelService = inject(ModelService);

  /** Active fake-progress timers, kept so they can be cleared on destroy. */
  private readonly activeTimers = new Set<ReturnType<typeof setInterval>>();

  ngOnInit(): void {
    this.modelService.getFavorite().subscribe((res) => {
      if (!res.error && res.data) {
        this.studioState.setModelCode(res.data);
      }
    });
  }

  /**
   * Dispatch one independent generation request per `batchCount`. Each
   * request gets its own pending-task entry so the viewer can render
   * individual progress rings; replacing the simulated tick with the
   * real Seedance polling response is the only wire-up needed once the
   * backend endpoint lands.
   */
  protected onGenerate(): void {
    const compiled = this.prompt.compiledPrompt();
    if (!compiled) return;
    const count = Math.max(1, Math.min(MAX_BATCH_COUNT, this.prompt.output().batchCount || 1));
    for (let i = 0; i < count; i++) {
      this.runOneGeneration(compiled, i + 1, count);
    }
  }

  /**
   * Kick off a single backend generation.
   *
   * TODO: replace the `setInterval` fake tick with the actual Seedance
   * call once the API service exists. The contract the rest of the UI
   * relies on is:
   *   1. `startGeneration(label)`     — when the request is queued
   *   2. `updateGenerationProgress`   — on every status-poll response
   *   3. `completeGeneration(id, clip)` or `failGeneration(id)` — at the end
   */
  private runOneGeneration(prompt: string, index: number, total: number): void {
    const label = total > 1 ? `${index}/${total}` : undefined;
    const id = this.prompt.startGeneration(label);
    console.log(`[Seedance] generate ${index}/${total} →`, prompt, this.prompt.output());

    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(100, progress + Math.floor(8 + Math.random() * 14));
      this.prompt.updateGenerationProgress(id, progress);
      if (progress >= 100) {
        clearInterval(tick);
        this.activeTimers.delete(tick);
        // No real clip available yet — leave the reel untouched. When the
        // backend is wired, pass the resolved GeneratedClip here so it
        // surfaces in the viewer and session reel automatically.
        this.prompt.completeGeneration(id);
      }
    }, 700 + index * 120);
    this.activeTimers.add(tick);
  }

  ngOnDestroy(): void {
    for (const t of this.activeTimers) clearInterval(t);
    this.activeTimers.clear();
  }
}
