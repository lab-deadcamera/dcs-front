import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/ui/section-header/section-header.component';
import { ToggleGroupComponent } from '../../shared/ui/toggle-group/toggle-group.component';
import {
  CameraBody,
  CameraMotion,
  ChipOption,
  ColorGrading,
  Genre,
  Lens,
} from '../../core/models/studio.models';
import { PromptStateService } from '../../state/prompt.state';

/**
 * Section 03 — CINEMATOGRAPHY.
 *
 * Five independent single-select chip groups. All selections feed
 * the compiled prompt computed signal in PromptStateService.
 */
@Component({
  selector: 'app-cinematography',
  standalone: true,
  imports: [SectionHeaderComponent, ToggleGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header number="03" label="CINEMATOGRAPHY" />

      <div class="mt-5 flex flex-col gap-5">
        <ui-toggle-group
          label="LENS"
          [options]="lensOptions"
          [value]="prompt.cinematography().lens"
          (valueChange)="onLens($event)"
        />

        <ui-toggle-group
          label="CAMERA BODY"
          [options]="bodyOptions"
          [value]="prompt.cinematography().cameraBody"
          (valueChange)="onBody($event)"
        />

        <ui-toggle-group
          label="CAMERA MOTION"
          [options]="motionOptions"
          [value]="prompt.cinematography().cameraMotion"
          (valueChange)="onMotion($event)"
        />

        <ui-toggle-group
          label="COLOR GRADING"
          [options]="gradingOptions"
          [value]="prompt.cinematography().colorGrading"
          (valueChange)="onGrading($event)"
        />

        <ui-toggle-group
          label="GENRE"
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
    { value: '24mm-wide', label: '24mm Wide' },
    { value: '35mm-classic', label: '35mm Classic' },
    { value: '50mm-portrait', label: '50mm Portrait' },
    { value: '85mm-tele', label: '85mm Tele' },
  ];

  protected readonly bodyOptions: ChipOption<CameraBody>[] = [
    { value: 'arri-alexa-65', label: 'ARRI Alexa 65' },
    { value: 'red-komodo-6k', label: 'RED Komodo 6K' },
    { value: 'sony-venice', label: 'Sony Venice' },
    { value: '16mm-film', label: '16mm Film' },
  ];

  protected readonly motionOptions: ChipOption<CameraMotion>[] = [
    { value: 'static-lock-off', label: 'Static Lock-Off' },
    { value: 'slow-dolly-in', label: 'Slow Dolly-In' },
    { value: 'orbit', label: 'Orbit' },
    { value: 'handheld', label: 'Handheld' },
  ];

  protected readonly gradingOptions: ChipOption<ColorGrading>[] = [
    { value: 'blade-runner-2049', label: 'Blade Runner 2049' },
    { value: 'the-matrix', label: 'The Matrix' },
    { value: 'gone-girl', label: 'Gone Girl' },
    { value: 'interstellar', label: 'Interstellar' },
  ];

  protected readonly genreOptions: ChipOption<Genre>[] = [
    { value: 'drama', label: 'Drama' },
    { value: 'action', label: 'Action' },
    { value: 'noir', label: 'Noir' },
    { value: 'horror', label: 'Horror' },
  ];

  protected onLens(v: Lens | null) { this.prompt.patchCinematography({ lens: v }); }
  protected onBody(v: CameraBody | null) { this.prompt.patchCinematography({ cameraBody: v }); }
  protected onMotion(v: CameraMotion | null) { this.prompt.patchCinematography({ cameraMotion: v }); }
  protected onGrading(v: ColorGrading | null) { this.prompt.patchCinematography({ colorGrading: v }); }
  protected onGenre(v: Genre | null) { this.prompt.patchCinematography({ genre: v }); }
}
