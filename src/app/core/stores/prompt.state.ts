import { Injectable, computed, signal } from '@angular/core';
import {
  CinematographyConfig,
  GeneratedClip,
  OutputFormatConfig,
  ReferenceAsset,
} from '../interfaces/studio.models';

/**
 * Holds the prompt builder state plus the compiled prompt that
 * gets sent to BytePlus / Seedance. The compiled output is a
 * pure `computed()` — no manual sync needed.
 */
@Injectable({ providedIn: 'root' })
export class PromptStateService {
  // ── Raw user input ─────────────────────────────────────────────
  private readonly _rawDescription = signal<string>('');

  // ── Cinematography selections (Section 03) ─────────────────────
  private readonly _cinematography = signal<CinematographyConfig>({
    lens: null,
    cameraBody: null,
    cameraMotion: null,
    colorGrading: null,
    genre: null,
  });

  // ── Output format (Section 04) ─────────────────────────────────
  private readonly _output = signal<OutputFormatConfig>({
    aspectRatio: '16:9',
    resolution: '480p',
    durationSeconds: 5,
    sound: false,
    engine: 'fast',
  });

  // ── Session reel ───────────────────────────────────────────────
  private readonly _sessionClips = signal<GeneratedClip[]>([]);
  private readonly _activeClipId = signal<string | null>(null);

  // ── Public read-only views ─────────────────────────────────────
  readonly rawDescription = this._rawDescription.asReadonly();
  readonly cinematography = this._cinematography.asReadonly();
  readonly output = this._output.asReadonly();
  readonly sessionClips = this._sessionClips.asReadonly();
  readonly activeClipId = this._activeClipId.asReadonly();

  readonly activeClip = computed(() =>
    this._sessionClips().find((c) => c.id === this._activeClipId()) ?? null,
  );

  /**
   * Compiled prompt: raw description + injected cinematic language.
   * This is what gets posted to the API and shown in the
   * "COMPILED PROMPT" preview block.
   */
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

  // ── Mutations ──────────────────────────────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────
  private labelize(value: string) {
    return value.replace(/-/g, ' ');
  }
}
