/**
 * Domain types for Dead Camera / Seedance Studio.
 * Kept framework-free so they can be reused in state, services, and UI.
 *
 * Ids match the verbatim ids from `presets.json` (mirrored from dcs-v0)
 * so the compiled prompt aligns byte-for-byte with the reference repo.
 */

export type AspectRatio = '16:9' | '9:16' | '21:9' | '1:1';
export type Resolution = '480p' | '720p' | '1080p';
export type Engine = 'fast' | 'pro';

export type LensId = 'wide_24mm' | 'classic_35mm' | 'portrait_50mm' | 'tele_85mm';
export type CameraBodyId =
  | 'arri_alexa'
  | 'red_komodo'
  | 'sony_venice'
  | 'film_16mm';
export type CameraMotionId =
  | 'static_lockoff'
  | 'slow_dolly_in'
  | 'orbit'
  | 'handheld';
export type ColorGradingId =
  | 'blade_runner_2049'
  | 'the_matrix'
  | 'gone_girl'
  | 'interstellar';
export type GenreId = 'drama' | 'action' | 'noir' | 'horror';

/** A single option inside a ToggleGroup (chips list). */
export interface ChipOption<V extends string = string> {
  value: V;
  labelKey: string;
}

/**
 * Cinematographic preset. The `prompt` field is the verbatim English text
 * injected into the final BytePlus prompt (not translated).
 */
export interface Preset {
  id: string;
  label: string;
  prompt: string;
  /** Resolved at runtime by PresetsService — i18n key for the chip label. */
  labelKey: string;
}

/** Technical option (aspect ratio, resolution) — has a literal `value`. */
export interface SpecOption {
  id: string;
  label: string;
  value: string;
  labelKey: string;
}

/** The raw presets.json schema as it lives on disk (no labelKey yet). */
export interface PresetsFile {
  lens: Array<{ id: string; label: string; prompt: string }>;
  camera: Array<{ id: string; label: string; prompt: string }>;
  cameraMotion: Array<{ id: string; label: string; prompt: string }>;
  colorGrading: Array<{ id: string; label: string; prompt: string }>;
  genre: Array<{ id: string; label: string; prompt: string }>;
  aspectRatio: Array<{ id: string; label: string; value: string }>;
  resolution: Array<{ id: string; label: string; value: string }>;
}

export interface CinematographyConfig {
  lens: LensId | null;
  cameraBody: CameraBodyId | null;
  cameraMotion: CameraMotionId | null;
  colorGrading: ColorGradingId | null;
  genre: GenreId | null;
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
  /** User-set success rating 1-5, undefined = unrated. */
  rating?: number;
}

export interface StudioUser {
  handle: string;
  initial: string;
}
