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
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../../../interfaces';

interface CharacterFormValue {
  name: string;
  description: string;
  age: number | null;
  style: string | null;
  gender: 'male' | 'female' | 'other' | null;
}

/**
 * Create / Edit dialog for a Character.
 *
 * The same dialog handles both flows — when `character` input is null the
 * form is empty and `submit` emits a `CreateCharacterRequest`; when present
 * the form is pre-populated and `submit` emits an `UpdateCharacterRequest`
 * with only the changed fields. Visibility is fully parent-controlled via
 * the `visible` input and the `visibleChange` output.
 */
@Component({
  selector: 'app-character-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    ValidatorErrors,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '32rem' }"
      [header]="
        (isEdit() ? 'CHARACTERS.DIALOG.EDIT_TITLE' : 'CHARACTERS.DIALOG.CREATE_TITLE')
          | translate
      "
    >
      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <label
            for="character-name"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="character-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="character-name-input"
            [placeholder]="'CHARACTERS.FIELDS.NAME_PLACEHOLDER' | translate"
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'CHARACTERS.FIELDS.NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="character-description"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.FIELDS.DESCRIPTION' | translate }}
          </label>
          <textarea
            id="character-description"
            pTextarea
            rows="3"
            formControlName="description"
            data-testid="character-description-input"
            [placeholder]="'CHARACTERS.FIELDS.DESCRIPTION_PLACEHOLDER' | translate"
          ></textarea>
          <validator-errors
            [control]="form.get('description')"
            [label]="'CHARACTERS.FIELDS.DESCRIPTION' | translate"
          />
        </div>

        @if (!isEdit()) {
          <fieldset class="rounded border border-[color:var(--border-color)] p-3">
            <legend class="px-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
              {{ 'CHARACTERS.FIELDS.METADATA' | translate }}
            </legend>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="flex flex-col gap-1">
                <label
                  for="character-age"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.AGE' | translate }}
                </label>
                <p-inputNumber
                  inputId="character-age"
                  formControlName="age"
                  data-testid="character-age-input"
                  [showButtons]="false"
                  [min]="0"
                  [max]="200"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="character-style"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.STYLE' | translate }}
                </label>
                <input
                  id="character-style"
                  type="text"
                  pInputText
                  formControlName="style"
                  data-testid="character-style-input"
                  [placeholder]="'CHARACTERS.FIELDS.STYLE_PLACEHOLDER' | translate"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="character-gender"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.GENDER' | translate }}
                </label>
                <p-select
                  inputId="character-gender"
                  formControlName="gender"
                  [options]="genderOptions"
                  optionLabel="label"
                  optionValue="value"
                  data-testid="character-gender-select"
                  [placeholder]="'CHARACTERS.FIELDS.GENDER_PLACEHOLDER' | translate"
                  [showClear]="true"
                />
              </div>
            </div>
          </fieldset>
        }
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            data-testid="character-form-cancel"
            (onClick)="close()"
          />
          <p-button
            [label]="(isEdit() ? 'COMMON.SAVE' : 'COMMON.CREATE') | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="character-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CharacterFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly character = input<Character | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<CreateCharacterRequest>();
  readonly update = output<{ id: string; patch: UpdateCharacterRequest }>();

  protected readonly isEdit = computed(() => this.character() !== null);

  protected readonly genderOptions = [
    { value: 'male',   label: 'Male'   },
    { value: 'female', label: 'Female' },
    { value: 'other',  label: 'Other'  },
  ];

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    age: [null as number | null],
    style: [null as string | null],
    gender: [null as 'male' | 'female' | 'other' | null],
  });

  /** Mirror parent inputs into the form whenever the dialog re-opens. */
  private readonly syncFromInputs = effect(() => {
    const c = this.character();
    const open = this.visible();
    if (!open) return;
    if (c) {
      this.form.reset({
        name: c.name,
        description: c.description,
        age: typeof c.metadata['age'] === 'number' ? c.metadata['age'] : null,
        style: typeof c.metadata['style'] === 'string' ? c.metadata['style'] : null,
        gender:
          c.metadata['gender'] === 'male' ||
          c.metadata['gender'] === 'female' ||
          c.metadata['gender'] === 'other'
            ? c.metadata['gender']
            : null,
      });
    } else {
      this.form.reset({
        name: '',
        description: '',
        age: null,
        style: null,
        gender: null,
      });
    }
  });

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value as CharacterFormValue;

    if (this.isEdit()) {
      const original = this.character()!;
      const patch: UpdateCharacterRequest = {};
      if (v.name !== original.name) patch.name = v.name;
      if (v.description !== original.description) patch.description = v.description;
      this.update.emit({ id: original.id, patch });
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (v.age !== null && v.age !== undefined) metadata['age'] = v.age;
    if (v.style) metadata['style'] = v.style;
    if (v.gender) metadata['gender'] = v.gender;

    this.create.emit({
      name: v.name,
      description: v.description,
      metadata,
    });
  }
}
