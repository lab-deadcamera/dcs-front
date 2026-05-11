import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HeroComponent } from '@shared/components/hero/hero.component';
import { ViewerComponent } from '@shared/components/viewer/viewer.component';
import { PromptBuilderComponent } from '@shared/components/prompt-builder/prompt-builder.component';
import { SessionReelComponent } from '@shared/components/session-reel/session-reel.component';
import { CinematographyComponent } from '@shared/components/cinematography/cinematography.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * IndexStudio — composes the full Dead Camera / Seedance Studio shell.
 *
 * The header lives in PrivateLayout (shared across private routes),
 * so this page renders only hero + sections + reel + footer.
 */
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
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index-studio.html',
  styleUrl: './index-studio.css',
})
export class IndexStudio {
  private readonly prompt = inject(PromptStateService);

  protected onGenerate(): void {
    const compiled = this.prompt.compiledPrompt();
    if (!compiled) return;
    // TODO follow-up PR: call SeedanceService.generate(...) and push the result.
    console.log('[Seedance] generate →', compiled, this.prompt.output());
  }
}
