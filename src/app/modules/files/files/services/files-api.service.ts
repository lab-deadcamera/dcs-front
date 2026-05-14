import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { FileCategory, FileEntity, FileStorage, FileWire, UploadParams } from '../interfaces';
import { ResponseBase } from '@app/core/interfaces';

/**
 * HTTP adapter for /api/v1/files.
 *
 * Handles multipart upload, list (per category + storage), serve URL
 * construction, soft/hard delete, restore, and the temp-storage recovery
 * flow. Maps the wire format (snake_case + missing `url`) into the domain
 * `FileEntity` (camelCase, always-present serve URL).
 */
@Injectable({ providedIn: 'root' })
export class FilesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/files';

  /** Compute the public serve URL for a file id. */
  serveUrl(id: string): string {
    return `${this.apiUrl}/${id}/serve`;
  }

  upload(payload: UploadParams): Observable<{ error: boolean; msg: string; data?: FileEntity }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as FileEntity | undefined,
    };

    const form = new FormData();
    form.append('file', payload.file);
    form.append('category', payload.category);
    form.append('storage', payload.storage);

    return this.http.post<ResponseBase<FileWire>>(`${this.apiUrl}/upload`, form).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data ? this.toEntity(r.data) : undefined;
        return res;
      }),
      catchError(httpErrorHandler<FileEntity>),
    );
  }

  list(
    category?: FileCategory,
    storage: FileStorage = 'persistent',
  ): Observable<{ error: boolean; msg: string; data?: FileEntity[] }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as FileEntity[] | undefined,
    };

    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    qs.set('storage', storage);

    return this.http.get<ResponseBase<FileWire[]>>(`${this.apiUrl}?${qs.toString()}`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data.map((w) => this.toEntity(w));
        return res;
      }),
      catchError(httpErrorHandler<FileEntity[]>),
    );
  }

  listTrash(): Observable<{
    error: boolean;
    msg: string;
    data?: FileEntity[];
  }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as FileEntity[] | undefined,
    };

    return this.http.get<ResponseBase<FileWire[]>>(`${this.apiUrl}/trash`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data.map((w) => this.toEntity(w));
        return res;
      }),
      catchError(httpErrorHandler<FileEntity[]>),
    );
  }

  getById(id: string): Observable<{ error: boolean; msg: string; data?: FileEntity }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as FileEntity | undefined,
    };

    return this.http.get<ResponseBase<FileWire>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data ? this.toEntity(r.data) : undefined;
        return res;
      }),
      catchError(httpErrorHandler<FileEntity>),
    );
  }

  /** Soft delete — moves the file to trash. */
  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<void>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  /** Restore a persistent file from trash. */
  restore(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.post<ResponseBase<void>>(`${this.apiUrl}/${id}/restore`, {}).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  /** Restore a temp-storage file (cron exempt) from trash. */
  recoverTemp(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.post<ResponseBase<void>>(`${this.apiUrl}/${id}/recover-temp`, {}).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  /** Hard delete — irreversibly removes the file. */
  hardDelete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<void>>(`${this.apiUrl}/${id}/hard`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  /** Always returns a usable serve URL, even when the wire payload omits it. */
  private toEntity(w: FileWire): FileEntity {
    return {
      id: w.id,
      filename: w.filename,
      url: w.url ?? this.serveUrl(w.id),
      size: w.size,
      mimeType: w.mime_type,
      format: w.format,
      category: w.category,
      storage: w.storage,
      createdAt: w.created_at,
      deletedAt: w.deleted_at ?? null,
    };
  }
}
