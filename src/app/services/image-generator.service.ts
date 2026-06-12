import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  ImageGenerateRequest,
  ImageGenerateResponse,
} from '@app/core/interfaces/image-generator.interface';

/**
 * HTTP adapter for the AI image-generation API
 *   (POST /api/v1/image/generate, GET /image/status/:id).
 */
@Injectable({ providedIn: 'root' })
export class ImageGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio/image';

  generate(
    payload: ImageGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: ImageGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ImageGenerateResponse | undefined,
    };

    return this.http
      .post<ResponseBase<ImageGenerateResponse>>(`${this.apiUrl}/generate`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<ImageGenerateResponse>),
      );
  }

  status(
    taskId: string,
  ): Observable<{ error: boolean; msg: string; data?: ImageGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ImageGenerateResponse | undefined,
    };

    return this.http
      .get<ResponseBase<ImageGenerateResponse>>(`${this.apiUrl}/status/${taskId}`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<ImageGenerateResponse>),
      );
  }

  /**
   * Dry-run a generation against the model — same payload as `generate()`
   * but the backend returns the resolved/normalized request (e.g. estimated
   * cost, expanded references, validated dimensions) without enqueuing a
   * task. Shape is intentionally loose so the UI can render whatever the
   * backend decides to surface.
   */
  preview(
    payload: ImageGenerateRequest,
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
