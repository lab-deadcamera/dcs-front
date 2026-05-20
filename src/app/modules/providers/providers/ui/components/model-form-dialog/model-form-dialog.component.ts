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
      [style]="{ width: '42rem' }"
      [header]="
        (isEdit() ? 'PROVIDERS.MODEL_DIALOG.EDIT_TITLE' : 'PROVIDERS.MODEL_DIALOG.CREATE_TITLE')
          | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-3">
        @if (!isEdit()) {
          <div class="grid grid-cols-2 gap-3">
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

            <div class="flex flex-col gap-1">
              <label for="model-type" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                {{ 'PROVIDERS.FIELDS.MODEL_TYPE' | translate }}
              </label>
              <p-select
                inputId="model-type"
                formControlName="model_type"
                [options]="modelTypeOptions()"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'PROVIDERS.FIELDS.MODEL_TYPE' | translate"
                [appendTo]="'body'"
                data-testid="model-type-select"
              />
              <validator-errors
                [control]="form.get('model_type')"
                [label]="'PROVIDERS.FIELDS.MODEL_TYPE' | translate"
              />
            </div>
          </div>
        } @else {
          @if (visible()) {
            <div class="flex flex-col gap-1">
              <label for="model-type" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                {{ 'PROVIDERS.FIELDS.MODEL_TYPE' | translate }}
              </label>
              <p-select
                inputId="model-type"
                formControlName="model_type"
                [options]="modelTypeOptions()"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'PROVIDERS.FIELDS.MODEL_TYPE' | translate"
                [appendTo]="'body'"
                data-testid="model-type-select"
              />
              <validator-errors
                [control]="form.get('model_type')"
                [label]="'PROVIDERS.FIELDS.MODEL_TYPE' | translate"
              />
            </div>
          }
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

        <div class="grid grid-cols-2 gap-3">
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

        <!-- More options toggle -->
        <div class="border-t pt-2" style="border-color: var(--border-color);">
          <button
            type="button"
            class="flex w-full items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:text-fg"
            (click)="showMore.set(!showMore())"
          >
            {{ 'PROVIDERS.MODEL_DIALOG.MORE_OPTIONS' | translate }}
            <span class="ml-auto text-[10px]">{{ showMore() ? '▾' : '▸' }}</span>
          </button>

          @if (showMore()) {
            <div class="mt-3 flex flex-col gap-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="model-ak" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                    {{ 'PROVIDERS.FIELDS.ACCESS_KEY_ID' | translate }}
                  </label>
                  <input
                    id="model-ak"
                    type="text"
                    pInputText
                    formControlName="access_key_id"
                    data-testid="model-ak-input"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label for="model-sk" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                    {{ 'PROVIDERS.FIELDS.SECRET_ACCESS_KEY' | translate }}
                  </label>
                  <input
                    id="model-sk"
                    type="password"
                    pInputText
                    formControlName="secret_access_key"
                    data-testid="model-sk-input"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label for="model-dag" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                  {{ 'PROVIDERS.FIELDS.DEFAULT_ASSET_GROUP_ID' | translate }}
                </label>
                <input
                  id="model-dag"
                  type="text"
                  pInputText
                  formControlName="default_asset_group_id"
                  data-testid="model-dag-input"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="model-project-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                    {{ 'PROVIDERS.FIELDS.PROJECT_NAME' | translate }}
                  </label>
                  <input
                    id="model-project-name"
                    type="text"
                    pInputText
                    formControlName="project_name"
                    data-testid="model-project-name-input"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label for="model-project-number" class="text-[12px] font-bold uppercase tracking-[0.12em]">
                    {{ 'PROVIDERS.FIELDS.PROJECT_NUMBER' | translate }}
                  </label>
                  <input
                    id="model-project-number"
                    type="text"
                    pInputText
                    formControlName="project_number"
                    data-testid="model-project-number-input"
                  />
                </div>
              </div>
            </div>
          }
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
  protected readonly showMore = signal(false);

  protected readonly modelTypeOptions = computed(() => [
    { label: 'Video', value: 'video' },
    { label: 'Text', value: 'text' },
    { label: 'Audio', value: 'audio' },
    { label: 'Image', value: 'image' },
  ]);

  readonly create = output<{
    provider_id: string;
    name: string;
    model_type: string;
    api_key: string;
    url: string;
    endpoint: string;
    access_key_id?: string;
    secret_access_key?: string;
    default_asset_group_id?: string;
    project_name?: string;
    project_number?: string;
  }>();
  readonly update = output<{
    id: string;
    patch: {
      name?: string;
      model_type?: string;
      api_key?: string;
      url?: string;
      endpoint?: string;
      access_key_id?: string;
      secret_access_key?: string;
      default_asset_group_id?: string;
      project_name?: string;
      project_number?: string;
    };
  }>();

  protected readonly isEdit = computed(() => this.model() !== null);

  protected readonly providerOptions = computed(() =>
    this.providers().filter((p) => p.active),
  );

  protected readonly form: FormGroup = this.fb.group({
    provider_id: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    model_type: ['video', [Validators.required]],
    api_key: ['', [Validators.required]],
    url: ['', [Validators.required]],
    endpoint: ['', [Validators.required]],
    access_key_id: [''],
    secret_access_key: [''],
    default_asset_group_id: [''],
    project_name: [''],
    project_number: [''],
  });

  protected onVisibleChange(v: boolean): void {
    if (!v) this.showMore.set(false);
    this.visibleChange.emit(v);
  }

  /** Sincroniza el form al abrir el diálogo sin pisar selecciones del usuario. */
  private readonly syncOnOpen = effect(() => {
    if (!this.visible()) return;
    const m = this.model();
    const preSelected = this.preSelectedProviderId();

    this.form.patchValue({
      provider_id: m?.provider_id ?? preSelected ?? '',
      name: m?.name ?? '',
      api_key: m?.api_key ?? '',
      url: m?.url ?? '',
      endpoint: m?.endpoint ?? '',
      access_key_id: m?.access_key_id ?? '',
      secret_access_key: m?.secret_access_key ?? '',
      default_asset_group_id: m?.default_asset_group_id ?? '',
      project_name: m?.project_name ?? '',
      project_number: m?.project_number ?? '',
    });
    this.form.get('model_type')?.setValue(m?.model_type ?? 'video', { emitEvent: false });
  });

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const v = {
      provider_id: raw.provider_id ?? '',
      name: raw.name ?? '',
      model_type: raw.model_type ?? 'video',
      api_key: raw.api_key ?? '',
      url: raw.url ?? '',
      endpoint: raw.endpoint ?? '',
      access_key_id: raw.access_key_id || undefined,
      secret_access_key: raw.secret_access_key || undefined,
      default_asset_group_id: raw.default_asset_group_id || undefined,
      project_name: raw.project_name || undefined,
      project_number: raw.project_number || undefined,
    };

    if (this.isEdit()) {
      // Only send defined optional fields
      const patch: Record<string, string | undefined> = {};
      for (const key of ['name', 'model_type', 'api_key', 'url', 'endpoint',
        'access_key_id', 'secret_access_key', 'default_asset_group_id',
        'project_name', 'project_number'] as const) {
        if (v[key] !== undefined) patch[key] = v[key];
      }
      this.update.emit({ id: this.model()!.id, patch: patch as typeof v });
    } else {
      this.create.emit(v);
    }
  }
}
