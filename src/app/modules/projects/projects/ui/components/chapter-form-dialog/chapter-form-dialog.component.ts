import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Chapter } from '../../../interfaces';

@Component({
  selector: 'app-chapter-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
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
      [style]="{ width: '28rem' }"
      [header]="
        (isEdit() ? 'PROJECTS.CHAPTER_DIALOG.EDIT_TITLE' : 'PROJECTS.CHAPTER_DIALOG.CREATE_TITLE')
          | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="chapter-number" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROJECTS.FIELDS.CHAPTER_NUMBER' | translate }}
          </label>
          <p-inputNumber
            inputId="chapter-number"
            formControlName="number"
            [min]="1"
            [max]="9999"
            [showButtons]="true"
            [mode]="'decimal'"
            data-testid="chapter-number-input"
          />
          <validator-errors
            [control]="form.get('number')"
            [label]="'PROJECTS.FIELDS.CHAPTER_NUMBER' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="chapter-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROJECTS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="chapter-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="chapter-name-input"
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'PROJECTS.FIELDS.NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="chapter-description" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROJECTS.FIELDS.DESCRIPTION' | translate }}
          </label>
          <textarea
            id="chapter-description"
            pInputTextarea
            formControlName="description"
            rows="3"
            data-testid="chapter-description-input"
          ></textarea>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="close()"
          />
          <p-button
            [label]="(isEdit() ? 'COMMON.SAVE' : 'COMMON.CREATE') | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="chapter-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ChapterFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly chapter = input<Chapter | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<{ number: number; name: string; description?: string }>();
  readonly update = output<{ id: string; number: number; name: string; description?: string }>();

  protected readonly isEdit = computed(() => this.chapter() !== null);

  protected readonly form: FormGroup = this.fb.group({
    number: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const c = this.chapter();
    this.form.reset({
      number: c?.number ?? 1,
      name: c?.name ?? '',
      description: c?.description ?? '',
    });
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

    const { number, name, description } = this.form.value;

    if (this.isEdit()) {
      this.update.emit({
        id: this.chapter()!.id,
        number,
        name,
        description: description || undefined,
      });
    } else {
      this.create.emit({ number, name, description: description || undefined });
    }
  }
}
