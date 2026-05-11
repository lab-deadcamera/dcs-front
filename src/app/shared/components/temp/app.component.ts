import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HeaderComponent } from './features/header/header.component';
import { HeroComponent } from './features/hero/hero.component';
import { ViewerComponent } from './features/viewer/viewer.component';
import { PromptBuilderComponent } from './features/prompt-builder/prompt-builder.component';
import { SessionReelComponent } from './features/session-reel/session-reel.component';
import { CinematographyComponent } from './features/cinematography/cinematography.component';
import { OutputFormatComponent } from './features/output-format/output-format.component';
import { CharacterAssetsComponent } from './features/character-assets/character-assets.component';
import { FooterComponent } from './features/footer/footer.component';
import { PromptStateService } from './state/prompt.state';

/**
 * Root shell. Stacks the six numbered sections plus header / hero / footer.
 *
 * Centered max-width container; the original screenshot is a single column,
 * but a 2-column layout could be added later (viewer left, controls right)
 * by replacing the inner <div class="space-y-0"> with a grid.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    HeroComponent,
    ViewerComponent,
    PromptBuilderComponent,
    SessionReelComponent,
    CinematographyComponent,
    OutputFormatComponent,
    CharacterAssetsComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-ink-950">
      <app-header />

      <main class="mx-auto max-w-[1200px]">
        <app-hero />
        <app-viewer />
        <app-prompt-builder (generate)="onGenerate()" />
        <app-session-reel />
        <app-cinematography />
        <app-output-format />
        <app-character-assets />
      </main>

      <app-footer />
    </div>
  `,
})
export class AppComponent {
  private readonly prompt = inject(PromptStateService);

  /**
   * Stub generation handler. Wire this to your BytePlus/Seedance
   * service when ready — push the resulting clip via
   * `prompt.pushClip(...)` and it will appear in the viewer + reel.
   */
  protected onGenerate() {
    console.log('[Seedance] generate →', this.prompt.compiledPrompt());
    // Example after API success:
    // this.prompt.pushClip({
    //   id: crypto.randomUUID(),
    //   prompt: this.prompt.compiledPrompt(),
    //   videoUrl: response.videoUrl,
    //   thumbnailUrl: response.thumbnailUrl,
    //   createdAt: Date.now(),
    //   durationSeconds: this.prompt.output().durationSeconds,
    //   resolution: this.prompt.output().resolution,
    // });
  }
}
