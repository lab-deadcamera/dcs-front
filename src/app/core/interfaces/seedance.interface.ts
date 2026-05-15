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
}

/**
 * Body of every async response from /studio/generate and /studio/status.
 * The shape is identical regardless of whether the task is in-flight or
 * complete — only `status` and `outputs` differ.
 */
export interface StudioTaskResponse {
  taskId: string;
  status: StudioTaskStatus;
  outputs: StudioOutput[];
  /** Backend-set human-readable error when status === 'failed'. */
  error?: string;
}
