import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
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

  private static readonly ALL_ASPECTS: ChipOption<AspectRatio>[] = [
    { value: '16:9', labelKey: 'STUDIO.OUTPUT.ASPECT_16_9' },
    { value: '9:16', labelKey: 'STUDIO.OUTPUT.ASPECT_9_16' },
    { value: '21:9', labelKey: 'STUDIO.OUTPUT.ASPECT_21_9' },
    { value: '1:1', labelKey: 'STUDIO.OUTPUT.ASPECT_1_1' },
  ];

  private static readonly ALL_RESOLUTIONS: ChipOption<Resolution>[] = [
    { value: '480p', labelKey: 'STUDIO.OUTPUT.RES_480P' },
    { value: '720p', labelKey: 'STUDIO.OUTPUT.RES_720P' },
    { value: '1080p', labelKey: 'STUDIO.OUTPUT.RES_1080P' },
    { value: '1440p', labelKey: 'STUDIO.OUTPUT.RES_1440P' },
    { value: '2k', labelKey: 'STUDIO.OUTPUT.RES_2K' },
    { value: '4k', labelKey: 'STUDIO.OUTPUT.RES_4K' },
  ];

  /** Chips visible in the UI — narrowed to the selected model's declared set when configured. */
  protected readonly aspectOptions: Signal<ChipOption<AspectRatio>[]> = computed(() => {
    const allowed = this.studio.allowedAspectRatios();
    if (!allowed) return OutputFormatComponent.ALL_ASPECTS;
    return OutputFormatComponent.ALL_ASPECTS.filter((o) => allowed.includes(o.value));
  });

  protected readonly resolutionOptions: Signal<ChipOption<Resolution>[]> =
    computed(() => {
      const allowed = this.studio.allowedResolutions();
      if (!allowed) return OutputFormatComponent.ALL_RESOLUTIONS;
      return OutputFormatComponent.ALL_RESOLUTIONS.filter((o) => allowed.includes(o.value));
    });

  protected onAspect(v: AspectRatio | null) {
    if (v) this.studio.patchOutput({ aspectRatio: v });
  }

  protected onResolution(v: Resolution | null) {
    if (!v) return;
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
