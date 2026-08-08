import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import {
  FixAssetResult,
  GalleryAsset,
  GalleryModel,
  GenerationLogEntry,
  GenerationLogListResponse,
  ModelAssetSync,
  ResponseBase,
  SyncResultSummary,
} from '@app/core/interfaces';

/**
 * HTTP adapter for studio-side observability and asset-sync endpoints
 *   (GET /studio/logs/generation, GET /studio/synced-assets,
 *    POST /studio/sync-character-assets, DELETE /studio/task/:id).
 *
 * Generation lifecycle (POST /studio/generate, GET /studio/status/:id)
 * moved to the specialized generator services — see
 * `VideoGeneratorService`, `ImageGeneratorService`, etc.
 */
@Injectable({ providedIn: 'root' })
export class GenerationLogsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/studio';

  /**
   * Sum the estimated_cost of generation logs matching the given filters (no pagination).
   * GET /studio/logs/generation/cost-summary
   */
  getCostSummary(filters: {
    project_id?: string;
    scene_id?: string;
    status?: string;
    model_name?: string;
    user_id?: number;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
  }): Observable<{ error: boolean; msg: string; data?: { total_cost: number } }> {
    const params = new URLSearchParams();
    if (filters.project_id) params.set('project_id', filters.project_id);
    if (filters.scene_id) params.set('scene_id', filters.scene_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.model_name) params.set('model_name', filters.model_name);
    if (filters.user_id) params.set('user_id', String(filters.user_id));
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    const qs = params.toString();

    return this.http
      .get<ResponseBase<{ total_cost: number }>>(
        `${this.apiUrl}/logs/generation/cost-summary${qs ? '?' + qs : ''}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<{ total_cost: number }>),
      );
  }

  /**
   * Query generation logs filtered by project/scene. Used to recover state
   * after a reload and to power the admin dashboard.
   */
  getLogs(filters: {
    project_id?: string;
    scene_id?: string;
    status?: string;
    model_name?: string;
    user_id?: number;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Observable<{ error: boolean; msg: string; data?: GenerationLogListResponse }> {
    const params = new URLSearchParams();
    if (filters.project_id) params.set('project_id', filters.project_id);
    if (filters.scene_id) params.set('scene_id', filters.scene_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.model_name) params.set('model_name', filters.model_name);
    if (filters.user_id) params.set('user_id', String(filters.user_id));
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();

    return this.http
      .get<ResponseBase<GenerationLogListResponse>>(
        `${this.apiUrl}/logs/generation${qs ? '?' + qs : ''}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<GenerationLogListResponse>),
      );
  }

  /**
   * Get a single generation log by its ID.
   * GET /studio/logs/generation/:id
   */
  getById(
    id: string,
  ): Observable<{ error: boolean; msg: string; data?: GenerationLogEntry }> {
    return this.http
      .get<ResponseBase<GenerationLogEntry>>(`${this.apiUrl}/logs/generation/${id}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<GenerationLogEntry>),
      );
  }

  /**
   * List assets synced with a model — the per-model sync queue.
   * GET /studio/synced-assets?model_id=X
   */
  getSyncedAssets(
    modelId: string,
  ): Observable<{ error: boolean; msg: string; data?: ModelAssetSync[] }> {
    return this.http
      .get<ResponseBase<ModelAssetSync[]>>(`${this.apiUrl}/synced-assets`, {
        params: { model_id: modelId },
      })
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<ModelAssetSync[]>),
      );
  }

  /**
   * Sync every file of a character with a model.
   * POST /studio/sync-character-assets
   */
  syncCharacterAssets(
    characterId: string,
    modelId: string,
  ): Observable<{ error: boolean; msg: string; data?: SyncResultSummary }> {
    return this.http
      .post<ResponseBase<SyncResultSummary>>(`${this.apiUrl}/sync-character-assets`, {
        character_id: characterId,
        model_id: modelId,
      })
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<SyncResultSummary>),
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

  // ── External galleries (admin view) ───────────────────────────

  /**
   * Models with records in model_assets, with per-status counts.
   * GET /studio/gallery/models
   */
  getGalleryModels(): Observable<{ error: boolean; msg: string; data?: GalleryModel[] }> {
    return this.http
      .get<ResponseBase<GalleryModel[]>>(`${this.apiUrl}/gallery/models`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<GalleryModel[]>),
      );
  }

  /**
   * Sync records for a model, enriched with the internal gallery match
   * (file name/mime + characters). GET /studio/gallery/models/:modelId/assets
   */
  getGalleryAssets(
    modelId: string,
  ): Observable<{ error: boolean; msg: string; data?: GalleryAsset[] }> {
    return this.http
      .get<ResponseBase<GalleryAsset[]>>(`${this.apiUrl}/gallery/models/${modelId}/assets`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<GalleryAsset[]>),
      );
  }

  /**
   * Last failed sync attempts for one file in one model.
   * GET /studio/gallery/errors?model_id=&file_id=
   */
  getGalleryErrors(
    modelId: string,
    fileId: string,
  ): Observable<{ error: boolean; msg: string; data?: ModelAssetSync[] }> {
    return this.http
      .get<ResponseBase<ModelAssetSync[]>>(`${this.apiUrl}/gallery/errors`, {
        params: { model_id: modelId, file_id: fileId },
      })
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<ModelAssetSync[]>),
      );
  }

  /**
   * Retry a failed sync, auto-fixing the image first (normalize geometry,
   * or regenerate with AI when mode is "ai" / normalize fails).
   * POST /studio/gallery/fix-asset
   */
  fixAsset(
    modelId: string,
    fileId: string,
    mode?: 'auto' | 'normalize' | 'ai',
    ratio?: string,
    model?: string,
  ): Observable<{ error: boolean; msg: string; data?: FixAssetResult }> {
    return this.http
      .post<ResponseBase<FixAssetResult>>(`${this.apiUrl}/gallery/fix-asset`, {
        model_id: modelId,
        file_id: fileId,
        ...(mode ? { mode } : {}),
        ...(ratio ? { ratio } : {}),
        ...(model ? { model } : {}),
      })
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<FixAssetResult>),
      );
  }
}
