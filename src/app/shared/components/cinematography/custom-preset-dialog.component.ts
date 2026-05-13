import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PresetCategory } from '@core/interfaces/studio.models';
import { PresetsService } from '@app/core/stores/presets.service';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';

/**
 * Admin-only wizard to extend the cinematography catalog at runtime.
 *
 * The form has three fields:
 *   1. category — which row of chips the new preset joins
 *      (lens / camera body / motion / color grading / genre).
 *   2. label   — human-readable name shown on the chip; must be unique
 *                across the categories so the resulting `@token` and
 *                visual identity stay clean.
 *   3. prompt  — verbatim English instruction that gets injected into the
 *                final compiled prompt when the chip is selected (same
 *                shape as the rows in `presets.json`).
 *
 * On submit we delegate to `PresetsService.addCustomPreset(...)`, which
 * persists to localStorage and merges into the per-category computed
 * signals — chips appear instantly in the cinematography section.
 */
@Component({
  selector: 'app-custom-preset-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    ValidatorErrors,
  ],
  // MessageService is component-scoped in PrimeNG — provide it locally so
  // injecting it never blows up when the dialog is instantiated from a
  // parent that doesn't supply one (e.g. CinematographyComponent).
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '34rem' }"
      [header]="'STUDIO.CINEMATOGRAPHY.CUSTOM.DIALOG_TITLE' | translate"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <label
            for="custom-preset-category"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.CINEMATOGRAPHY.CUSTOM.CATEGORY' | translate }}
          </label>
          <p-select
            inputId="custom-preset-category"
            [options]="categoryOptions()"
            formControlName="category"
            optionLabel="label"
            optionValue="value"
            data-testid="custom-preset-category"
            [placeholder]="
              'STUDIO.CINEMATOGRAPHY.CUSTOM.CATEGORY_PLACEHOLDER' | translate
            "
          />
          <validator-errors
            [control]="form.get('category')"
            [label]="'STUDIO.CINEMATOGRAPHY.CUSTOM.CATEGORY' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="custom-preset-label"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.CINEMATOGRAPHY.CUSTOM.LABEL' | translate }}
          </label>
          <input
            id="custom-preset-label"
            type="text"
            pInputText
            formControlName="label"
            data-testid="custom-preset-label"
            [placeholder]="
              'STUDIO.CINEMATOGRAPHY.CUSTOM.LABEL_PLACEHOLDER' | translate
            "
          />
          <validator-errors
            [control]="form.get('label')"
            [label]="'STUDIO.CINEMATOGRAPHY.CUSTOM.LABEL' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="custom-preset-prompt"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.CINEMATOGRAPHY.CUSTOM.PROMPT' | translate }}
          </label>
          <textarea
            id="custom-preset-prompt"
            pTextarea
            rows="6"
            formControlName="prompt"
            data-testid="custom-preset-prompt"
            [placeholder]="
              'STUDIO.CINEMATOGRAPHY.CUSTOM.PROMPT_PLACEHOLDER' | translate
            "
          ></textarea>
          <validator-errors
            [control]="form.get('prompt')"
            [label]="'STUDIO.CINEMATOGRAPHY.CUSTOM.PROMPT' | translate"
          />
          <p
            class="font-mono text-[10px]"
            style="color: var(--text-muted);"
          >
            {{ 'STUDIO.CINEMATOGRAPHY.CUSTOM.PROMPT_HINT' | translate }}
          </p>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            data-testid="custom-preset-cancel"
            (onClick)="close()"
          />
          <p-button
            icon="pi pi-plus"
            [label]="'STUDIO.CINEMATOGRAPHY.CUSTOM.SUBMIT' | translate"
            [disabled]="form.invalid"
            data-testid="custom-preset-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <p-toast position="bottom-right" />
  `,
})
export class CustomPresetDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly presets = inject(PresetsService);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  /** Default category to preselect when the dialog opens. */
  readonly defaultCategory = input<PresetCategory>('lens');

  protected readonly form: FormGroup = this.fb.group({
    category: ['lens' as PresetCategory, Validators.required],
    label: ['', [Validators.required, Validators.maxLength(80)]],
    prompt: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  protected readonly categoryOptions = computed(() => [
    { value: 'lens',         label: this.i18n.instant('STUDIO.CINEMATOGRAPHY.LENS') },
    { value: 'camera',       label: this.i18n.instant('STUDIO.CINEMATOGRAPHY.CAMERA_BODY') },
    { value: 'cameraMotion', label: this.i18n.instant('STUDIO.CINEMATOGRAPHY.CAMERA_MOTION') },
    { value: 'colorGrading', label: this.i18n.instant('STUDIO.CINEMATOGRAPHY.COLOR_GRADING') },
    { value: 'genre',        label: this.i18n.instant('STUDIO.CINEMATOGRAPHY.GENRE') },
  ]);

  /** Wipe the form whenever the dialog opens so prior state never leaks. */
  private readonly resetOnOpen = effect(() => {
    if (!this.visible()) return;
    this.form.reset({
      category: this.defaultCategory(),
      label: '',
      prompt: '',
    });
  });

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { category, label, prompt } = this.form.value as {
      category: PresetCategory;
      label: string;
      prompt: string;
    };

    const created = this.presets.addCustomPreset(category, { label, prompt });
    this.toast.add({
      severity: 'success',
      summary: 'OK',
      detail: this.i18n.instant('STUDIO.CINEMATOGRAPHY.CUSTOM.CREATED', {
        label: created.label,
      }),
    });
    this.visibleChange.emit(false);
  }
}
