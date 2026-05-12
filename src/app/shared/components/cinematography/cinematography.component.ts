import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Popover } from 'primeng/popover';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import {
  CameraBodyId,
  CameraMotionId,
  ChipOption,
  ColorGradingId,
  GenreId,
  LensId,
  Preset,
} from '@core/interfaces/studio.models';
import { PresetsService } from '@app/core/stores/presets.service';
import { PromptStateService } from '@app/core/stores/prompt.state';

/**
 * Pool of mood adjectives used to seed the random Color-Grading variants
 * inside each parent's Popover. Drawn once per parent at component init
 * so the names stay stable for the session.
 */
const MOOD_POOL = [
  'Neon', 'Phantom', 'Dusk', 'Rain', 'Smolder', 'Mist', 'Ivory', 'Ember',
  'Cobalt', 'Pyrite', 'Glow', 'Obsidian', 'Pale', 'Rust', 'Jade', 'Storm',
  'Husk', 'Grain', 'Bloom', 'Static', 'Vault', 'Echo', 'Mirror', 'Shade',
  'Frost', 'Velvet', 'Saffron', 'Pulse', 'Halo', 'Soot', 'Topaz', 'Drift',
] as const;

interface GradeVariant {
  /** Stable id for this variant within the session. */
  id: string;
  /** Display label (random mood word). */
  name: string;
}

/**
 * Section 02 — CINEMATOGRAPHY.
 *
 * Four single-select chip groups (lens / body / motion / genre) plus
 * the Color Grading row, which is special: each of the four parent
 * chips (TOKIO · COLOMBIA · OHIO · BANK) opens a Popover containing
 * four randomly-generated mood variants. Picking any variant selects
 * the parent grade and records the variant label.
 */
@Component({
  selector: 'app-cinematography',
  imports: [SectionHeaderComponent, ToggleGroupComponent, Popover, TranslatePipe],
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

        <!--
          Color grading row — each chip opens a Popover with 4 random
          mood variants instead of selecting immediately.
        -->
        <div>
          <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong">
            {{ 'STUDIO.CINEMATOGRAPHY.COLOR_GRADING' | translate }}
          </p>
          <div class="flex flex-wrap gap-2">
            @for (grade of gradeOptions(); track grade.id) {
              @let active = prompt.cinematography().colorGrading === grade.id;
              <div class="flex flex-col">
                <button
                  type="button"
                  [class]="chipClasses(active)"
                  [attr.aria-haspopup]="'menu'"
                  [attr.aria-expanded]="false"
                  (click)="pop.toggle($event)"
                >
                  @if (active) {
                    <span
                      class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-green align-middle"
                    ></span>
                  }
                  <span>{{ grade.labelKey | translate }}</span>
                  <span aria-hidden="true" class="ml-1.5 text-fg-muted">▾</span>
                </button>

                @if (active && selectedVariant()) {
                  <span
                    class="mt-1 self-start font-mono text-[10px] uppercase tracking-[0.18em] text-brand-green"
                  >
                    · {{ selectedVariant() }}
                  </span>
                }

                <p-popover #pop [dismissable]="true" appendTo="body">
                  <div class="min-w-[200px] bg-ink-900 p-3 text-fg">
                    <p
                      class="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-red"
                    >
                      {{ 'STUDIO.CINEMATOGRAPHY.GRADES.VARIANT_TITLE' | translate }}
                      <span class="ml-1 text-fg-muted">
                        · {{ grade.labelKey | translate }}
                      </span>
                    </p>
                    <div class="flex flex-col gap-1">
                      @for (v of variantsFor(grade.id); track v.id) {
                        <button
                          type="button"
                          class="flex w-full items-center justify-between border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-brand-green hover:text-fg-strong"
                          [class.border-brand-green]="active && selectedVariant() === v.name"
                          [class.text-fg-strong]="active && selectedVariant() === v.name"
                          (click)="onPickVariant(grade.id, v, pop)"
                        >
                          <span>{{ v.name }}</span>
                          @if (active && selectedVariant() === v.name) {
                            <span aria-hidden="true" class="text-brand-green">●</span>
                          }
                        </button>
                      }
                    </div>
                    <p class="mt-2 text-[10px] italic text-fg-muted">
                      {{
                        'STUDIO.CINEMATOGRAPHY.GRADES.VARIANT_HINT'
                          | translate: { name: grade.labelKey | translate }
                      }}
                    </p>
                  </div>
                </p-popover>
              </div>
            }
          </div>
        </div>

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

  /** Variants per parent grade, generated once and frozen for the session. */
  private readonly _variants: Record<ColorGradingId, GradeVariant[]>;

  /** Mood label currently selected for the active grade (or null). */
  protected readonly selectedVariant = signal<string | null>(null);

  constructor() {
    this._variants = {
      tokio: this.pickVariants('tokio', 4),
      colombia: this.pickVariants('colombia', 4),
      ohio: this.pickVariants('ohio', 4),
      bank: this.pickVariants('bank', 4),
    };
  }

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
  protected readonly gradeOptions = computed<Preset[]>(() =>
    this.presets.colorGrading(),
  );
  protected readonly genreOptions = computed<ChipOption<GenreId>[]>(() =>
    this.presets.genre().map((p) => ({
      value: p.id as GenreId,
      labelKey: p.labelKey,
    })),
  );

  protected variantsFor(parentId: string): GradeVariant[] {
    return this._variants[parentId as ColorGradingId] ?? [];
  }

  protected onLens(v: LensId | null) {
    this.prompt.patchCinematography({ lens: v });
  }
  protected onBody(v: CameraBodyId | null) {
    this.prompt.patchCinematography({ cameraBody: v });
  }
  protected onMotion(v: CameraMotionId | null) {
    this.prompt.patchCinematography({ cameraMotion: v });
  }
  protected onGenre(v: GenreId | null) {
    this.prompt.patchCinematography({ genre: v });
  }

  protected onPickVariant(
    parentId: string,
    variant: GradeVariant,
    pop: Popover,
  ) {
    this.prompt.patchCinematography({ colorGrading: parentId as ColorGradingId });
    this.selectedVariant.set(variant.name);
    pop.hide();
  }

  protected chipClasses(active: boolean): string {
    const base =
      'inline-flex items-center rounded-[3px] border px-3 py-1.5 ' +
      'text-[11px] font-semibold uppercase tracking-[0.12em] ' +
      'transition-colors duration-150 focus:outline-none';
    return active
      ? base + ' border-brand-green bg-ink-700 text-fg-strong'
      : base +
          ' border-ink-500 bg-ink-800 text-fg hover:border-fg-muted hover:text-fg-strong';
  }

  /** Pick `count` unique mood words from the pool — random per session. */
  private pickVariants(parentId: string, count: number): GradeVariant[] {
    const pool = [...MOOD_POOL];
    const out: GradeVariant[] = [];
    while (out.length < count && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      const [name] = pool.splice(i, 1);
      out.push({ id: `${parentId}_${name.toLowerCase()}`, name });
    }
    return out;
  }
}
