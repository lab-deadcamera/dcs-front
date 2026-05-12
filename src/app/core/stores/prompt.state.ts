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
const SCHEMA_VERSION = 2;

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

  private readonly _rawDescription = signal<string>('');

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
   * `content[type:text]` entry. Pure computed — see class JSDoc for the
   * algorithm contract.
   */
  readonly compiledPrompt = computed(() => {
    const raw = this._rawDescription().trim();
    const cine = this._cinematography();
    const lens = this.presets.findPreset(cine.lens);
    const camera = this.presets.findPreset(cine.cameraBody);
    const motion = this.presets.findPreset(cine.cameraMotion);
    const grade = this.presets.findPreset(cine.colorGrading);
    const genre = this.presets.findPreset(cine.genre);

    const parts: string[] = [];
    if (raw) parts.push(raw);
    if (camera) parts.push(camera.prompt);
    if (lens) parts.push(lens.prompt);
    if (motion) parts.push(motion.prompt);
    if (grade) parts.push(grade.prompt);
    if (genre) parts.push(genre.prompt);

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
        this._rawDescription.set(snap.rawDescription);
        this._cinematography.set(snap.cinematography);
        this._output.set(snap.output);
        this._sessionClips.set(snap.sessionClips);
        this._activeClipId.set(snap.activeClipId);
      }
    } finally {
      this.hydrated = true;
    }
  }

  setRawDescription(text: string) {
    this._rawDescription.set(text);
  }

  patchCinematography(patch: Partial<CinematographyConfig>) {
    this._cinematography.update((c) => ({ ...c, ...patch }));
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
}
