import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import { PillToggleComponent } from '@shared/components/pill-toggle/pill-toggle.component';
import { RangeSliderComponent } from '@shared/components/range-slider/range-slider.component';
import { AspectRatio, ChipOption, Engine, Resolution } from '@core/interfaces/studio.models';
import { StudioStore } from '@app/core/stores/studio.store';

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
  protected readonly studio = inject(StudioStore);

  protected readonly expanded = signal(false);

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected readonly aspectOptions: ChipOption<AspectRatio>[] = [
    { value: '16:9', labelKey: 'STUDIO.OUTPUT.ASPECT_16_9' },
    { value: '9:16', labelKey: 'STUDIO.OUTPUT.ASPECT_9_16' },
    { value: '21:9', labelKey: 'STUDIO.OUTPUT.ASPECT_21_9' },
  ];

  protected readonly resolutionOptions: ChipOption<Exclude<Resolution, '1080p'>>[] = [
    { value: '480p', labelKey: 'STUDIO.OUTPUT.RES_480P' },
    { value: '720p', labelKey: 'STUDIO.OUTPUT.RES_720P' },
  ];

  protected onAspect(v: AspectRatio | null) {
    if (v) this.studio.patchOutput({ aspectRatio: v });
  }

  protected onResolution(v: Resolution | null) {
    if (!v || v === '1080p') return;
    this.studio.patchOutput({ resolution: v });
  }

  protected onDuration(v: number) {
    this.studio.patchOutput({ durationSeconds: v });
  }
  protected onSound(side: 'left' | 'right') {
    this.studio.patchOutput({ sound: side === 'right' });
  }
  protected onEngine(side: 'left' | 'right') {
    const engine: Engine = side === 'left' ? 'fast' : 'pro';
    this.studio.patchOutput({ engine });
  }

  /** Effective duration bounds — from the selected model's config when set. */
  protected readonly minDuration = this.studio.minDuration;
  protected readonly maxDuration = this.studio.maxDuration;
  protected readonly durationTicks = computed(() => [
    this.studio.minDuration(),
    Math.round((this.studio.minDuration() + this.studio.maxDuration()) / 2),
    this.studio.maxDuration(),
  ]);

  protected readonly minBatch = this.studio.minBatchCount;
  protected readonly maxBatch = this.studio.maxBatchCount;

  protected onBatchCount(delta: 1 | -1): void {
    const next = (this.studio.output().batchCount || 1) + delta;
    this.studio.patchOutput({ batchCount: next });
  }
}
