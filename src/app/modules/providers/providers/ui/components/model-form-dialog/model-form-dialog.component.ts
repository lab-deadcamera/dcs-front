import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  templateUrl: './model-form-dialog.component.html',
})
export class ModelFormDialogComponent implements OnInit {
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

  protected readonly isEdit = computed(() => {
    const m = this.model();
    if (!m) return false;
    return m.id !== null;
  });

  protected readonly providerOptions = computed(() => this.providers().filter((p) => p.active));

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

  private readonly syncOnModelChange = effect(() => {
    const m = this.model();
    if (!m) return;
    this.updateFormFromModel(m);
  });

  ngOnInit(): void {
    if (this.model()) {
      this.updateFormFromModel(this.model()!);
    }
  }

  private updateFormFromModel(m: Model): void {
    this.form.patchValue({
      provider_id: m?.provider_id ?? this.preSelectedProviderId() ?? '',
      name: m?.name ?? '',
      api_key: m?.api_key ?? '',
      url: m?.url ?? '',
      endpoint: m?.endpoint ?? '',
      access_key_id: m?.access_key_id ?? '',
      secret_access_key: m?.secret_access_key ?? '',
      default_asset_group_id: m?.default_asset_group_id ?? '',
      project_name: m?.project_name ?? '',
      project_number: m?.project_number ?? '',
      model_type: m?.model_type ?? 'video',
    });
  }

  protected onVisibleChange(v: boolean): void {
    if (!v) this.showMore.set(false);
    this.visibleChange.emit(v);
  }

  // /** Sincroniza el form al abrir el diálogo sin pisar selecciones del usuario. */
  // private readonly syncOnOpen = effect(() => {
  //   if (!this.visible()) return;
  //   const m = this.model();
  //   const preSelected = this.preSelectedProviderId();

  //   this.form.patchValue({
  //     provider_id: m?.provider_id ?? preSelected ?? '',
  //     name: m?.name ?? '',
  //     api_key: m?.api_key ?? '',
  //     url: m?.url ?? '',
  //     endpoint: m?.endpoint ?? '',
  //     access_key_id: m?.access_key_id ?? '',
  //     secret_access_key: m?.secret_access_key ?? '',
  //     default_asset_group_id: m?.default_asset_group_id ?? '',
  //     project_name: m?.project_name ?? '',
  //     project_number: m?.project_number ?? '',
  //   });
  //   this.form.get('model_type')?.setValue(m?.model_type ?? 'video', { emitEvent: false });
  // });

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
      for (const key of [
        'name',
        'model_type',
        'api_key',
        'url',
        'endpoint',
        'access_key_id',
        'secret_access_key',
        'default_asset_group_id',
        'project_name',
        'project_number',
      ] as const) {
        if (v[key] !== undefined) patch[key] = v[key];
      }
      this.update.emit({ id: this.model()!.id, patch: patch as typeof v });
    } else {
      this.create.emit(v);
    }
  }
}
