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
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Provider } from '../../../interfaces';

@Component({
  selector: 'app-provider-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
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
        (isEdit() ? 'PROVIDERS.DIALOG.EDIT_TITLE' : 'PROVIDERS.DIALOG.CREATE_TITLE') | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label
            for="provider-name"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'PROVIDERS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="provider-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="provider-name-input"
            placeholder="BytePlus, OpenAI, Anthropic..."
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'PROVIDERS.FIELDS.NAME' | translate"
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
            data-testid="provider-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ProviderFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly provider = input<Provider | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<string>();
  readonly update = output<{ id: string; name: string }>();

  protected readonly isEdit = computed(() => this.provider() !== null);

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const p = this.provider();
    this.form.reset({ name: p?.name ?? '' });
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

    const name = this.form.value.name as string;

    if (this.isEdit()) {
      this.update.emit({ id: this.provider()!.id, name });
    } else {
      this.create.emit(name);
    }
  }
}
