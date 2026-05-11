import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/ui/section-header/section-header.component';
import { ToggleGroupComponent } from '../../shared/ui/toggle-group/toggle-group.component';
import { PillToggleComponent } from '../../shared/ui/pill-toggle/pill-toggle.component';
import { RangeSliderComponent } from '../../shared/ui/range-slider/range-slider.component';
import {
  AspectRatio,
  ChipOption,
  Engine,
  Resolution,
} from '../../core/models/studio.models';
import { PromptStateService } from '../../state/prompt.state';

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
  standalone: true,
  imports: [
    SectionHeaderComponent,
    ToggleGroupComponent,
    PillToggleComponent,
    RangeSliderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header number="04" label="OUTPUT FORMAT" />

      <div class="mt-5 flex flex-col gap-5">
        <ui-toggle-group
          label="ASPECT RATIO"
          variant="accent"
          [options]="aspectOptions"
          [value]="prompt.output().aspectRatio"
          (valueChange)="onAspect($event)"
        />

        <ui-toggle-group
          label="RESOLUTION"
          variant="accent"
          [options]="resolutionOptions"
          [value]="prompt.output().resolution"
          (valueChange)="onResolution($event)"
        />

        <div>
          <p class="mb-2 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
            DURATION
            <span class="font-mono text-fg-muted">{{ prompt.output().durationSeconds }}s</span>
          </p>
          <ui-range-slider
            ariaLabel="Duration in seconds"
            [min]="4"
            [max]="15"
            [step]="1"
            unit="s"
            [ticks]="[4, 8, 12, 15]"
            [value]="prompt.output().durationSeconds"
            (valueChange)="onDuration($event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
            SOUND
          </p>
          <ui-pill-toggle
            leftLabel="OFF"
            rightLabel="ON"
            accentSide="left"
            [value]="prompt.output().sound ? 'right' : 'left'"
            (valueChange)="onSound($event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
            ENGINE
          </p>
          <ui-pill-toggle
            leftLabel="FAST"
            rightLabel="PRO"
            accentSide="left"
            [value]="prompt.output().engine === 'fast' ? 'left' : 'right'"
            (valueChange)="onEngine($event)"
          />
        </div>
      </div>
    </section>
  `,
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
