import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './output-format.html',
})
export class OutputFormatComponent {
  protected readonly prompt = inject(PromptStateService);

  protected readonly aspectOptions: ChipOption<AspectRatio>[] = [
    { value: '16:9', labelKey: 'STUDIO.OUTPUT.ASPECT_16_9' },
    { value: '9:16', labelKey: 'STUDIO.OUTPUT.ASPECT_9_16' },
    { value: '21:9', labelKey: 'STUDIO.OUTPUT.ASPECT_21_9' },
  ];

  /**
   * Resolution chips intentionally exclude 1080p — it has been moved to a
   * dedicated, two-click-confirm toggle in the viewer's bottom-right
   * corner to prevent accidental high-cost selections.
   */
  protected readonly resolutionOptions: ChipOption<Exclude<Resolution, '1080p'>>[] = [
    { value: '480p', labelKey: 'STUDIO.OUTPUT.RES_480P' },
    { value: '720p', labelKey: 'STUDIO.OUTPUT.RES_720P' },
  ];

  protected onAspect(v: AspectRatio | null) {
    if (v) this.prompt.patchOutput({ aspectRatio: v });
  }

  protected onResolution(v: Resolution | null) {
    if (!v || v === '1080p') return;
    this.prompt.patchOutput({ resolution: v });
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
