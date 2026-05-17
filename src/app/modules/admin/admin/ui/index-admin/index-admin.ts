import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SeedanceService } from '@app/services';
import { GenerationLogEntry } from '@core/interfaces/seedance.interface';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { map, catchError } from 'rxjs';
import { httpErrorHandler } from '@shared/utils';

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
    SelectModule,
    PaginatorModule,
    ToastModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <section class="px-6 py-6">
      <div class="mb-6">
        <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">Generation Logs</h1>
        <p class="mt-1 text-[12px] text-fg-muted">
          All generation requests submitted to models — filterable and paginated.
        </p>
      </div>

      <!-- Filters -->
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Model</label>
          <p-select
            [options]="modelOptions()"
            [ngModel]="filters().modelName"
            (ngModelChange)="filters.set({ ...filters(), modelName: $event ?? '' })"
            [filter]="true"
            filterBy="label"
            optionLabel="label"
            optionValue="value"
            placeholder="Any model"
            [showClear]="true"
            styleClass="w-48"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">User</label>
          <p-select
            [options]="userOptions()"
            [ngModel]="filters().userId"
            (ngModelChange)="filters.set({ ...filters(), userId: $event ?? null })"
            [filter]="true"
            filterBy="label"
            optionLabel="label"
            optionValue="value"
            placeholder="Any user"
            [showClear]="true"
            styleClass="w-48"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Project</label>
          <p-select
            [options]="projectOptions()"
            [ngModel]="filters().projectId"
            (ngModelChange)="onProjectChange($event ?? '')"
            [filter]="true"
            filterBy="label"
            optionLabel="label"
            optionValue="value"
            placeholder="Any project"
            [showClear]="true"
            styleClass="w-48"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Scene</label>
          <p-select
            [options]="sceneOptions()"
            [ngModel]="filters().sceneId"
            (ngModelChange)="filters.set({ ...filters(), sceneId: $event ?? '' })"
            [filter]="true"
            filterBy="label"
            optionLabel="label"
            optionValue="value"
            placeholder="Any scene"
            [showClear]="true"
            styleClass="w-48"
            [disabled]="!filters().projectId"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Status</label>
          <p-select
            [options]="statusOptions"
            [ngModel]="filters().status"
            (ngModelChange)="filters.set({ ...filters(), status: $event ?? null })"
            placeholder="Any"
            [showClear]="true"
            styleClass="w-32"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">From</label>
          <input
            pInputText
            type="date"
            [ngModel]="filters().dateFrom"
            (ngModelChange)="filters.set({ ...filters(), dateFrom: $event })"
            class="w-36"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">To</label>
          <input
            pInputText
            type="date"
            [ngModel]="filters().dateTo"
            (ngModelChange)="filters.set({ ...filters(), dateTo: $event })"
            class="w-36"
          />
        </div>
        <p-button label="Search" icon="pi pi-search" (onClick)="search()" />
        <p-button label="Clear" severity="secondary" [text]="true" (onClick)="clearFilters()" />
      </div>

      <!-- Loading -->
      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading…</p>
      }

      <!-- Table -->
      @if (!loading() && logs().length > 0) {
        <div class="overflow-x-auto rounded border" style="border-color: var(--border-color);">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <th class="px-3 py-2 font-medium">Task ID</th>
                <th class="px-3 py-2 font-medium">Model</th>
                <th class="px-3 py-2 font-medium">User</th>
                <th class="px-3 py-2 font-medium">Project</th>
                <th class="px-3 py-2 font-medium">Scene</th>
                <th class="px-3 py-2 font-medium">Take</th>
                <th class="px-3 py-2 font-medium">Status</th>
                <th class="px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.id) {
                <tr class="border-t" style="border-color: var(--border-color);">
                  <td class="max-w-[140px] truncate px-3 py-2 font-mono" [title]="log.task_id">
                    {{ log.task_id }}
                  </td>
                  <td class="px-3 py-2 font-mono">{{ log.model_name }}</td>
                  <td class="px-3 py-2 font-mono">{{ log.user_id ?? '—' }}</td>
                  <td class="max-w-[120px] truncate px-3 py-2 font-mono" [title]="log.project_id">
                    {{ log.project_id || '—' }}
                  </td>
                  <td class="max-w-[120px] truncate px-3 py-2 font-mono" [title]="log.scene_id">
                    {{ log.scene_id || '—' }}
                  </td>
                  <td class="px-3 py-2 font-mono">{{ log.take_number ?? '—' }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      [class.bg-green-900/40]="log.status === 'succeeded'"
                      [class.text-green-400]="log.status === 'succeeded'"
                      [class.bg-yellow-900/40]="log.status === 'queued' || log.status === 'running'"
                      [class.text-yellow-400]="log.status === 'queued' || log.status === 'running'"
                      [class.bg-red-900/40]="log.status === 'failed'"
                      [class.text-red-400]="log.status === 'failed'"
                    >
                      {{ log.status }}
                    </span>
                    @if (log.error_message) {
                      <p class="mt-0.5 text-[10px] text-red-400">{{ log.error_message }}</p>
                    }
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">
                    {{ log.created_at | date: 'dd/MM/yy HH:mm' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p-paginator
          [totalRecords]="totalRecords()"
          [rows]="limit()"
          [rowsPerPageOptions]="[10, 20, 50]"
          (onPageChange)="onPageChange($event)"
          class="mt-3"
        />
      }

      @if (!loading() && logs().length === 0) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">
          No generation logs match the current filters.
        </p>
      }
    </section>

    <p-toast position="top-right" />
  `,
})
export class IndexAdmin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly seedance = inject(SeedanceService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

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
    dateFrom: '',
    dateTo: '',
  });

  protected readonly logs = signal<GenerationLogEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly page = signal(0);
  protected readonly limit = signal(20);

  ngOnInit(): void {
    this.loadDropdowns();
    this.search();
  }

  private loadDropdowns(): void {
    // Models
    this.http
      .get<{ success: boolean; data?: Array<{ id: string; name: string }> }>(`${environment.API_URL}/models`)
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.modelOptions.set(
            res.data.map((m) => ({ label: m.name, value: m.name })),
          );
        }
      });

    // Users
    this.http
      .get<{ success: boolean; data?: Array<{ id: number; username: string; name: string; surname: string }> }>(
        `${environment.API_URL}/admin/users`,
      )
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

    // Projects
    this.http
      .get<{ success: boolean; data?: Array<{ id: string; name: string }> }>(`${environment.API_URL}/projects`)
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.projectOptions.set(
            res.data.map((p) => ({ label: p.name, value: p.id })),
          );
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
    this.filters.set({ modelName: '', userId: null, projectId: '', sceneId: '', status: null, dateFrom: '', dateTo: '' });
    this.sceneOptions.set([]);
    this.search();
  }

  protected onPageChange(ev: PaginatorState): void {
    this.page.set(ev.page ?? 0);
    this.limit.set(ev.rows ?? 20);
    this.loadPage();
  }

  private loadPage(): void {
    const f = this.filters();
    this.loading.set(true);
    this.seedance.getLogs({
      model_name: f.modelName || undefined,
      user_id: f.userId ?? undefined,
      project_id: f.projectId || undefined,
      scene_id: f.sceneId || undefined,
      status: f.status ?? undefined,
      date_from: f.dateFrom || undefined,
      date_to: f.dateTo || undefined,
      page: this.page() + 1,
      limit: this.limit(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
      this.loading.set(false);
      if (res.error || !res.data) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg, life: 3000 });
        return;
      }
      this.logs.set(res.data.logs);
      this.totalRecords.set(res.data.total);
    });
  }
}
