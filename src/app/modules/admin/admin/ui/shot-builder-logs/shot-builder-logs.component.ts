import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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

import { ShotBuilderLogsService } from '@app/services';
import {
  ShotBuilderAttempt,
  ShotBuilderLogEntry,
  ShotBuilderLogSummary,
} from '@core/interfaces';
import { environment } from '@environment/environment';

interface SelectOption {
  label: string;
  value: string;
}

interface UserOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-shot-builder-logs',
  imports: [
    TranslatePipe,
    DatePipe,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    PaginatorModule,
    DialogModule,
    TooltipModule,
    ToastModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  templateUrl: './shot-builder-logs.component.html',
})
export class ShotBuilderLogsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly logsSvc = inject(ShotBuilderLogsService);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  // Dropdown options
  protected readonly userOptions = signal<UserOption[]>([]);
  protected readonly projectOptions = signal<SelectOption[]>([]);

  protected readonly filters = signal({
    userId: null as number | null,
    projectId: '',
    dateFrom: '',
    dateTo: '',
  });

  protected readonly logs = signal<ShotBuilderLogSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly page = signal(0);
  protected readonly limit = signal(20);

  // ── Detail dialog ────────────────────────────────────────────────

  protected readonly detailsDialogVisible = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly detailsLog = signal<ShotBuilderLogEntry | null>(null);
  protected readonly detailsAttempts = signal<ShotBuilderAttempt[]>([]);

  ngOnInit(): void {
    this.loadDropdowns();
    this.search();
  }

  private loadDropdowns(): void {
    // Users (admin endpoint)
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

  protected search(): void {
    this.page.set(0);
    this.loadPage();
  }

  protected clearFilters(): void {
    this.filters.set({ userId: null, projectId: '', dateFrom: '', dateTo: '' });
    this.search();
  }

  protected onPageChange(ev: PaginatorState): void {
    this.page.set(ev.page ?? 0);
    this.limit.set(ev.rows ?? 20);
    this.loadPage();
  }

  protected showDetails(log: ShotBuilderLogSummary): void {
    this.detailsLoading.set(true);
    this.detailsError.set(null);
    this.detailsLog.set(null);
    this.detailsAttempts.set([]);
    this.detailsDialogVisible.set(true);

    this.logsSvc
      .getById(log.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.detailsLoading.set(false);
        if (res.error || !res.data) {
          this.detailsError.set(res.msg || 'Failed to load details');
          return;
        }
        this.detailsLog.set(res.data.log);
        this.detailsAttempts.set(res.data.attempts || []);
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

  protected formatTokens(log: ShotBuilderLogSummary): string {
    return `${log.total_input_tokens.toLocaleString()}/${log.total_output_tokens.toLocaleString()}`;
  }

  protected formatDuration(ms: number): string {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  private loadPage(): void {
    const f = this.filters();
    this.loading.set(true);
    this.logsSvc
      .getLogs({
        user_id: f.userId ?? undefined,
        project_id: f.projectId || undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        page: this.page() + 1,
        limit: this.limit(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loading.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: res.msg,
            life: 3000,
          });
          return;
        }
        this.logs.set(res.data.logs || []);
        this.totalRecords.set(res.data.total);
      });
  }
}
