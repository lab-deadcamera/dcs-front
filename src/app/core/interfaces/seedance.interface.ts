/**
 * Studio generation contract — mirrors dcs-back's unified payload system.
 *
 * Wire types follow the doc at
 *   dcs-back/docs/use-cases/studio-generation.md
 *
 * The frontend only talks to dcs-back; dcs-back relays to BytePlus
 * ModelArk and handles AK/SK signing internally.
 */

/** Type discriminator for items in the `content[]` array. */
export type StudioContentType = 'text' | 'image' | 'video' | 'audio';

/** A single piece of context attached to the request. */
export type StudioContentItem =
  | { type: 'text'; text: string }
  | {
      type: 'image' | 'video' | 'audio';
      /** File UUID returned by POST /api/v1/files/upload. */
      id: string;
      /** Original filename — used by the backend for asset resolution. */
      name: string;
      /** Caption used inside the prompt (e.g. "First Frame", "Image 1"). */
      text: string;
    };

export type StudioTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** Single produced artifact — usually a video URL. */
export interface StudioOutput {
  url: string;
  type: 'video' | 'image';
}

/**
 * Body of POST /api/v1/studio/generate.
 *
 * The frontend always sends `quantity: 1` — batching is done client-side
 * by dispatching N independent generate calls so each video has its own
 * task id, status, and progress indicator.
 */
export interface StudioGenerateRequest {
  /** Backend model id, e.g. "dreamina-seedance-2-0-fast-260128". */
  model: string;
  content: StudioContentItem[];
  /** Aspect ratio — must match the model's allowed set ("16:9", "9:16", …). */
  ratio: string;
  /** Clip length in seconds. */
  duration: number;
  /** Lock the virtual camera to a static position. */
  camerafixed: boolean;
  /** Optional seed for reproducibility — empty string lets the backend choose. */
  seed: string;
  quality: 'standard' | 'high';
  quantity: number;
  watermark: boolean;
  /** Output resolution — must match the model's allowed set ("480p", "720p", "1080p"). */
  resolution: string;
  generate_audio: boolean;
  /** BytePlus-specific image processing mode. Hardcoded to "PIL" until docs cover alternatives. */
  image_mode: 'PIL';

  /** Session tracking — obligatorio para registrar la generación y recuperar estado. */
  project_id: string;
  scene_id: string;
  scene_code: string;
  take_number: number;
  user_id: number;
}

/**
 * Body of every async response from /studio/generate and /studio/status.
 * The shape is identical regardless of whether the task is in-flight or
 * complete — only `status` and `outputs` differ.
 */
/** Entry from generation_logs — permite recuperar estado desde el backend. */
export interface GenerationLogEntry {
  id: string;
  task_id: string;
  model_name: string;
  user_id?: number;
  project_id: string;
  scene_id: string;
  scene_code: string;
  take_number?: number;
  request: string;
  outputs: string;
  status: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  // Enriched fields (LEFT JOIN desde el backend)
  user_name?: string;
  user_display_name?: string;
  project_name?: string;
  scene_name?: string;
  scene_number?: number;
}

/** Paginated wrapper for GET /studio/logs/generation. */
export interface GenerationLogListResponse {
  logs: GenerationLogEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Sync record — model_assets table, devuelto por GET /studio/synced-assets. */
export interface ModelAssetSync {
  id: string;
  model_id: string;
  file_id: string;
  asset_id: string;
  asset_group_id: string;
  status: string; // "syncing", "active", "failed"
  error_message: string;
  created_at: string;
  updated_at: string;
}

/** Resumen del sync de un personaje. */
export interface SyncResultSummary {
  model_id: string;
  total: number;
  successful: number;
  failed: number;
  results: SyncAssetItem[];
}

export interface SyncAssetItem {
  id: string;
  model_id: string;
  file_id: string;
  asset_id: string;
  asset_group_id: string;
  status: string;
  error_message: string;
}

/** Paginated wrapper for GET /studio/logs/generation. */
export interface GenerationLogListResponse {
  logs: GenerationLogEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StudioTaskResponse {
  taskId: string;
  status: StudioTaskStatus;
  outputs: StudioOutput[];
  /** Backend-set human-readable error when status === 'failed'. */
  error?: string;
}
