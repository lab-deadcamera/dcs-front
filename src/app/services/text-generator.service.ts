import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  TextGenerateRequest,
  TextGenerateResponse,
} from '@app/core/interfaces/text-generator.interface';

/**
 * HTTP adapter for the AI text-generation API
 *   (POST /api/v1/text/generate, GET /text/status/:id).
 *
 * Mirrors `SeedanceService`'s normalized `{ error, msg, data }` envelope
 * so callers consume every generator the same way.
 */
@Injectable({ providedIn: 'root' })
export class TextGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio/text';

  generate(
    payload: TextGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: TextGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as TextGenerateResponse | undefined,
    };

    return this.http
      .post<ResponseBase<TextGenerateResponse>>(`${this.apiUrl}/generate`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<TextGenerateResponse>),
      );
  }

  status(
    taskId: string,
  ): Observable<{ error: boolean; msg: string; data?: TextGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as TextGenerateResponse | undefined,
    };

    return this.http
      .get<ResponseBase<TextGenerateResponse>>(`${this.apiUrl}/status/${taskId}`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<TextGenerateResponse>),
      );
  }

  /**
   * Dry-run a generation against the model — same payload as `generate()`
   * but the backend returns the resolved/normalized request (e.g. token
   * estimate, cost, expanded references) without enqueuing a task. Shape
   * is intentionally loose so the UI can render whatever the backend
   * decides to surface.
   */
  preview(
    payload: TextGenerateRequest,
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


