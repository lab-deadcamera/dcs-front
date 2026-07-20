import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { FilesApiService, GenerationLogsService, VideoGeneratorService } from '@app/services';
import { GenerationLogEntry } from '@core/interfaces/seedance.interface';
import { environment } from '@environment/environment';
import { RESOLVE_URL } from '@app/shared/utils';
import { ResolveUrlPipe } from '@app/core/pipes';

interface SelectOption {
  label: string;
  value: string;
}

interface UserOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-index-admin',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    InputTextModule,
    CurrencyPipe,
    SelectModule,
    PaginatorModule,
    ToastModule,
    ResolveUrlPipe,
    DialogModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  templateUrl: './index-admin.html',
})
export class IndexAdmin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly videoGenerator = inject(VideoGeneratorService);
  private readonly genLogs = inject(GenerationLogsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileSvc = inject(FilesApiService);

  protected readonly resourceTypeOptions: SelectOption[] = [
    { label: 'Video', value: 'video' },
    { label: 'Image', value: 'image' },
    { label: 'Audio', value: 'audio' },
    { label: 'Text', value: 'text' },
  ];

  protected readonly statusOptions = [
    { label: 'Succeeded', value: 'succeeded' },
    { label: 'Running', value: 'running' },
    { label: 'Queued', value: 'queued' },
    { label: 'Failed', value: 'failed' },
  ];

  // Dropdown options
  protected readonly modelOptions = signal<SelectOption[]>([]);
  protected readonly userOptions = signal<UserOption[]>([]);
  protected readonly projectOptions = signal<SelectOption[]>([]);
  protected readonly sceneOptions = signal<SelectOption[]>([]);

  protected readonly filters = signal({
    modelName: '',
    userId: null as number | null,
    projectId: '',
    sceneId: '',
    status: null as string | null,
    resourceType: null as string | null,
    dateFrom: '',
    dateTo: '',
  });

  protected readonly logs = signal<GenerationLogEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly page = signal(0);
  protected readonly limit = signal(20);
  protected readonly totalCost = signal(0);
  protected readonly costLoading = signal(false);

  ngOnInit(): void {
    this.loadDropdowns();
    this.search();
  }

  private loadDropdowns(): void {
    // Models
    this.http
      .get<{ success: boolean; data?: Array<{ id: string; name: string }> }>(
        `${environment.API_URL}/models`,
      )
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.modelOptions.set(res.data.map((m) => ({ label: m.name, value: m.name })));
        }
      });

    // Users
    this.http
      .get<{
        success: boolean;
        data?: Array<{ id: number; username: string; name: string; surname: string }>;
      }>(`${environment.API_URL}/admin/users`)
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.userOptions.set(
            res.data.map((u) => ({
              label: `${u.username} ${u.name ? `(${u.name} ${u.surname})` : ''}`.trim(),
              value: u.id,
            })),
          );
        }
      });

    // Projects (admin endpoint — includes inactive)
    this.http
      .get<{ success: boolean; data?: Array<{ id: string; name: string }> }>(
        `${environment.API_URL}/projects/list-all`,
      )
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.projectOptions.set(res.data.map((p) => ({ label: p.name, value: p.id })));
        }
      });
  }

  protected onProjectChange(projectId: string): void {
    this.filters.set({ ...this.filters(), projectId, sceneId: '' });
    this.sceneOptions.set([]);
    if (!projectId) return;

    this.http
      .get<{ success: boolean; data?: Array<{ id: string; number: number; name: string }> }>(
        `${environment.API_URL}/projects/${projectId}/scenes`,
      )
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.sceneOptions.set(
            res.data.map((s) => ({
              label: `SC${String(s.number).padStart(2, '0')} — ${s.name}`,
              value: s.id,
            })),
          );
        }
      });
  }

  protected search(): void {
    this.page.set(0);
    this.loadPage();
  }

  protected clearFilters(): void {
    this.filters.set({
      modelName: '',
      userId: null,
      projectId: '',
      sceneId: '',
      status: null,
      resourceType: null,
      dateFrom: '',
      dateTo: '',
    });
    this.sceneOptions.set([]);
    this.search();
  }

  protected onPageChange(ev: PaginatorState): void {
    this.page.set(ev.page ?? 0);
    this.limit.set(ev.rows ?? 20);
    this.loadPage();
  }

  protected sceneLabel(log: GenerationLogEntry): string {
    if (log.scene_name) {
      return log.scene_number != null
        ? `SC${String(log.scene_number).padStart(2, '0')} — ${log.scene_name}`
        : log.scene_name;
    }
    return '';
  }

  /** Returns the PrimeNG icon for a given resource type. */
  protected typeIcon(type: string | undefined | null): string {
    switch (type) {
      case 'video':
        return 'pi pi-video';
      case 'image':
        return 'pi pi-image';
      case 'audio':
        return 'pi pi-volume-up';
      case 'text':
        return 'pi pi-file';
      default:
        return 'pi pi-play';
    }
  }

  // ── Payload dialog ───────────────────────────────────────────────

  protected readonly payloadDialogVisible = signal(false);
  protected readonly selectedPayload = signal<any>(null);
  protected readonly selectedPayloadContent = signal<
    Array<{ type: string; text?: string; name?: string; id?: string }>
  >([]);

  // ── Output preview dialog (type-aware) ────────────────────────────

  protected readonly outputDialogVisible = signal(false);
  protected readonly selectedOutputs = signal<Array<{ url: string; type: string }>>([]);
  protected readonly selectedOutputType = signal<string>('');

  protected showOutput(log: GenerationLogEntry): void {
    try {
      const o = log.outputs.map((out) => {
        return {
          url: RESOLVE_URL(out.localUrl || out.url),
          type: out.type || 'output',
        };
      });
      this.selectedOutputs.set(o);
      this.selectedOutputType.set(log.resource_type || 'output');
      this.outputDialogVisible.set(true);
    } catch {
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid outputs JSON',
        life: 3000,
      });
    }
  }

  // ── Full details dialog ──────────────────────────────────────────

  protected readonly detailsDialogVisible = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly detailsData = signal<GenerationLogEntry | null>(null);

  protected showDetails(log: GenerationLogEntry): void {
    this.detailsLoading.set(true);
    this.detailsError.set(null);
    this.detailsData.set(null);
    this.detailsDialogVisible.set(true);

    this.genLogs
      .getById(log.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.detailsLoading.set(false);
        if (res.error || !res.data) {
          this.detailsError.set(res.msg || 'Failed to load details');
          return;
        }
        this.detailsData.set(res.data);
      });
  }

  protected formatJson(raw: string | undefined | null): string {
    if (!raw) return '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  protected parseOutputs(raw: string | undefined | null): Array<{ url: string; type: string }> {
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // ── Refresh task ─────────────────────────────────────────────────

  protected readonly refreshingId = signal<string | null>(null);

  protected refreshTask(log: GenerationLogEntry): void {
    this.refreshingId.set(log.task_id);
    this.videoGenerator.status(log.task_id).subscribe((res) => {
      this.refreshingId.set(null);
      if (res.error) {
        this.toast.add({
          severity: 'error',
          summary: 'Refresh failed',
          detail: res.msg,
          life: 3000,
        });
        return;
      }
      this.toast.add({
        severity: res.data?.status === 'succeeded' ? 'success' : 'warn',
        summary: 'Task refreshed',
        detail: `Status: ${res.data?.status ?? 'unknown'}`,
        life: 3000,
      });
      this.loadPage();
    });
  }

  private loadPage(): void {
    const f = this.filters();
    this.loading.set(true);
    this.genLogs
      .getLogs({
        model_name: f.modelName || undefined,
        user_id: f.userId ?? undefined,
        project_id: f.projectId || undefined,
        scene_id: f.sceneId || undefined,
        status: f.status ?? undefined,
        resource_type: f.resourceType ?? undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        page: this.page() + 1,
        limit: this.limit(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loading.set(false);
        if (res.error || !res.data) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg, life: 3000 });
          return;
        }
        this.logs.set(res.data.logs || []);
        this.totalRecords.set(res.data.total);
      });
    this.loadCostSummary();
  }

  private loadCostSummary(): void {
    const f = this.filters();
    this.costLoading.set(true);
    this.genLogs
      .getCostSummary({
        model_name: f.modelName || undefined,
        user_id: f.userId ?? undefined,
        project_id: f.projectId || undefined,
        scene_id: f.sceneId || undefined,
        status: f.status ?? undefined,
        resource_type: f.resourceType ?? undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.costLoading.set(false);
        if (res.error || res.data == null) return;
        this.totalCost.set(res.data.total_cost);
      });
  }
}
