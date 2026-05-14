import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
export class IndexStudio implements OnInit {
  protected readonly prompt = inject(PromptStateService);
  private readonly studioState = inject(StudioStateService);
  private readonly modelService = inject(ModelService);

  ngOnInit(): void {
    this.modelService.getFavorite().subscribe((res) => {
      if (!res.error && res.data) {
        this.studioState.setModelCode(res.data);
      }
    });
  }

  protected onGenerate(): void {
    const compiled = this.prompt.compiledPrompt();
    if (!compiled) return;
    console.log('[Seedance] generate →', compiled, this.prompt.output());
  }
}
