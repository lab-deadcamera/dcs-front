import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  CinematographyConfig,
  GeneratedClip,
  OutputFormatConfig,
} from '../interfaces/studio.models';
import { StudioStorageService } from './studio-storage.service';

interface PromptSnapshot {
  rawDescription: string;
  cinematography: CinematographyConfig;
  output: OutputFormatConfig;
  sessionClips: GeneratedClip[];
  activeClipId: string | null;
}

/**
 * Holds the prompt builder state plus the compiled prompt that
 * gets sent to BytePlus / Seedance. The compiled output is a
 * pure `computed()` — no manual sync needed.
 *
 * Persisted in IndexedDB via StudioStorageService.
 */
@Injectable({ providedIn: 'root' })
export class PromptStateService {
  private readonly storage = inject(StudioStorageService);
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

  readonly compiledPrompt = computed(() => {
    const raw = this._rawDescription().trim();
    if (!raw) return '';

    const cine = this._cinematography();
    const out = this._output();
    const parts: string[] = [raw];
    const tail: string[] = [];

    if (cine.lens) tail.push(this.labelize(cine.lens));
    if (cine.cameraBody) tail.push(`shot on ${this.labelize(cine.cameraBody)}`);
    if (cine.cameraMotion) tail.push(this.labelize(cine.cameraMotion));
    if (cine.colorGrading) tail.push(`color grading: ${this.labelize(cine.colorGrading)}`);
    if (cine.genre) tail.push(`${this.labelize(cine.genre)} genre`);

    tail.push(`${out.aspectRatio} ${out.resolution}`);
    tail.push(`${out.durationSeconds}s`);
    if (out.sound) tail.push('with sound');

    if (tail.length) parts.push(tail.join(', '));
    return parts.join('. ');
  });

  readonly compiledLength = computed(() => this.compiledPrompt().length);

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: PromptSnapshot = {
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
      if (snap) {
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

  private labelize(value: string) {
    return value.replace(/-/g, ' ');
  }
}
