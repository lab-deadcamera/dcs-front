import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HeroComponent } from '@shared/components/hero/hero.component';
import { ViewerComponent } from '@shared/components/viewer/viewer.component';
import { PromptBuilderComponent } from '@shared/components/prompt-builder/prompt-builder.component';
import { SessionReelComponent } from '@shared/components/session-reel/session-reel.component';
import { CinematographyComponent } from '@shared/components/cinematography/cinematography.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { RatingComponent } from '@shared/components/rating/rating.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * IndexStudio — composes the full Dead Camera / Seedance Studio shell.
 *
 * Layout:
 * - Mobile: single column.
 * - Desktop (lg+): two columns — inputs (assets / cinematography / output)
 *   on the left; preview / rating / prompt / generate on the right
 *   (sticky preview).
 * - The GENERATE action lives at the foot of the Prompt Builder section.
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
    RatingComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index-studio.html',
  styleUrl: './index-studio.css',
})
export class IndexStudio {
  protected readonly prompt = inject(PromptStateService);

  protected onGenerate(): void {
    const compiled = this.prompt.compiledPrompt();
    if (!compiled) return;
    // TODO follow-up PR: call SeedanceService.generate(...) and push the result.
    console.log('[Seedance] generate →', compiled, this.prompt.output());
  }
}
