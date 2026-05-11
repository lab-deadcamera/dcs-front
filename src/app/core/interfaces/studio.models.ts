/**
 * Domain types for Dead Camera / Seedance Studio.
 * Kept framework-free so they can be reused in state, services, and UI.
 */

export type AspectRatio = '16:9' | '9:16' | '21:9' | '1:1';
export type Resolution = '480p' | '720p' | '1080p';
export type Engine = 'fast' | 'pro';

export type Lens = '24mm-wide' | '35mm-classic' | '50mm-portrait' | '85mm-tele';
export type CameraBody =
  | 'arri-alexa-65'
  | 'red-komodo-6k'
  | 'sony-venice'
  | '16mm-film';
export type CameraMotion = 'static-lock-off' | 'slow-dolly-in' | 'orbit' | 'handheld';
export type ColorGrading =
  | 'blade-runner-2049'
  | 'the-matrix'
  | 'gone-girl'
  | 'interstellar';
export type Genre = 'drama' | 'action' | 'noir' | 'horror';

/** A single option inside a ToggleGroup (chips list). `labelKey` is an i18n key. */
export interface ChipOption<V extends string = string> {
  value: V;
  labelKey: string;
}

export interface CinematographyConfig {
  lens: Lens | null;
  cameraBody: CameraBody | null;
  cameraMotion: CameraMotion | null;
  colorGrading: ColorGrading | null;
  genre: Genre | null;
}

export interface OutputFormatConfig {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  durationSeconds: number;
  sound: boolean;
  engine: Engine;
}

export interface ReferenceAsset {
  id: string;
  kind: 'image' | 'video' | 'audio';
  filename: string;
  thumbnailUrl?: string;
  /** Tag used inside the prompt, e.g. "Image 1", "Video 1". */
  tag: string;
  slot?: 'first-frame' | 'last-frame' | 'free';
}

export interface GeneratedClip {
  id: string;
  prompt: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: number;
  durationSeconds: number;
  resolution: Resolution;
}

export interface StudioUser {
  handle: string;
  initial: string;
}
