import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import {
  CameraBody,
  CameraMotion,
  ChipOption,
  ColorGrading,
  Genre,
  Lens,
} from '@core/interfaces/studio.models';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Section 03 — CINEMATOGRAPHY.
 *
 * Five independent single-select chip groups. All selections feed
 * the compiled prompt computed signal in PromptStateService.
 */
@Component({
  selector: 'app-cinematography',
  imports: [SectionHeaderComponent, ToggleGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header number="03" labelKey="STUDIO.CINEMATOGRAPHY.TITLE" />

      <div class="mt-5 flex flex-col gap-5">
        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.LENS"
          [options]="lensOptions"
          [value]="prompt.cinematography().lens"
          (valueChange)="onLens($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_BODY"
          [options]="bodyOptions"
          [value]="prompt.cinematography().cameraBody"
          (valueChange)="onBody($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_MOTION"
          [options]="motionOptions"
          [value]="prompt.cinematography().cameraMotion"
          (valueChange)="onMotion($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.COLOR_GRADING"
          [options]="gradingOptions"
          [value]="prompt.cinematography().colorGrading"
          (valueChange)="onGrading($event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.GENRE"
          [options]="genreOptions"
          [value]="prompt.cinematography().genre"
          (valueChange)="onGenre($event)"
        />
      </div>
    </section>
  `,
})
export class CinematographyComponent {
  protected readonly prompt = inject(PromptStateService);

  protected readonly lensOptions: ChipOption<Lens>[] = [
    { value: '24mm-wide', labelKey: 'STUDIO.CINEMATOGRAPHY.LENSES.24MM_WIDE' },
    { value: '35mm-classic', labelKey: 'STUDIO.CINEMATOGRAPHY.LENSES.35MM_CLASSIC' },
    { value: '50mm-portrait', labelKey: 'STUDIO.CINEMATOGRAPHY.LENSES.50MM_PORTRAIT' },
    { value: '85mm-tele', labelKey: 'STUDIO.CINEMATOGRAPHY.LENSES.85MM_TELE' },
  ];

  protected readonly bodyOptions: ChipOption<CameraBody>[] = [
    { value: 'arri-alexa-65', labelKey: 'STUDIO.CINEMATOGRAPHY.BODIES.ARRI_ALEXA_65' },
    { value: 'red-komodo-6k', labelKey: 'STUDIO.CINEMATOGRAPHY.BODIES.RED_KOMODO_6K' },
    { value: 'sony-venice', labelKey: 'STUDIO.CINEMATOGRAPHY.BODIES.SONY_VENICE' },
    { value: '16mm-film', labelKey: 'STUDIO.CINEMATOGRAPHY.BODIES.FILM_16MM' },
  ];

  protected readonly motionOptions: ChipOption<CameraMotion>[] = [
    { value: 'static-lock-off', labelKey: 'STUDIO.CINEMATOGRAPHY.MOTIONS.STATIC' },
    { value: 'slow-dolly-in', labelKey: 'STUDIO.CINEMATOGRAPHY.MOTIONS.DOLLY_IN' },
    { value: 'orbit', labelKey: 'STUDIO.CINEMATOGRAPHY.MOTIONS.ORBIT' },
    { value: 'handheld', labelKey: 'STUDIO.CINEMATOGRAPHY.MOTIONS.HANDHELD' },
  ];

  protected readonly gradingOptions: ChipOption<ColorGrading>[] = [
    { value: 'blade-runner-2049', labelKey: 'STUDIO.CINEMATOGRAPHY.GRADES.BLADE_RUNNER' },
    { value: 'the-matrix', labelKey: 'STUDIO.CINEMATOGRAPHY.GRADES.MATRIX' },
    { value: 'gone-girl', labelKey: 'STUDIO.CINEMATOGRAPHY.GRADES.GONE_GIRL' },
    { value: 'interstellar', labelKey: 'STUDIO.CINEMATOGRAPHY.GRADES.INTERSTELLAR' },
  ];

  protected readonly genreOptions: ChipOption<Genre>[] = [
    { value: 'drama', labelKey: 'STUDIO.CINEMATOGRAPHY.GENRES.DRAMA' },
    { value: 'action', labelKey: 'STUDIO.CINEMATOGRAPHY.GENRES.ACTION' },
    { value: 'noir', labelKey: 'STUDIO.CINEMATOGRAPHY.GENRES.NOIR' },
    { value: 'horror', labelKey: 'STUDIO.CINEMATOGRAPHY.GENRES.HORROR' },
  ];

  protected onLens(v: Lens | null) { this.prompt.patchCinematography({ lens: v }); }
  protected onBody(v: CameraBody | null) { this.prompt.patchCinematography({ cameraBody: v }); }
  protected onMotion(v: CameraMotion | null) { this.prompt.patchCinematography({ cameraMotion: v }); }
  protected onGrading(v: ColorGrading | null) { this.prompt.patchCinematography({ colorGrading: v }); }
  protected onGenre(v: Genre | null) { this.prompt.patchCinematography({ genre: v }); }
}
