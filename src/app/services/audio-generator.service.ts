import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  AudioGenerateRequest,
  AudioGenerateResponse,
} from '@app/core/interfaces/audio-generator.interface';

/**
 * HTTP adapter for the AI audio-generation API
 *   (POST /api/v1/audio/generate, GET /audio/status/:id).
 */
@Injectable({ providedIn: 'root' })
export class AudioGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio/audio';

  generate(
    payload: AudioGenerateRequest,
  ): Observable<{ error: boolean; msg: string; data?: AudioGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as AudioGenerateResponse | undefined,
    };

    return this.http
      .post<ResponseBase<AudioGenerateResponse>>(`${this.apiUrl}/generate`, payload)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<AudioGenerateResponse>),
      );
  }

  status(
    taskId: string,
  ): Observable<{ error: boolean; msg: string; data?: AudioGenerateResponse }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as AudioGenerateResponse | undefined,
    };

    return this.http
      .get<ResponseBase<AudioGenerateResponse>>(`${this.apiUrl}/status/${taskId}`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<AudioGenerateResponse>),
      );
  }

  /**
   * Dry-run a generation against the model — same payload as `generate()`
   * but the backend returns the resolved/normalized request (e.g. estimated
   * cost, voice availability, duration limits) without enqueuing a task.
   * Shape is intentionally loose so the UI can render whatever the backend
   * decides to surface.
   */
  preview(
    payload: AudioGenerateRequest,
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
