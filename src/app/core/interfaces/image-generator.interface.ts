/**
 * Image-generation contract (text-to-image and image-to-image).
 */

export type ImageGeneratorStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ImageReference {
  /** File UUID from POST /files/upload. */
  fileId: string;
  /** Hint for how the reference should influence generation. */
  role?: 'subject' | 'style' | 'pose';
}

export interface ImageGenerateRequest {
  model: string;
  prompt: string;
  /** Aspect ratio — e.g. "1:1", "16:9", "9:16". */
  ratio: string;
  /** Output edge length (px) or named tier — e.g. "1024", "2048". */
  resolution?: string;
  negativePrompt?: string;
  references?: ImageReference[];
  /** Number of images to generate (caller batches if > 1). */
  quantity?: number;
  seed?: number;
}

export interface ImageOutput {
  url: string;
  width?: number;
  height?: number;
}

export interface ImageGenerateResponse {
  taskId: string;
  status: ImageGeneratorStatus;
  outputs: ImageOutput[];
  error?: string;
}
