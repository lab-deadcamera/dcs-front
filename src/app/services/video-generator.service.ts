import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  VideoGenerateRequest,
  VideoGenerateResponse,
} from '@app/core/interfaces/video-generator.interface';

/**
 * HTTP adapter for the AI video-generation API
 *   (POST /api/v1/studio/generate, GET /studio/status/:id).
 *
 * Took over from `SeedanceService.generate/status`. The backend endpoints
 * are unchanged — only the frontend boundary has been split so each asset
 * kind owns its own service and contract.
 */
@Injectable({ providedIn: 'root' })
export class VideoGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio/video';

  generate(
    payload: VideoGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: VideoGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as VideoGenerateResponse | undefined,
    };

    return this.http
      .post<ResponseBase<VideoGenerateResponse>>(`${this.apiUrl}/generate`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<VideoGenerateResponse>),
      );
  }

  status(
    taskId: string,
  ): Observable<{ error: boolean; msg: string; data?: VideoGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as VideoGenerateResponse | undefined,
    };

    return this.http
      .get<ResponseBase<VideoGenerateResponse>>(`${this.apiUrl}/status/${taskId}`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<VideoGenerateResponse>),
      );
  }

  /**
   * Dry-run a generation against the model — same payload as `generate()`
   * but the backend returns the resolved/normalized request (e.g. estimated
   * cost, expanded references, validated resolution) without enqueuing a
   * task. Shape is intentionally loose so the UI can render whatever the
   * backend decides to surface.
   */
  preview(
    payload: VideoGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: Record<string, unknown> }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as Record<string, unknown> | undefined,
    };

    return this.http
      .post<ResponseBase<Record<string, unknown>>>(`${this.apiUrl}/preview`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<Record<string, unknown>>),
      );
  }
}
