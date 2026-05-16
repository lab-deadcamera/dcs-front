import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
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
import { InputNumberModule } from 'primeng/inputnumber';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Take } from '../../../interfaces';

@Component({
  selector: 'app-take-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputNumberModule,
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
        (isEdit() ? 'PROJECTS.TAKE_DIALOG.EDIT_TITLE' : 'PROJECTS.TAKE_DIALOG.CREATE_TITLE') | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label
            for="take-number"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'PROJECTS.FIELDS.TAKE_NUMBER' | translate }}
          </label>
          <p-inputNumber
            inputId="take-number"
            formControlName="number"
            [min]="1"
            [max]="100"
            [showButtons]="true"
            [mode]="'decimal'"
            data-testid="take-number-input"
          />
          <validator-errors
            [control]="form.get('number')"
            [label]="'PROJECTS.FIELDS.TAKE_NUMBER' | translate"
          />
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
            data-testid="take-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class TakeFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly take = input<Take | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<{ number: number }>();
  readonly update = output<{ id: string; number: number }>();

  protected readonly isEdit = computed(() => this.take() !== null);

  protected readonly form: FormGroup = this.fb.group({
    number: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const t = this.take();
    this.form.reset({ number: t?.number ?? 1 });
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

    const number = this.form.value.number;

    if (this.isEdit()) {
      this.update.emit({ id: this.take()!.id, number });
    } else {
      this.create.emit({ number });
    }
  }
}
