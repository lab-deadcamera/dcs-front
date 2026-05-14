import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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

@Component({
  selector: 'app-index-providers',
  imports: [
    TranslatePipe,
    ButtonModule,
    TooltipModule,
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
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly providers = this.service.providers;
  protected readonly loading = this.service.loading;

  /** Track which provider rows are expanded to show models. */
  protected readonly expandedIds = signal<Record<string, boolean>>({});

  /** All providers flattened (for the model dialog dropdown). */
  protected readonly allProviders = computed(() =>
    this.providers().map((p) => p.provider),
  );

  // Provider dialog
  protected readonly providerDialogVisible = signal(false);
  protected readonly providerDialogTarget = signal<Provider | null>(null);

  // Model dialog
  protected readonly modelDialogVisible = signal(false);
  protected readonly modelDialogTarget = signal<Model | null>(null);
  protected readonly modelPreSelectedProviderId = signal<string | null>(null);

  protected readonly submitting = signal(false);

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
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Provider created' });
      this.providerDialogVisible.set(false);
    });
  }

  protected onUpdateProvider(evt: { id: string; name: string }): void {
    this.submitting.set(true);
    this.service.updateProvider(evt.id, { name: evt.name }).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Provider updated' });
      this.providerDialogVisible.set(false);
    });
  }

  protected toggleActive(p: Provider): void {
    this.service.updateProvider(p.id, { active: !p.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: `${p.name} ${p.active ? 'deactivated' : 'activated'}`,
      });
    });
  }

  protected confirmDeleteProvider(p: Provider): void {
    this.confirm.confirm({
      header: 'Delete Provider',
      message: `Delete "${p.name}" and all its models?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteProvider(p.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Provider deleted' });
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
    api_key: string;
    url: string;
    endpoint: string;
  }): void {
    this.submitting.set(true);
    this.service.createModel(evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Model created' });
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
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Model updated' });
      this.modelDialogVisible.set(false);
    });
  }

  protected toggleModelActive(m: Model, providerId: string): void {
    this.service
      .updateModel(m.id, providerId, { active: !m.active })
      .subscribe((res) => {
        if (res.error) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
          return;
        }
        this.toast.add({
          severity: 'success',
          summary: 'OK',
          detail: `${m.name} ${m.active ? 'deactivated' : 'activated'}`,
        });
      });
  }

  protected confirmDeleteModel(m: Model, providerId: string): void {
    this.confirm.confirm({
      header: 'Delete Model',
      message: `Delete model "${m.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteModel(m.id, providerId).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Model deleted' });
        }),
    });
  }

  protected onToggleFavorite(m: Model): void {
    this.modelService.setFavorite(m.id).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: m.favorite ? 'Favorite removed' : 'Set as favorite',
      });
      this.service.load().subscribe();
    });
  }
}
