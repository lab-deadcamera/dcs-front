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
import { Shot } from '../../../interfaces';

@Component({
  selector: 'app-shot-form-dialog',
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
      header="Edit Shot"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="shot-number" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Number
          </label>
          <p-inputNumber
            inputId="shot-number"
            formControlName="number"
            [min]="1"
            [max]="9999"
            [showButtons]="true"
            [mode]="'decimal'"
          />
          <validator-errors [control]="form.get('number')" [label]="'Number'" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="shot-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Name
          </label>
          <input id="shot-name" type="text" pInputText formControlName="name" />
          <validator-errors [control]="form.get('name')" [label]="'Name'" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="shot-description" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Description
          </label>
          <textarea
            id="shot-description"
            pInputTextarea
            formControlName="description"
            rows="3"
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
            [label]="'COMMON.SAVE' | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ShotFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly shot = input<Shot | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly update = output<{ id: string; number: number; name: string; description?: string }>();

  protected readonly isEdit = computed(() => this.shot() !== null);

  protected readonly form: FormGroup = this.fb.group({
    number: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(2000)],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const s = this.shot();
    this.form.reset({
      number: s?.number ?? 1,
      name: s?.name ?? '',
      description: s?.description ?? '',
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

    this.update.emit({
      id: this.shot()!.id,
      number,
      name,
      description: description || undefined,
    });
  }
}
