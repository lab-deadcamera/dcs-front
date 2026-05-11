import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import { PillToggleComponent } from '@shared/components/pill-toggle/pill-toggle.component';
import { RangeSliderComponent } from '@shared/components/range-slider/range-slider.component';
import {
  AspectRatio,
  ChipOption,
  Engine,
  Resolution,
} from '@core/interfaces/studio.models';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 04 — OUTPUT FORMAT.
 *
 *   ASPECT RATIO  ( 16:9 | 9:16 | 21:9 | 1:1 )    accent red
 *   RESOLUTION    ( 480p | 720p | 1080p )         accent red
 *   DURATION      slider 4s ── 15s
 *   SOUND         OFF | ON
 *   ENGINE        FAST | PRO
 */
@Component({
  selector: 'app-output-format',
  imports: [
    SectionHeaderComponent,
    ToggleGroupComponent,
    PillToggleComponent,
    RangeSliderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './output-format.html',
})
export class OutputFormatComponent {
  protected readonly prompt = inject(PromptStateService);

  protected readonly aspectOptions: ChipOption<AspectRatio>[] = [
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '21:9', label: '21:9' },
    { value: '1:1', label: '1:1' },
  ];

  protected readonly resolutionOptions: ChipOption<Resolution>[] = [
    { value: '480p', label: '480p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
  ];

  protected onAspect(v: AspectRatio | null) {
    if (v) this.prompt.patchOutput({ aspectRatio: v });
  }
  protected onResolution(v: Resolution | null) {
    if (v) this.prompt.patchOutput({ resolution: v });
  }
  protected onDuration(v: number) {
    this.prompt.patchOutput({ durationSeconds: v });
  }
  protected onSound(side: 'left' | 'right') {
    this.prompt.patchOutput({ sound: side === 'right' });
  }
  protected onEngine(side: 'left' | 'right') {
    const engine: Engine = side === 'left' ? 'fast' : 'pro';
    this.prompt.patchOutput({ engine });
  }
}
