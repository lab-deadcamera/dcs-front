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

/**
 * Preset ids are typed as `string` — opaque keys whose only contract is
 * "matches a row in presets.json OR a row added at runtime". The narrow
 * unions were tightened to enable autocomplete on the baseline catalog,
 * but admin-added customs break the closed set, so we relax to string.
 * Lookup invariants are enforced by `PresetsService.findPreset(id)`.
 */
export type LensId = string;
export type CameraBodyId = string;
export type CameraMotionId = string;
export type ColorGradingId = string;
export type GenreId = string;

/** Cinematography categories that accept user-added custom presets. */
export type PresetCategory = 'lens' | 'camera' | 'cameraMotion' | 'colorGrading' | 'genre';

/** A single option inside a ToggleGroup (chips list). */
export interface ChipOption<V extends string = string> {
  value: V;
  /** i18n key used by `labelKey | translate` when `label` is absent. */
  labelKey: string;
  /** Raw label that overrides translation — used by user-added presets. */
  label?: string;
  /** When true, the chip renders a small × that emits `(remove)`. */
  removable?: boolean;
  /** When true, the chip renders a small ✎ that emits `(edit)`. */
  editable?: boolean;
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
  /** Set on rows added by the admin at runtime (vs the curated presets.json). */
  isCustom?: boolean;
  /** Set on baseline rows whose label/prompt the admin has rewritten. */
  isOverridden?: boolean;
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
  /** Number of independent videos to request per generation, 1-4. */
  batchCount: number;
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

/** Maximum number of videos a single generate-click can request. */
export const MAX_BATCH_COUNT = 4;

/** Kind of file an external asset is built from — drives the chip icon. */
export type UsedAssetKind = 'image' | 'video' | 'audio' | 'mixed';

/**
 * A file from the Characters library marked as a reference for the next
 * generation. The `fileId` is what travels to the backend in the unified
 * payload's `content[]`.
 */
export interface UsedAsset {
  /** File UUID from POST /api/v1/files/upload. */
  fileId: string;
  /** Source character id — used for "is this character already used?" lookups. */
  characterId: string;
  /** Display name shown on the chip (typically the character's name). */
  name: string;
  /** Original filename — used by the backend's asset resolver. */
  filename: string;
  /** Aggregated file type — drives the chip icon and content[].type. */
  kind: UsedAssetKind;
}

/** A single in-flight backend generation request. */
export interface PendingGeneration {
  id: string;
  /** Backend task_id — necesario para recuperar el estado tras recarga. */
  taskId: string;
  /** 0–100. */
  progress: number;
  /** Optional "1/3" style label for batched requests. */
  label?: string;
  /** 1-based take number captured at queue time. */
  takeIndex?: number;
  /** Model name used for the generation. */
  modelName?: string;
}

/** Canonical Seedance prompt scaffold. */
export const PROMPT_TEMPLATE = [
  'SUBJECT:',
  '',
  'WARDROBE:',
  '',
  'POSE:',
  '',
  'ENVIRONMENT AND LIGHTING:',
  '',
  'NEGATIVE:',
  '',
  'REFERENCE SLOTS:',
].join('\n');

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
  /**
   * 1-based take number from the active scene session. Stamped when the
   * generation starts so the download filename can be reconstructed from
   * scene + take + user metadata (see SessionStateService.filenameForClip).
   */
  takeIndex?: number;
  /**
   * Snapshot of the inputs that produced this clip — enables the
   * "reuse prompt" affordance in the viewer to repopulate the editor.
   */
  source?: {
    rawDescription: string;
    cinematography: CinematographyConfig;
    output: OutputFormatConfig;
    assets?: {
      firstFrame: ReferenceAsset | null;
      lastFrame: ReferenceAsset | null;
      free: ReferenceAsset[];
    };
  };
}

export interface StudioUser {
  handle: string;
  initial: string;
}
