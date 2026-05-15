import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  CinematographyConfig,
  GeneratedClip,
  OutputFormatConfig,
} from '../interfaces/studio.models';
import { AssetsStateService } from './assets.state';
import { PresetsService } from './presets.service';
import { StudioStorageService } from './studio-storage.service';

/** Bump when the persisted shape changes; older snapshots are discarded. */
const SCHEMA_VERSION = 6;

/** Maximum number of videos a single generate-click can request. */
export const MAX_BATCH_COUNT = 4;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Kind of file an external asset is built from — drives the chip icon. */
export type UsedAssetKind = 'image' | 'video' | 'audio' | 'mixed';

/**
 * A file from the Characters library marked as a reference for the next
 * generation. The `fileId` is what travels to the backend in the unified
 * payload's `content[]` — character ids are only useful for the UI.
 */
export interface UsedAsset {
  /** File UUID from POST /api/v1/files/upload — required for the API. */
  fileId: string;
  /** Source character id — used for "is this character already used?" lookups. */
  characterId: string;
  /** Display name shown on the chip (typically the character's name). */
  name: string;
  /** Original filename — used by the backend's asset resolver. */
  filename: string;
  /** Aggregated file type — drives the chip icon and the content[].type. */
  kind: UsedAssetKind;
}

/** A single in-flight backend generation request. */
export interface PendingGeneration {
  id: string;
  /** 0–100. Stays at 0 until the backend reports otherwise. */
  progress: number;
  /** Optional "1/3" style label so batched requests can be told apart. */
  label?: string;
  /**
   * 1-based take number captured at the moment the request was queued.
   * Propagates to the resulting `GeneratedClip.takeIndex` so the download
   * filename reflects the take the user was working on when they clicked
   * generate — independent of whether they advance the cursor later.
   */
  takeIndex?: number;
}

/**
 * Maps each cinematography preset slot to the section header in the prompt
 * scaffold where the preset's prompt text should be injected. Camera body
 * lives next to lens/motion because they all describe the shot setup.
 */
const PRESET_SECTION_TARGETS = {
  lens: 'POSE:',
  cameraBody: 'POSE:',
  cameraMotion: 'POSE:',
  colorGrading: 'ENVIRONMENT AND LIGHTING:',
  genre: 'ENVIRONMENT AND LIGHTING:',
} as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Canonical Seedance prompt scaffold — pre-loaded into the textarea so the
 * user fills each section instead of writing free-form. Order and headers
 * are the structure approved by the Seedance team and must not drift.
 */
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

interface PromptSnapshot {
  __v?: number;
  rawDescription: string;
  cinematography: CinematographyConfig;
  output: OutputFormatConfig;
  sessionClips: GeneratedClip[];
  activeClipId: string | null;
  /** External assets pulled in from the Characters library. */
  usedAssets?: UsedAsset[];
}

/**
 * Holds the prompt state. A single textarea (`rawDescription`) is the
 * sole source of prompt text — cinematography presets are woven into
 * the corresponding section headers via `syncPromptInjections` so what
 * the user sees in the editor is exactly what the API receives.
 *
 * Reference assets travel separately in the generate-payload's
 * `content[]` array (see IndexStudio.buildPayload). They surface in the
 * editor as chips above the textarea, not as inline tokens.
 *
 * Persisted in IndexedDB via StudioStorageService.
 */
@Injectable({ providedIn: 'root' })
export class PromptStateService {
  private readonly storage = inject(StudioStorageService);
  private readonly presets = inject(PresetsService);
  private readonly assets = inject(AssetsStateService);
  private hydrated = false;

  private readonly _rawDescription = signal<string>(PROMPT_TEMPLATE);

  private readonly _cinematography = signal<CinematographyConfig>({
    lens: null,
    cameraBody: null,
    cameraMotion: null,
    colorGrading: null,
    genre: null,
  });

  private readonly _output = signal<OutputFormatConfig>({
    aspectRatio: '16:9',
    resolution: '480p',
    durationSeconds: 5,
    sound: false,
    engine: 'fast',
    batchCount: 1,
  });

  /**
   * In-flight generation tasks. Each entry tracks a single backend call so
   * the viewer can surface a per-task `progress` (0–100) overlay while the
   * user waits. Cleared on completion or failure. Ephemeral by design —
   * not persisted so a reload starts from a clean slate.
   */
  private readonly _pendingGenerations = signal<PendingGeneration[]>([]);
  readonly pendingGenerations = this._pendingGenerations.asReadonly();
  readonly isGenerating = computed(() => this._pendingGenerations().length > 0);

  private readonly _sessionClips = signal<GeneratedClip[]>([]);
  private readonly _activeClipId = signal<string | null>(null);

