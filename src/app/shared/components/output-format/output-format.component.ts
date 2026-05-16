import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import { PillToggleComponent } from '@shared/components/pill-toggle/pill-toggle.component';
import { RangeSliderComponent } from '@shared/components/range-slider/range-slider.component';
import { AspectRatio, ChipOption, Engine, Resolution } from '@core/interfaces/studio.models';
import { MAX_BATCH_COUNT } from '@core/interfaces/studio.models';
import { StudioStore } from '@app/core/stores/studio.store';
import { ModelService } from '@app/services';

@Component({
  selector: 'app-output-format',
  imports: [
    SectionHeaderComponent,
    ToggleGroupComponent,
    PillToggleComponent,
    RangeSliderComponent,
    FormsModule,
    SelectModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './output-format.html',
})
export class OutputFormatComponent implements OnInit {
  protected readonly studio = inject(StudioStore);
  private readonly modelService = inject(ModelService);

  protected readonly expanded = signal(false);

  protected readonly modelOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly modelsLoading = signal(false);

  /** ngModel value for the model selector — synced with prompt state. */
  protected modelValue: string | null = null;

  ngOnInit(): void {
    this.modelsLoading.set(true);
    this.modelService.getAllModels().subscribe((res) => {
      this.modelsLoading.set(false);
      if (!res.error && res.data) {
        this.modelOptions.set(
          res.data.filter((m) => m.active).map((m) => ({ label: m.name, value: m.name })),
        );
      }
    });
  }

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

  protected onModelChange(value: string | null): void {
    this.modelValue = value;
  }

  protected readonly minBatch = 1;
  protected readonly maxBatch = MAX_BATCH_COUNT;

  protected onBatchCount(delta: 1 | -1): void {
    const next = (this.studio.output().batchCount || 1) + delta;
    this.studio.patchOutput({ batchCount: next });
  }
}
