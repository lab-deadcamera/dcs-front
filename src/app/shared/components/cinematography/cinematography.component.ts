import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { ToggleGroupComponent } from '@shared/components/toggle-group/toggle-group.component';
import { CustomPresetDialogComponent } from '@shared/components/cinematography/custom-preset-dialog.component';
import {
  CameraBodyId,
  CameraMotionId,
  ChipOption,
  ColorGradingId,
  GenreId,
  LensId,
  Preset,
  PresetCategory,
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
  imports: [
    SectionHeaderComponent,
    ToggleGroupComponent,
    Popover,
    TranslatePipe,
    ButtonModule,
    CustomPresetDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header
        number="02"
        labelKey="STUDIO.CINEMATOGRAPHY.TITLE"
        [collapsible]="true"
        [expanded]="expanded()"
        (toggle)="toggleExpanded()"
      />

      @if (expanded()) {
      <div class="mt-5 flex flex-col gap-5">
        <!--
          Admin-only action: open the custom-preset wizard. Permission
          gating will hide this button for non-admin users in a follow-up.
        -->
        <div class="flex justify-end">
          <p-button
            icon="pi pi-plus"
            severity="secondary"
            [text]="true"
            size="small"
            [label]="'STUDIO.CINEMATOGRAPHY.CUSTOM.NEW_BUTTON' | translate"
            data-testid="cinematography-new-preset"
            (onClick)="openCustomDialog()"
          />
        </div>

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.LENS"
          [options]="lensOptions()"
          [value]="prompt.cinematography().lens"
          (valueChange)="onLens($event)"
          (remove)="onRemoveCustom('lens', $event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_BODY"
          [options]="bodyOptions()"
          [value]="prompt.cinematography().cameraBody"
          (valueChange)="onBody($event)"
          (remove)="onRemoveCustom('camera', $event)"
        />

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.CAMERA_MOTION"
          [options]="motionOptions()"
          [value]="prompt.cinematography().cameraMotion"
          (valueChange)="onMotion($event)"
          (remove)="onRemoveCustom('cameraMotion', $event)"
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

              @if (grade.isCustom) {
                <!--
                  Admin-added grades render as plain chips — no popover,
                  no variants. Click selects directly; the × on hover
                  removes the preset from the catalog.
                -->
                <button
                  type="button"
                  [class]="chipClasses(active)"
                  (click)="onPickCustomGrade(grade.id)"
                >
                  @if (active) {
                    <span
                      class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-secondary-500 align-middle"
                    ></span>
                  }
                  <span class="whitespace-nowrap">{{ grade.label }}</span>
                  <span
                    role="button"
                    tabindex="-1"
                    class="ml-2 inline-block leading-none text-fg-muted transition-colors hover:text-primary-500"
                    [attr.aria-label]="'COMMON.DELETE' | translate"
                    (click)="onRemoveGrade($event, grade.id)"
                  >×</span>
                </button>
              } @else {
                <!--
                  Curated grades (TOKIO/COLOMBIA/OHIO/BANK) keep their
                  Popover with 4 random mood variants — same UX as before.
                -->
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
                        class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-secondary-500 align-middle"
                      ></span>
                    }
                    <span class="whitespace-nowrap">{{ grade.labelKey | translate }}</span>
                    <span aria-hidden="true" class="ml-1.5 text-fg-muted">▾</span>
                  </button>

                  @if (active && selectedVariant()) {
                    <span
                      class="mt-1 self-start font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-500"
                    >
                      · {{ selectedVariant() }}
                    </span>
                  }

                  <p-popover #pop [dismissable]="true" appendTo="body">
                    <div class="min-w-[200px] bg-ink-900 p-3 text-fg">
                      <p
                        class="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-500"
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
                            class="flex w-full items-center justify-between border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-secondary-500 hover:text-fg-strong"
                            [class.border-secondary-500]="active && selectedVariant() === v.name"
                            [class.text-fg-strong]="active && selectedVariant() === v.name"
                            (click)="onPickVariant(grade.id, v, pop)"
                          >
                            <span>{{ v.name }}</span>
                            @if (active && selectedVariant() === v.name) {
                              <span aria-hidden="true" class="text-secondary-500">●</span>
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
            }
          </div>
        </div>

        <ui-toggle-group
          labelKey="STUDIO.CINEMATOGRAPHY.GENRE"
          [options]="genreOptions()"
          [value]="prompt.cinematography().genre"
          (valueChange)="onGenre($event)"
          (remove)="onRemoveCustom('genre', $event)"
        />
      </div>
      }

      @if (customDialogVisible()) {
        <app-custom-preset-dialog
          [visible]="customDialogVisible()"
          (visibleChange)="customDialogVisible.set($event)"
        />
      }
    </section>
  `,
})
export class CinematographyComponent {
  protected readonly prompt = inject(PromptStateService);
  private readonly presets = inject(PresetsService);

  /**
   * Variants per parent grade, generated once and frozen for the session.
   * Map (vs Record) because admin-added custom grades have arbitrary ids
   * outside the original closed union — but only the curated 4 actually
   * use variants; customs render as plain chips with no popover.
   */
  private readonly _variants = new Map<string, GradeVariant[]>();

  /** Mood label currently selected for the active grade (or null). */
  protected readonly selectedVariant = signal<string | null>(null);

  /** Disclosure state — section body is hidden until the user expands it. */
  protected readonly expanded = signal(false);

  /** Visibility of the admin custom-preset wizard. */
  protected readonly customDialogVisible = signal(false);

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected openCustomDialog(): void {
    this.customDialogVisible.set(true);
  }

  constructor() {
    this._variants.set('tokio',    this.pickVariants('tokio', 4));
    this._variants.set('colombia', this.pickVariants('colombia', 4));
    this._variants.set('ohio',     this.pickVariants('ohio', 4));
    this._variants.set('bank',     this.pickVariants('bank', 4));
  }

  protected readonly lensOptions = computed<ChipOption<LensId>[]>(() =>
    this.presets.lens().map((p) => ({
      value: p.id as LensId,
      labelKey: p.labelKey,
      label: p.isCustom ? p.label : undefined,
      removable: p.isCustom,
    })),
  );
  protected readonly bodyOptions = computed<ChipOption<CameraBodyId>[]>(() =>
    this.presets.camera().map((p) => ({
      value: p.id as CameraBodyId,
      labelKey: p.labelKey,
      label: p.isCustom ? p.label : undefined,
      removable: p.isCustom,
    })),
  );
  protected readonly motionOptions = computed<ChipOption<CameraMotionId>[]>(() =>
    this.presets.cameraMotion().map((p) => ({
      value: p.id as CameraMotionId,
      labelKey: p.labelKey,
      label: p.isCustom ? p.label : undefined,
      removable: p.isCustom,
    })),
  );
  protected readonly gradeOptions = computed<Preset[]>(() =>
    this.presets.colorGrading(),
  );
  protected readonly genreOptions = computed<ChipOption<GenreId>[]>(() =>
    this.presets.genre().map((p) => ({
      value: p.id as GenreId,
      labelKey: p.labelKey,
      label: p.isCustom ? p.label : undefined,
      removable: p.isCustom,
    })),
  );

  protected variantsFor(parentId: string): GradeVariant[] {
    return this._variants.get(parentId) ?? [];
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

  /**
   * Toggle a custom (admin-added) color grade. Mirrors the standard
   * select-or-deselect contract of the other toggle-groups since custom
   * grades have no popover variants to drive the selection.
   */
  protected onPickCustomGrade(id: string): void {
    const cur = this.prompt.cinematography().colorGrading;
    this.prompt.patchCinematography({
      colorGrading: cur === id ? null : (id as ColorGradingId),
    });
    // No variant for custom grades.
    if (cur === id) this.selectedVariant.set(null);
  }

  /** Remove a custom color grade from the catalog (× on the chip). */
  protected onRemoveGrade(e: MouseEvent, id: string): void {
    e.stopPropagation();
    e.preventDefault();
    if (this.prompt.cinematography().colorGrading === id) {
      this.prompt.patchCinematography({ colorGrading: null });
      this.selectedVariant.set(null);
    }
    this.presets.removeCustomPreset('colorGrading', id);
  }

  /**
   * Generic remove handler shared by every non-grade toggle-group.
   * If the removed preset was the currently-selected value for that
   * slot, we also clear the selection so the prompt doesn't keep a
   * dangling id around.
   */
  protected onRemoveCustom(category: PresetCategory, id: string): void {
    const cine = this.prompt.cinematography();
    switch (category) {
      case 'lens':
        if (cine.lens === id) this.prompt.patchCinematography({ lens: null });
        break;
      case 'camera':
        if (cine.cameraBody === id)
          this.prompt.patchCinematography({ cameraBody: null });
        break;
      case 'cameraMotion':
        if (cine.cameraMotion === id)
          this.prompt.patchCinematography({ cameraMotion: null });
        break;
      case 'genre':
        if (cine.genre === id) this.prompt.patchCinematography({ genre: null });
        break;
    }
    this.presets.removeCustomPreset(category, id);
  }

  protected chipClasses(active: boolean): string {
    const base =
      'inline-flex items-center rounded-[3px] border px-3 py-1.5 ' +
      'text-[11px] font-semibold uppercase tracking-[0.12em] ' +
      'transition-colors duration-150 focus:outline-none';
    return active
      ? base + ' border-secondary-500 bg-ink-700 text-fg-strong'
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