  /**
   * Last preset-prompt text injected into each section header. Used to
   * find-and-replace on subsequent preset changes so the raw textarea
   * stays in sync without duplicating preset text.
   */
  private readonly _lastInjections = signal<Record<string, string>>({});

  /**
   * External assets the user has marked as references from the Characters
   * library. Rendered as chips above the prompt textarea and folded into
   * the generation payload as `content[]` items at submit time.
   */
  private readonly _usedAssets = signal<UsedAsset[]>([]);
  readonly usedAssets = this._usedAssets.asReadonly();

  readonly rawDescription = this._rawDescription.asReadonly();
  readonly cinematography = this._cinematography.asReadonly();
  readonly output = this._output.asReadonly();
  readonly sessionClips = this._sessionClips.asReadonly();
  readonly activeClipId = this._activeClipId.asReadonly();

  readonly activeClip = computed(
    () => this._sessionClips().find((c) => c.id === this._activeClipId()) ?? null,
  );

  /** Character count of the unified prompt — drives the editor's footer. */
  readonly rawLength = computed(() => this._rawDescription().length);

  /** True when a generation can be submitted. */
  readonly canGenerate = computed(() => this._rawDescription().trim().length > 0);

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: PromptSnapshot = {
        __v: SCHEMA_VERSION,
        rawDescription: this._rawDescription(),
        cinematography: this._cinematography(),
        output: this._output(),
        sessionClips: this._sessionClips(),
        activeClipId: this._activeClipId(),
        usedAssets: this._usedAssets(),
      };
      if (this.hydrated) {
        void this.storage.set('prompt', snap);
      }
    });
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<PromptSnapshot>('prompt');
      if (snap && snap.__v === SCHEMA_VERSION) {
        this._rawDescription.set(snap.rawDescription || PROMPT_TEMPLATE);
        this._cinematography.set(snap.cinematography);
        this._output.set({ ...this._output(), ...snap.output });
        this._sessionClips.set(snap.sessionClips);
        this._activeClipId.set(snap.activeClipId);
        this._usedAssets.set(snap.usedAssets ?? []);
      }
    } finally {
      this.hydrated = true;
      this._lastInjections.set(this.buildInjectionsMap());
    }
  }

  setRawDescription(text: string) {
    this._rawDescription.set(text);
  }

  /**
   * Add a character-library file to the reference list. Idempotent —
   * duplicates by `fileId` are ignored so the same character clicked
   * twice doesn't queue the same file twice.
   */
  useAsset(asset: UsedAsset) {
    this._usedAssets.update((list) => {
      if (list.some((a) => a.fileId === asset.fileId)) return list;
      return [...list, asset];
    });
  }

  /** Remove a reference by either its file id or its source character id. */
  unuseAsset(idOrFileId: string) {
    this._usedAssets.update((list) =>
      list.filter((a) => a.fileId !== idOrFileId && a.characterId !== idOrFileId),
    );
  }

  patchCinematography(patch: Partial<CinematographyConfig>) {
    this._cinematography.update((c) => ({ ...c, ...patch }));
    this.syncPromptInjections();
  }

  patchOutput(patch: Partial<OutputFormatConfig>) {
    this._output.update((o) => {
      const merged = { ...o, ...patch };
      if (patch.batchCount !== undefined) {
        merged.batchCount = clamp(Math.round(patch.batchCount), 1, MAX_BATCH_COUNT);
      }
      return merged;
    });
  }

  // ---------------------------------------------------------------------------
  // Pending generations
  // ---------------------------------------------------------------------------

  /** Register a new in-flight task and return its id for later updates. */
  startGeneration(label?: string, takeIndex?: number): string {
    const id = `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this._pendingGenerations.update((list) => [...list, { id, progress: 0, label, takeIndex }]);
    return id;
  }

  /** Update the percentage on an in-flight task (clamped to 0–100). */
  updateGenerationProgress(id: string, progress: number): void {
    const next = clamp(Math.round(progress), 0, 100);
    this._pendingGenerations.update((list) =>
      list.map((g) => (g.id === id ? { ...g, progress: next } : g)),
    );
  }

  /** Mark a task as finished. If a clip is passed it's pushed to the reel. */
  completeGeneration(id: string, clip?: GeneratedClip): void {
    const pending = this._pendingGenerations().find((g) => g.id === id);
    this._pendingGenerations.update((list) => list.filter((g) => g.id !== id));
    if (clip) {
      const withTake =
        pending?.takeIndex !== undefined && clip.takeIndex === undefined
          ? { ...clip, takeIndex: pending.takeIndex }
          : clip;
      this.pushClip(withTake);
    }
  }

  /** Drop a failed task without pushing a clip. */
  failGeneration(id: string): void {
    this._pendingGenerations.update((list) => list.filter((g) => g.id !== id));
  }

  pushClip(clip: GeneratedClip) {
    this._sessionClips.update((list) => [clip, ...list]);
    this._activeClipId.set(clip.id);
  }

  selectClip(id: string | null) {
    this._activeClipId.set(id);
  }

  setClipRating(id: string, rating: number) {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));
    this._sessionClips.update((list) =>
      list.map((c) => (c.id === id ? { ...c, rating: clamped } : c)),
    );
  }

  /**
   * Repopulate the editor (raw text, cinematography, output, assets) from
   * a previous clip's source snapshot. Used by the viewer's reuse icon.
   * No-op if the clip has no captured source (older history).
   */
  reuseClip(clipId: string) {
    const clip = this._sessionClips().find((c) => c.id === clipId);
    if (!clip?.source) return;
    this._rawDescription.set(clip.source.rawDescription);
    this._cinematography.set(clip.source.cinematography);
    this._output.set(clip.source.output);

    const assetSnap = clip.source.assets;
    if (assetSnap) {
      this.assets.setFirstFrame(assetSnap.firstFrame);
      this.assets.setLastFrame(assetSnap.lastFrame);
      this.assets.replaceFreeAssets(assetSnap.free);
    }

    // The restored raw text already contains the preset prompts — record
    // what's there so the next preset swap knows what to replace.
    this._lastInjections.set(this.buildInjectionsMap());
  }

  // ---------------------------------------------------------------------------
  // Preset-into-section injection
  //
  // When the user picks a lens / camera body / camera motion / color grading /
  // genre, the preset's prompt text is woven directly into the corresponding
  // section of the raw textarea. The bookkeeping in `_lastInjections` records
  // exactly which substring belongs to each section so subsequent swaps can
  // find-and-replace cleanly without duplicating or stranding prior preset text.
  // ---------------------------------------------------------------------------

  /** Resolve the current preset prompts that should live in each section. */
  private buildInjectionsMap(): Record<string, string> {
    const cine = this._cinematography();
    const lens = this.presets.findPreset(cine.lens);
    const body = this.presets.findPreset(cine.cameraBody);
    const motion = this.presets.findPreset(cine.cameraMotion);
    const grade = this.presets.findPreset(cine.colorGrading);
    const genre = this.presets.findPreset(cine.genre);

    const bySection: Record<string, string[]> = {};
    const push = (section: string, value?: string) => {
      if (!value) return;
      bySection[section] ??= [];
      bySection[section].push(value);
    };
    push(PRESET_SECTION_TARGETS.lens, lens?.prompt);
    push(PRESET_SECTION_TARGETS.cameraBody, body?.prompt);
    push(PRESET_SECTION_TARGETS.cameraMotion, motion?.prompt);
    push(PRESET_SECTION_TARGETS.colorGrading, grade?.prompt);
    push(PRESET_SECTION_TARGETS.genre, genre?.prompt);

    const out: Record<string, string> = {};
    for (const [section, parts] of Object.entries(bySection)) {
      out[section] = parts.join('. ');
    }
    return out;
  }

  /** Sync the textarea so each section reflects the currently-picked presets. */
  private syncPromptInjections() {
    const next = this.buildInjectionsMap();
    const prev = this._lastInjections();
    let text = this._rawDescription();

    const headers = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const header of headers) {
      text = this.replaceSectionInjection(text, header, prev[header] ?? '', next[header] ?? '');
    }
    this._rawDescription.set(text);
    this._lastInjections.set(next);
  }

  /**
   * Within a section identified by `header` (e.g. `POSE:`), replace the
   * previously-injected `previous` substring with `next`. If `previous` is
   * missing, append `next` after the header. If `next` is empty, just
   * remove `previous` and tidy adjacent whitespace / separators.
   */
  private replaceSectionInjection(
    text: string,
    header: string,
    previous: string,
    next: string,
  ): string {
    if (previous && text.includes(previous)) {
      if (next) return text.replace(previous, next);
      const cleaned = text.replace(previous, '');
      return cleaned.replace(
        new RegExp(`(${escapeRegex(header)})([ \\t]*[.,;])+([ \\t]*)`, 'g'),
        '$1$3',
      );
    }
    if (!next) return text;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(header)) {
        const rest = line.slice(header.length).trim();
        if (rest) {
          const sep = rest.endsWith('.') ? ' ' : '. ';
          lines[i] = `${header} ${rest}${sep}${next}`;
        } else {
          lines[i] = `${header} ${next}`;
        }
        return lines.join('\n');
      }
    }
    return text;
  }
}
