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
const SCHEMA_VERSION = 4;

/**
 * Maps each cinematography preset slot to the section header in the prompt
 * scaffold where the preset's prompt text should be injected. Camera body
 * is intentionally absent — it gets appended at compile time only.
 */
const PRESET_SECTION_TARGETS = {
  lens: 'POSE:',
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
}

/**
 * Holds the prompt builder state plus the compiled prompt that
 * gets sent to BytePlus / Seedance.
 *
 * The compile algorithm mirrors `compilePromptText` + `buildPayload` from
 * dcs-v0/server.js — order: user → camera → lens → motion → grade → genre,
 * joined with ". ", terminated with ".", with frame hints prepended when
 * firstFrame/lastFrame are set. Technical fields (ratio, duration, sound)
 * do NOT live inside the prompt text — they travel as top-level payload
 * fields per the official BytePlus spec.
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
  });

  private readonly _sessionClips = signal<GeneratedClip[]>([]);
  private readonly _activeClipId = signal<string | null>(null);

  /**
   * Last preset-prompt text injected into each section header. Used to
   * find-and-replace on subsequent preset changes so the raw textarea
   * stays in sync without duplicating preset text.
   */
  private readonly _lastInjections = signal<Record<string, string>>({});

  readonly rawDescription = this._rawDescription.asReadonly();
  readonly cinematography = this._cinematography.asReadonly();
  readonly output = this._output.asReadonly();
  readonly sessionClips = this._sessionClips.asReadonly();
  readonly activeClipId = this._activeClipId.asReadonly();

  readonly activeClip = computed(() =>
    this._sessionClips().find((c) => c.id === this._activeClipId()) ?? null,
  );

  /** Engine -> BytePlus model id, used by the generate call. */
  readonly modelId = computed(() =>
    this._output().engine === 'fast'
      ? 'dreamina-seedance-2-0-fast-260128'
      : 'dreamina-seedance-2-0-260128',
  );

  /**
   * The exact text block that will be sent to BytePlus as the final
   * `content[type:text]` entry. Pure computed.
   *
   * Lens, camera motion, color grading and genre are already woven into
   * the raw textarea (via `syncPromptInjections` when the user picks a
   * preset), so they are NOT re-appended here. Only the camera body —
   * the one cinematography slot that has no section target — is still
   * appended at compile time.
   */
  readonly compiledPrompt = computed(() => {
    const raw = this._rawDescription().trim();
    const cine = this._cinematography();
    const camera = this.presets.findPreset(cine.cameraBody);

    const parts: string[] = [];
    if (raw) parts.push(raw);
    if (camera) parts.push(camera.prompt);

    let text = parts.filter(Boolean).join('. ');
    if (text && !text.endsWith('.')) text += '.';

    const first = this.assets.firstFrame();
    const last = this.assets.lastFrame();
    const frameHints: string[] = [];
    if (first && last) {
      frameHints.push('The video starts on Image 1 and ends on Image 2.');
    } else if (first) {
      frameHints.push('The video starts on Image 1.');
    }
    if (frameHints.length) {
      text = frameHints.join(' ') + ' ' + text;
    }

    return text;
  });

  readonly compiledLength = computed(() => this.compiledPrompt().length);

  /** True when a generation can be submitted (matches v0 guard). */
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
        // Preserve the Seedance scaffold if the persisted draft is empty.
        this._rawDescription.set(snap.rawDescription || PROMPT_TEMPLATE);
        this._cinematography.set(snap.cinematography);
        this._output.set(snap.output);
        this._sessionClips.set(snap.sessionClips);
        this._activeClipId.set(snap.activeClipId);
      }
    } finally {
      this.hydrated = true;
      // Seed the injection bookkeeping so subsequent preset swaps know
      // exactly which substring to find-and-replace inside the raw text.
      this._lastInjections.set(this.buildInjectionsMap());
    }
  }

  setRawDescription(text: string) {
    this._rawDescription.set(text);
  }

  patchCinematography(patch: Partial<CinematographyConfig>) {
    this._cinematography.update((c) => ({ ...c, ...patch }));
    this.syncPromptInjections();
  }

  patchOutput(patch: Partial<OutputFormatConfig>) {
    this._output.update((o) => ({ ...o, ...patch }));
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
  // When the user picks a lens / camera motion / color grading / genre, the
  // preset's prompt text is woven directly into the corresponding section of
  // the raw textarea. The bookkeeping in `_lastInjections` records exactly
  // which substring belongs to each section so subsequent swaps can find-and-
  // replace cleanly without duplicating or stranding prior preset text.
  // ---------------------------------------------------------------------------

  /** Resolve the current preset prompts that should live in each section. */
  private buildInjectionsMap(): Record<string, string> {
    const cine = this._cinematography();
    const lens = this.presets.findPreset(cine.lens);
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

    const headers = new Set([
      ...Object.keys(prev),
      ...Object.keys(next),
    ]);
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
      // Tidy leftover separators sitting right after the header.
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
