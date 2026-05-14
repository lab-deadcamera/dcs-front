import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AIModel, AIProvider } from '@core/interfaces/providers.interface';
import { ProvidersStateService } from '@app/core/stores/providers.state';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';

/**
 * Mode of the inline form pane. Drives whether the right panel shows the
 * selected provider's details (`view`), a blank create form, an edit form
 * for the selected provider, or one of the model variants for the active
 * provider context.
 */
type PaneMode =
  | 'view'
  | 'provider-create'
  | 'provider-edit'
  | 'model-create'
  | 'model-edit';

/**
 * Admin dialog for the AI providers catalog.
 *
 * Master-detail layout: providers on the left (selectable list with a
 * "+ New" button), the right pane shows whichever flow is active —
 * details + models for the selected provider, or one of the inline
 * forms (add/edit provider, add/edit model).
 *
 * Persistence is handled by `ProvidersStateService` (localStorage). The
 * dialog is purely a UI shell + form orchestrator.
 */
@Component({
  selector: 'app-providers-dialog',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    ValidatorErrors,
  ],
  // PrimeNG service primitives are component-scoped — provide here so the
  // dialog is self-contained regardless of the parent's provider config.
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './providers-dialog.component.html',
})
export class ProvidersDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly providersState = inject(ProvidersStateService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly i18n = inject(TranslateService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  // ── state ─────────────────────────────────────────────────────────────
  protected readonly providers = this.providersState.providers;
  protected readonly activeProviderId = this.providersState.activeProviderId;
  protected readonly activeModelId = this.providersState.activeModelId;

  /** Currently-focused provider in the left list (independent of active). */
  protected readonly selectedProviderId = signal<string | null>(null);

  protected readonly selectedProvider = computed<AIProvider | null>(
    () =>
      this.providers().find((p) => p.id === this.selectedProviderId()) ?? null,
  );

  /** Right-pane mode. */
  protected readonly mode = signal<PaneMode>('view');

  /** Id of the model being edited (paired with mode === 'model-edit'). */
  protected readonly editingModelId = signal<string | null>(null);

  /** API key visibility per provider id, defaults to masked. */
  protected readonly revealKeyFor = signal<string | null>(null);

  // ── forms ─────────────────────────────────────────────────────────────
  protected readonly providerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    url: [
      '',
      [
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/i),
        Validators.maxLength(500),
      ],
    ],
    apiKey: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.maxLength(500)]],
  });

  protected readonly modelForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
    if (!v) this.resetToView();
  }

  protected close(): void {
    this.visibleChange.emit(false);
    this.resetToView();
  }

  // ── selection ─────────────────────────────────────────────────────────

  protected selectProvider(id: string): void {
    this.selectedProviderId.set(id);
    this.mode.set('view');
    this.editingModelId.set(null);
  }

  protected setActiveProvider(id: string): void {
    this.providersState.setActiveProvider(id);
    this.toast.add({
      severity: 'success',
      summary: 'OK',
      detail: this.i18n.instant('PROVIDERS.TOAST.ACTIVE_PROVIDER'),
    });
  }

  protected setActiveModel(modelId: string): void {
    this.providersState.setActiveModel(modelId);
    this.toast.add({
      severity: 'success',
      summary: 'OK',
      detail: this.i18n.instant('PROVIDERS.TOAST.ACTIVE_MODEL'),
    });
  }

  // ── provider form ─────────────────────────────────────────────────────

  protected openProviderCreate(): void {
    this.providerForm.reset({ name: '', url: '', apiKey: '', description: '' });
    this.mode.set('provider-create');
  }

  protected openProviderEdit(): void {
    const p = this.selectedProvider();
    if (!p) return;
    this.providerForm.reset({
      name: p.name,
      url: p.url,
      apiKey: p.apiKey,
      description: p.description ?? '',
    });
    this.mode.set('provider-edit');
  }

  protected saveProvider(): void {
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const v = this.providerForm.value as {
      name: string;
      url: string;
      apiKey: string;
      description: string;
    };

    if (this.mode() === 'provider-create') {
      const created = this.providersState.addProvider(v);
      this.selectedProviderId.set(created.id);
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: this.i18n.instant('PROVIDERS.TOAST.CREATED', {
          label: created.name,
        }),
      });
    } else if (this.mode() === 'provider-edit') {
      const cur = this.selectedProvider();
      if (!cur) return;
      this.providersState.updateProvider(cur.id, v);
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: this.i18n.instant('PROVIDERS.TOAST.UPDATED', { label: v.name }),
      });
    }
    this.mode.set('view');
  }

  protected confirmDeleteProvider(): void {
    const p = this.selectedProvider();
    if (!p) return;
    this.confirm.confirm({
      header: this.i18n.instant('PROVIDERS.CONFIRM.DELETE_PROVIDER_HEADER'),
      message: this.i18n.instant('PROVIDERS.CONFIRM.DELETE_PROVIDER', {
        label: p.name,
      }),
      acceptLabel: this.i18n.instant('COMMON.DELETE'),
      rejectLabel: this.i18n.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.providersState.removeProvider(p.id);
        this.selectedProviderId.set(null);
        this.mode.set('view');
        this.toast.add({
          severity: 'success',
          summary: 'OK',
          detail: this.i18n.instant('PROVIDERS.TOAST.DELETED'),
        });
      },
    });
  }

  // ── model form ────────────────────────────────────────────────────────

  protected openModelCreate(): void {
    if (!this.selectedProvider()) return;
    this.modelForm.reset({ name: '', description: '' });
    this.editingModelId.set(null);
    this.mode.set('model-create');
  }

  protected openModelEdit(model: AIModel): void {
    this.modelForm.reset({
      name: model.name,
      description: model.description,
    });
    this.editingModelId.set(model.id);
    this.mode.set('model-edit');
  }

  protected saveModel(): void {
    const provider = this.selectedProvider();
    if (!provider || this.modelForm.invalid) {
      this.modelForm.markAllAsTouched();
      return;
    }
    const v = this.modelForm.value as { name: string; description: string };

    if (this.mode() === 'model-create') {
      const created = this.providersState.addModel(provider.id, v);
      if (created) {
        this.toast.add({
          severity: 'success',
          summary: 'OK',
          detail: this.i18n.instant('PROVIDERS.TOAST.MODEL_CREATED', {
            label: created.name,
          }),
        });
      }
    } else if (this.mode() === 'model-edit') {
      const mid = this.editingModelId();
      if (!mid) return;
      this.providersState.updateModel(provider.id, mid, v);
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: this.i18n.instant('PROVIDERS.TOAST.MODEL_UPDATED', {
          label: v.name,
        }),
      });
    }
    this.mode.set('view');
    this.editingModelId.set(null);
  }

  protected confirmDeleteModel(model: AIModel): void {
    const provider = this.selectedProvider();
    if (!provider) return;
    this.confirm.confirm({
      header: this.i18n.instant('PROVIDERS.CONFIRM.DELETE_MODEL_HEADER'),
      message: this.i18n.instant('PROVIDERS.CONFIRM.DELETE_MODEL', {
        label: model.name,
      }),
      acceptLabel: this.i18n.instant('COMMON.DELETE'),
      rejectLabel: this.i18n.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.providersState.removeModel(provider.id, model.id);
        this.toast.add({
          severity: 'success',
          summary: 'OK',
          detail: this.i18n.instant('PROVIDERS.TOAST.MODEL_DELETED'),
        });
      },
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────

  /** Render the API key as `••••XXXX` so it's not exposed by default. */
  protected maskKey(key: string): string {
    if (!key) return '—';
    if (this.revealKeyFor() === this.selectedProviderId()) return key;
    if (key.length <= 4) return '••••';
    return '••••' + key.slice(-4);
  }

  protected toggleRevealKey(): void {
    const id = this.selectedProviderId();
    this.revealKeyFor.set(this.revealKeyFor() === id ? null : id);
  }

  protected cancelForm(): void {
    this.mode.set('view');
    this.editingModelId.set(null);
  }

  private resetToView(): void {
    this.mode.set('view');
    this.editingModelId.set(null);
    this.revealKeyFor.set(null);
  }
}
