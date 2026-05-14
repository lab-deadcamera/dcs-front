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
import { SelectModule } from 'primeng/select';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Model, Provider } from '../../../interfaces';

@Component({
  selector: 'app-model-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
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
        (isEdit() ? 'PROVIDERS.MODEL_DIALOG.EDIT_TITLE' : 'PROVIDERS.MODEL_DIALOG.CREATE_TITLE')
          | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-3">
        @if (!isEdit()) {
          <div class="flex flex-col gap-1">
            <label
              for="model-provider"
              class="text-[12px] font-bold uppercase tracking-[0.12em]"
            >
              {{ 'PROVIDERS.FIELDS.PROVIDER' | translate }}
            </label>
            <p-select
              inputId="model-provider"
              formControlName="provider_id"
              [options]="providerOptions()"
              optionLabel="name"
              optionValue="id"
              [placeholder]="'PROVIDERS.FIELDS.PROVIDER_PLACEHOLDER' | translate"
              data-testid="model-provider-select"
            />
            <validator-errors
              [control]="form.get('provider_id')"
              [label]="'PROVIDERS.FIELDS.PROVIDER' | translate"
            />
          </div>
        }

        <div class="flex flex-col gap-1">
          <label for="model-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROVIDERS.FIELDS.MODEL_NAME' | translate }}
          </label>
          <input
            id="model-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="model-name-input"
            placeholder="gpt-4o, claude-4, seedance-2-0..."
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'PROVIDERS.FIELDS.MODEL_NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="model-api-key" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROVIDERS.FIELDS.API_KEY' | translate }}
          </label>
          <input
            id="model-api-key"
            type="password"
            pInputText
            formControlName="api_key"
            data-testid="model-api-key-input"
            placeholder="sk-..."
          />
          <validator-errors
            [control]="form.get('api_key')"
            [label]="'PROVIDERS.FIELDS.API_KEY' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="model-url" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROVIDERS.FIELDS.URL' | translate }}
          </label>
          <input
            id="model-url"
            type="text"
            pInputText
            formControlName="url"
            data-testid="model-url-input"
            placeholder="https://api.openai.com"
          />
          <validator-errors
            [control]="form.get('url')"
            [label]="'PROVIDERS.FIELDS.URL' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="model-endpoint" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROVIDERS.FIELDS.ENDPOINT' | translate }}
          </label>
          <input
            id="model-endpoint"
            type="text"
            pInputText
            formControlName="endpoint"
            data-testid="model-endpoint-input"
            placeholder="/v1/chat/completions"
          />
          <validator-errors
            [control]="form.get('endpoint')"
            [label]="'PROVIDERS.FIELDS.ENDPOINT' | translate"
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
            data-testid="model-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ModelFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly model = input<Model | null>(null);
  readonly providers = input<Provider[]>([]);
  readonly preSelectedProviderId = input<string | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<{
    provider_id: string;
    name: string;
    api_key: string;
    url: string;
    endpoint: string;
  }>();
  readonly update = output<{
    id: string;
    patch: { name?: string; api_key?: string; url?: string; endpoint?: string };
  }>();

  protected readonly isEdit = computed(() => this.model() !== null);

  protected readonly providerOptions = computed(() =>
    this.providers().filter((p) => p.active),
  );

  protected readonly form: FormGroup = this.fb.group({
    provider_id: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    api_key: ['', [Validators.required]],
    url: ['', [Validators.required]],
    endpoint: ['', [Validators.required]],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const m = this.model();
    const preSelected = this.preSelectedProviderId();
    this.form.reset({
      provider_id: m?.provider_id ?? preSelected ?? '',
      name: m?.name ?? '',
      api_key: m?.api_key ?? '',
      url: m?.url ?? '',
      endpoint: m?.endpoint ?? '',
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

    const v = this.form.value as {
      provider_id: string;
      name: string;
      api_key: string;
      url: string;
      endpoint: string;
    };

    if (this.isEdit()) {
      this.update.emit({ id: this.model()!.id, patch: v });
    } else {
      this.create.emit(v);
    }
  }
}
