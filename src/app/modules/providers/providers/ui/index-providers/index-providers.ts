import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Provider, Model } from '../../interfaces';
import { ProvidersService } from '../../services';
import { ProviderFormDialogComponent } from '../components/provider-form-dialog/provider-form-dialog.component';
import { ModelFormDialogComponent } from '../components/model-form-dialog/model-form-dialog.component';
import { ModelService } from '@app/services';
import { SessionStore } from '@app/core/stores/session.store';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-index-providers',
  imports: [
    TranslatePipe,
    ButtonModule,
    TooltipModule,
    SelectModule,
    ConfirmDialogModule,
    ToastModule,
    ProviderFormDialogComponent,
    ModelFormDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-providers.html',
  styleUrl: './index-providers.css',
})
export class IndexProviders implements OnInit {
  private readonly service = inject(ProvidersService);
  private readonly modelService = inject(ModelService);
  public readonly session = inject(SessionStore);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly providers = this.service.providers;
  protected readonly loading = this.service.loading;

  /** Translate a key with optional interpolation params. */
  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  /** Track which provider rows are expanded to show models. */
  protected readonly expandedIds = signal<Record<string, boolean>>({});

  /** All providers flattened (for the model dialog dropdown). */
  protected readonly allProviders = computed(() => this.providers().map((p) => p.provider));

  // Provider dialog
  protected readonly providerDialogVisible = signal(false);
  protected readonly providerDialogTarget = signal<Provider | null>(null);

  // Model dialog
  protected readonly modelDialogVisible = signal(false);
  protected readonly modelDialogTarget = signal<Model | null>(null);
  protected readonly modelPreSelectedProviderId = signal<string | null>(null);

  protected readonly submitting = signal(false);

  /** Reference to the hidden file input for CSV import. */
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  ngOnInit(): void {
    this.service.load().subscribe();
  }

  protected toggleExpand(providerId: string): void {
    this.expandedIds.update((map) => ({
      ...map,
      [providerId]: !map[providerId],
    }));
  }

  // ---------------------------------------------------------------------------
  // Provider CRUD
  // ---------------------------------------------------------------------------

  protected openCreateProvider(): void {
    this.providerDialogTarget.set(null);
    this.providerDialogVisible.set(true);
  }

  protected openEditProvider(p: Provider): void {
    this.providerDialogTarget.set(p);
    this.providerDialogVisible.set(true);
  }

  protected onCreateProvider(name: string): void {
    this.submitting.set(true);
    this.service.createProvider(name).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.CREATED') });
      this.providerDialogVisible.set(false);
    });
  }

  protected onUpdateProvider(evt: { id: string; name: string }): void {
    this.submitting.set(true);
    this.service.updateProvider(evt.id, { name: evt.name }).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.UPDATED') });
      this.providerDialogVisible.set(false);
    });
  }

  protected toggleActive(p: Provider): void {
    this.service.updateProvider(p.id, { active: !p.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.t('COMMON.OK'),
        detail: this.t(p.active ? 'PROVIDERS.TOAST.DEACTIVATED' : 'PROVIDERS.TOAST.ACTIVATED', { name: p.name }),
      });
    });
  }

  protected confirmDeleteProvider(p: Provider): void {
    this.confirm.confirm({
      header: this.t('PROVIDERS.DELETE_DIALOG.TITLE'),
      message: this.t('PROVIDERS.DELETE_DIALOG.MESSAGE', { name: p.name }),
      acceptLabel: this.t('COMMON.DELETE'),
      rejectLabel: this.t('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteProvider(p.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.DELETED') });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Model CRUD
  // ---------------------------------------------------------------------------

  protected openCreateModel(preSelectedProviderId: string): void {
    this.modelDialogTarget.set(null);
    this.modelPreSelectedProviderId.set(preSelectedProviderId);
    this.modelDialogVisible.set(true);
  }

  protected openEditModel(m: Model): void {
    this.modelDialogTarget.set(m);
    this.modelPreSelectedProviderId.set(null);
    this.modelDialogVisible.set(true);
  }

  protected onCreateModel(evt: {
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
  }): void {
    this.submitting.set(true);
    this.service.createModel(evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.MODEL_CREATED') });
      this.modelDialogVisible.set(false);
    });
  }

  protected onUpdateModel(evt: { id: string; patch: Partial<Model> }): void {
    const m = this.modelDialogTarget();
    if (!m) return;

    this.submitting.set(true);
    this.service.updateModel(evt.id, m.provider_id, evt.patch).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.MODEL_UPDATED') });
      this.modelDialogVisible.set(false);
    });
  }

  protected toggleModelActive(m: Model, providerId: string): void {
    this.service.updateModel(m.id, providerId, { active: !m.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.t('COMMON.OK'),
        detail: this.t(m.active ? 'PROVIDERS.TOAST.MODEL_DEACTIVATED' : 'PROVIDERS.TOAST.MODEL_ACTIVATED', { name: m.name }),
      });
    });
  }

  protected confirmDeleteModel(m: Model, providerId: string): void {
    this.confirm.confirm({
      header: this.t('PROVIDERS.DELETE_MODEL_DIALOG.TITLE'),
      message: this.t('PROVIDERS.DELETE_MODEL_DIALOG.MESSAGE', { name: m.name }),
      acceptLabel: this.t('COMMON.DELETE'),
      rejectLabel: this.t('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteModel(m.id, providerId).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: this.t('PROVIDERS.TOAST.MODEL_DELETED') });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // CSV Export / Import
  // ---------------------------------------------------------------------------

  protected onExport(): void {
    this.service.exportCSV();
  }

  protected onImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.service.importCSV(file).subscribe((res) => {
      // Reset file input so the same file can be selected again.
      input.value = '';

      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Import Error', detail: res.msg });
        return;
      }

      const d = res.data;
      const parts: string[] = [];
      if (d) {
        if (d.providers_created > 0) parts.push(`${d.providers_created} providers created`);
        if (d.models_created > 0) parts.push(`${d.models_created} models created`);
        if (d.models_updated > 0) parts.push(`${d.models_updated} models updated`);
        if (d.errors && d.errors.length > 0) parts.push(`${d.errors.length} errors`);
      }
      this.toast.add({
        severity: d?.errors?.length ? 'warn' : 'success',
        summary: 'Import Complete',
        detail: parts.length ? parts.join(', ') : 'No changes',
      });
    });
  }

  protected onToggleFavorite(m: Model): void {
    this.modelService.setFavorite(m.id).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.t('COMMON.OK'),
        detail: m.favorite ? 'Favorite removed' : 'Set as favorite',
      });
      this.service.load().subscribe();
    });
  }
}
