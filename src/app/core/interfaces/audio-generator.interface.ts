/**
 * Audio-generation contract (text-to-speech, sound design, music).
 */

export type AudioGeneratorStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type AudioGeneratorKind = 'speech' | 'sfx' | 'music';

export interface AudioGenerateRequest {
  model: string;
  prompt: string;
  /** Drives which audio task the model runs (TTS vs. sound design vs. music). */
  kind?: AudioGeneratorKind;
  /** TTS voice id — ignored for non-speech kinds. */
  voice?: string;
  /** Duration in seconds — caps long-form generations. */
  duration?: number;
  /** Output container — e.g. "mp3", "wav". */
  format?: 'mp3' | 'wav' | 'ogg';
  seed?: number;
}

export interface AudioOutput {
  url: string;
  durationSeconds?: number;
  format?: string;
}

export interface AudioGenerateResponse {
  taskId: string;
  status: AudioGeneratorStatus;
  outputs: AudioOutput[];
  error?: string;
}
