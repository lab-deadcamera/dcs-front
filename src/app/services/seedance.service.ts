import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GenerationLogEntry } from '@app/core/interfaces';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import {
  ResponseBase,
  StudioGenerateRequest,
  StudioTaskResponse,
} from '@app/core/interfaces';

/**
 * HTTP adapter for the unified Studio generation API
 *   (POST /api/v1/studio/generate, GET /studio/status/:id, DELETE /studio/task/:id).
 *
 * Maps the canonical `ResponseBase<T>` wire shape into the project-wide
 * normalized `{ error, msg, data }` callers consume. Polling cadence is
 * left to the caller — see IndexStudio.runOneGeneration for the 3s loop.
 *
 * dcs-back internally proxies to BytePlus ModelArk, signs requests with
 * AK/SK, and converts uploaded file IDs into `asset://` URIs when the
 * model is configured for asset sync. The frontend deals only with the
 * unified payload above.
 */
@Injectable({ providedIn: 'root' })
export class SeedanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio';

  /**
   * Submit a generation task. The response carries a `taskId` and a
   * `status` of `queued` or `running` — callers must poll `status(taskId)`
   * until `succeeded` or `failed`.
   */
  generate(
    payload: StudioGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: StudioTaskResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as StudioTaskResponse | undefined,
    };

    return this.http
      .post<ResponseBase<StudioTaskResponse>>(`${this.apiUrl}/generate`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<StudioTaskResponse>),
      );
  }

  /**
   * Poll the status of a previously submitted task. Returns the same
   * shape as `generate(...)`. `outputs` is empty while running and
   * populated once `status === 'succeeded'`.
   */
  status(
    taskId: string,
  ): Observable<{ error: boolean; msg: string; data?: StudioTaskResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as StudioTaskResponse | undefined,
    };

    return this.http
      .get<ResponseBase<StudioTaskResponse>>(`${this.apiUrl}/status/${taskId}`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<StudioTaskResponse>),
      );
  }

  /**
   * Query generation logs filtrados por proyecto/escena. Permite recuperar
   * el estado de generaciones tras una recarga o desde la vista de admin.
   */
  getLogs(filters: {
    project_id?: string;
    scene_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<{ error: boolean; msg: string; data?: import('@app/core/interfaces/seedance.interface').GenerationLogListResponse }> {
    const params = new URLSearchParams();
    if (filters.project_id) params.set('project_id', filters.project_id);
    if (filters.scene_id) params.set('scene_id', filters.scene_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();

    return this.http
      .get<import('@app/core/interfaces/api.interface').ResponseBase<import('@app/core/interfaces/seedance.interface').GenerationLogListResponse>>(
        `${this.apiUrl}/logs/generation${qs ? '?' + qs : ''}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<import('@app/core/interfaces/seedance.interface').GenerationLogListResponse>),
      );
  }

  /** Cancel an in-flight task. No-op on the backend if already terminal. */
  cancel(taskId: string): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<ResponseBase<void>>(`${this.apiUrl}/task/${taskId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }
}
