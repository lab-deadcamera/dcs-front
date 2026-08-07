import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import {
  ResponseBase,
  ShotBuilderLogDetailResponse,
  ShotBuilderLogListResponse,
} from '@app/core/interfaces';

/**
 * HTTP adapter for the shot builder error log (failed generate-shots calls):
 *   GET /studio/text/claude/generate-shots-logs
 *   GET /studio/text/claude/generate-shots-logs/:id
 */
@Injectable({ providedIn: 'root' })
export class ShotBuilderLogsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio/text/claude';

  /**
   * List failed generate-shots calls, filterable and paginated.
   */
  getLogs(filters: {
    project_id?: string;
    user_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Observable<{ error: boolean; msg: string; data?: ShotBuilderLogListResponse }> {
    const params = new URLSearchParams();
    if (filters.project_id) params.set('project_id', filters.project_id);
    if (filters.user_id) params.set('user_id', String(filters.user_id));
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();

    return this.http
      .get<ResponseBase<ShotBuilderLogListResponse>>(
        `${this.apiUrl}/generate-shots-logs${qs ? '?' + qs : ''}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<ShotBuilderLogListResponse>),
      );
  }

  /**
   * Get a single failed generate-shots call with its Claude attempts.
   */
  getById(
    id: string,
  ): Observable<{ error: boolean; msg: string; data?: ShotBuilderLogDetailResponse }> {
    return this.http
      .get<ResponseBase<ShotBuilderLogDetailResponse>>(
        `${this.apiUrl}/generate-shots-logs/${id}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<ShotBuilderLogDetailResponse>),
      );
  }
}
