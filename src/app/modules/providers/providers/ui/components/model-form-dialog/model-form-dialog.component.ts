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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Model, Provider } from '../../../interfaces';
import { ModelConfig } from '@app/core/interfaces/models.interface';

@Component({
  selector: 'app-model-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
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

  /** Limit inputs only make sense for models that generate videos. Reactive to model_type changes. */
  protected readonly isVideoModel = computed(() => this.modelTypeValue() === 'video');

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
    config?: ModelConfig;
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
      config?: ModelConfig;
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
    min_videos: [null as number | null],
    max_videos: [null as number | null],
    min_duration: [null as number | null],
    max_duration: [null as number | null],
  });

  /** Declared after `form` so it can observe its valueChanges. */
  private readonly modelTypeValue = toSignal(this.form.controls['model_type'].valueChanges, {
    initialValue: this.form.controls['model_type'].value,
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
      min_videos: m?.config?.min_videos ?? null,
      max_videos: m?.config?.max_videos ?? null,
      min_duration: m?.config?.min_duration ?? null,
      max_duration: m?.config?.max_duration ?? null,
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

    // Build the config object from the limit inputs (empty = no limit).
    const config: ModelConfig = {};
    if (raw.min_videos != null) config.min_videos = raw.min_videos;
    if (raw.max_videos != null) config.max_videos = raw.max_videos;
    if (raw.min_duration != null) config.min_duration = raw.min_duration;
    if (raw.max_duration != null) config.max_duration = raw.max_duration;
    const hasConfig = Object.keys(config).length > 0;

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
      config: hasConfig ? config : undefined,
    };

    if (this.isEdit()) {
      // Only send defined optional fields, but always send `config` (even
      // empty) so clearing all limit inputs resets the stored config.
      const patch: Record<string, string | ModelConfig | undefined> = {};
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
      patch['config'] = config;
      this.update.emit({ id: this.model()!.id, patch: patch as typeof v });
    } else {
      this.create.emit(v);
    }
  }
}
