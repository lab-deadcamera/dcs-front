import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import {
  CameraBodyId,
  CameraMotionId,
  ChipOption,
  ColorGradingId,
  GenreId,
  LensId,
} from '@core/interfaces/studio.models';
import { PresetsService } from '@app/core/stores/presets.service';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 03 — CINEMATOGRAPHY.
 *
 * Five single-select chip groups. Options come from PresetsService
 * (loaded from /assets/presets.json, the v0 catalog). Each selection
 * patches PromptStateService.cinematography, which feeds the compiled
 * prompt computed.
 */
@Component({
  selector: 'app-cinematography',
  imports: [SectionHeaderComponent, ToggleGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header number="02" labelKey="STUDIO.CINEMATOGRAPHY.TITLE" />

      <div class="mt-5 flex flex-col gap-5">
        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.LENS"
          [options]="lensOptions()"
          [value]="prompt.cinematography().lens"
          (valueChange)="onLens($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_BODY"
          [options]="bodyOptions()"
          [value]="prompt.cinematography().cameraBody"
          (valueChange)="onBody($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_MOTION"
          [options]="motionOptions()"
          [value]="prompt.cinematography().cameraMotion"
          (valueChange)="onMotion($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.COLOR_GRADING"
          [options]="gradingOptions()"
          [value]="prompt.cinematography().colorGrading"
          (valueChange)="onGrading($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.GENRE"
          [options]="genreOptions()"
          [value]="prompt.cinematography().genre"
          (valueChange)="onGenre($event)"
        />
      </div>
    </section>
  `,
})
export class CinematographyComponent {
  protected readonly prompt = inject(PromptStateService);
  private readonly presets = inject(PresetsService);

  protected readonly lensOptions = computed<ChipOption<LensId>[]>(() =>
    this.presets.lens().map((p) => ({
      value: p.id as LensId,
      labelKey: p.labelKey,
    })),
  );
  protected readonly bodyOptions = computed<ChipOption<CameraBodyId>[]>(() =>
    this.presets.camera().map((p) => ({
      value: p.id as CameraBodyId,
      labelKey: p.labelKey,
    })),
  );
  protected readonly motionOptions = computed<ChipOption<CameraMotionId>[]>(() =>
    this.presets.cameraMotion().map((p) => ({
      value: p.id as CameraMotionId,
      labelKey: p.labelKey,
    })),
  );
  protected readonly gradingOptions = computed<ChipOption<ColorGradingId>[]>(() =>
    this.presets.colorGrading().map((p) => ({
      value: p.id as ColorGradingId,
      labelKey: p.labelKey,
    })),
  );
  protected readonly genreOptions = computed<ChipOption<GenreId>[]>(() =>
    this.presets.genre().map((p) => ({
      value: p.id as GenreId,
      labelKey: p.labelKey,
    })),
  );

  protected onLens(v: LensId | null) {
    this.prompt.patchCinematography({ lens: v });
  }
  protected onBody(v: CameraBodyId | null) {
    this.prompt.patchCinematography({ cameraBody: v });
  }
  protected onMotion(v: CameraMotionId | null) {
    this.prompt.patchCinematography({ cameraMotion: v });
  }
  protected onGrading(v: ColorGradingId | null) {
    this.prompt.patchCinematography({ colorGrading: v });
  }
  protected onGenre(v: GenreId | null) {
    this.prompt.patchCinematography({ genre: v });
  }
}
