import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Preset,
  PresetCategory,
  PresetsFile,
  SpecOption,
} from '../interfaces/studio.models';

/**
 * Maps preset ids to i18n keys. The presets.json file is a verbatim mirror
 * of dcs-v0 so we keep `label`/`prompt` untranslated and resolve a labelKey
 * here for the Angular i18n layer.
 */
const LABEL_KEYS: Readonly<Record<string, string>> = {
  // Lens
  wide_24mm: 'STUDIO.CINEMATOGRAPHY.LENSES.24MM_WIDE',
  classic_35mm: 'STUDIO.CINEMATOGRAPHY.LENSES.35MM_CLASSIC',
  portrait_50mm: 'STUDIO.CINEMATOGRAPHY.LENSES.50MM_PORTRAIT',
  tele_85mm: 'STUDIO.CINEMATOGRAPHY.LENSES.85MM_TELE',
  // Camera bodies
  arri_alexa: 'STUDIO.CINEMATOGRAPHY.BODIES.ARRI_ALEXA_65',
  red_komodo: 'STUDIO.CINEMATOGRAPHY.BODIES.RED_KOMODO_6K',
  sony_venice: 'STUDIO.CINEMATOGRAPHY.BODIES.SONY_VENICE',
  film_16mm: 'STUDIO.CINEMATOGRAPHY.BODIES.FILM_16MM',
  // Camera motions
  static_lockoff: 'STUDIO.CINEMATOGRAPHY.MOTIONS.STATIC',
  slow_dolly_in: 'STUDIO.CINEMATOGRAPHY.MOTIONS.DOLLY_IN',
  orbit: 'STUDIO.CINEMATOGRAPHY.MOTIONS.ORBIT',
  handheld: 'STUDIO.CINEMATOGRAPHY.MOTIONS.HANDHELD',
  // Color grading
  tokio: 'STUDIO.CINEMATOGRAPHY.GRADES.TOKIO',
  colombia: 'STUDIO.CINEMATOGRAPHY.GRADES.COLOMBIA',
  ohio: 'STUDIO.CINEMATOGRAPHY.GRADES.OHIO',
  bank: 'STUDIO.CINEMATOGRAPHY.GRADES.BANK',
  // Genres
  drama: 'STUDIO.CINEMATOGRAPHY.GENRES.DRAMA',
  action: 'STUDIO.CINEMATOGRAPHY.GENRES.ACTION',
  noir: 'STUDIO.CINEMATOGRAPHY.GENRES.NOIR',
  horror: 'STUDIO.CINEMATOGRAPHY.GENRES.HORROR',
  // Aspect ratios
  '16:9': 'STUDIO.OUTPUT.ASPECT_16_9',
  '9:16': 'STUDIO.OUTPUT.ASPECT_9_16',
  '21:9': 'STUDIO.OUTPUT.ASPECT_21_9',
  '1:1': 'STUDIO.OUTPUT.ASPECT_1_1',
  // Resolutions
  '480p': 'STUDIO.OUTPUT.RES_480P',
  '720p': 'STUDIO.OUTPUT.RES_720P',
  '1080p': 'STUDIO.OUTPUT.RES_1080P',
};

function keyOf(id: string): string {
  return LABEL_KEYS[id] ?? id;
}

/** localStorage slot for admin-added custom presets — survives reloads. */
const CUSTOM_STORAGE_KEY = 'dcs-custom-presets';

type CustomPresetMap = Record<PresetCategory, Preset[]>;

function emptyCustomMap(): CustomPresetMap {
  return {
    lens: [],
    camera: [],
    cameraMotion: [],
    colorGrading: [],
    genre: [],
  };
}

function loadCustomPresets(): CustomPresetMap {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return emptyCustomMap();
    const parsed = JSON.parse(raw) as Partial<CustomPresetMap>;
    return {
      lens: parsed.lens ?? [],
      camera: parsed.camera ?? [],
      cameraMotion: parsed.cameraMotion ?? [],
      colorGrading: parsed.colorGrading ?? [],
      genre: parsed.genre ?? [],
    };
  } catch {
    return emptyCustomMap();
  }
}

function saveCustomPresets(map: CustomPresetMap): void {
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / disabled storage — ignore, customs just won't persist */
  }
}

/**
 * Loads `public/assets/presets.json` (1:1 mirror of dcs-v0 presets) and
 * exposes the catalog as signals enriched with i18n keys. Components read
 * from these signals; `PromptStateService` uses them to compile prompts.
 */
@Injectable({ providedIn: 'root' })
export class PresetsService {
  private readonly http = inject(HttpClient);

  private readonly _data = signal<PresetsFile | null>(null);

  /**
   * Admin-added presets, keyed by category. Hydrated from localStorage on
   * boot and persisted on every mutation. Merged into the per-category
   * computed signals below so the rest of the app never has to know if
   * a preset comes from `presets.json` or from the runtime store.
   */
  private readonly _custom = signal<CustomPresetMap>(loadCustomPresets());

  readonly loaded = computed(() => this._data() !== null);

  readonly lens = computed<Preset[]>(() => [
    ...mapPresets(this._data()?.lens),
    ...this._custom().lens,
  ]);
  readonly camera = computed<Preset[]>(() => [
    ...mapPresets(this._data()?.camera),
    ...this._custom().camera,
  ]);
  readonly cameraMotion = computed<Preset[]>(() => [
    ...mapPresets(this._data()?.cameraMotion),
    ...this._custom().cameraMotion,
  ]);
  readonly colorGrading = computed<Preset[]>(() => [
    ...mapPresets(this._data()?.colorGrading),
    ...this._custom().colorGrading,
  ]);
  readonly genre = computed<Preset[]>(() => [
    ...mapPresets(this._data()?.genre),
    ...this._custom().genre,
  ]);
  readonly aspectRatio = computed<SpecOption[]>(() =>
    mapSpecs(this._data()?.aspectRatio),
  );
  readonly resolution = computed<SpecOption[]>(() =>
    mapSpecs(this._data()?.resolution),
  );

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const data = await firstValueFrom(
        this.http.get<PresetsFile>('assets/presets.json'),
      );
      this._data.set(data);
    } catch (err) {
      console.warn('[presets] failed to load presets.json:', err);
    }
  }

  /** Look up a single preset by id from any of the cinematography slots. */
  findPreset(id: string | null): Preset | null {
    if (!id) return null;
    const all = [
      ...this.lens(),
      ...this.camera(),
      ...this.cameraMotion(),
      ...this.colorGrading(),
      ...this.genre(),
    ];
    return all.find((p) => p.id === id) ?? null;
  }

  /**
   * Append a user-authored preset to the chosen category. The id is
   * generated client-side (`custom_<ts>_<rand>`) so customs never collide
   * with baseline ids. `labelKey` is set to the user's label so it
   * renders through the i18n pipe transparently (unknown keys fall
   * through to their literal text).
   */
  addCustomPreset(
    category: PresetCategory,
    input: { label: string; prompt: string },
  ): Preset {
    const id =
      'custom_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 7);

    const preset: Preset = {
      id,
      label: input.label.trim(),
      prompt: input.prompt.trim(),
      labelKey: input.label.trim(),
      isCustom: true,
    };

    this._custom.update((map) => {
      const next: CustomPresetMap = {
        ...map,
        [category]: [...map[category], preset],
      };
      saveCustomPresets(next);
      return next;
    });
    return preset;
  }

  /** Drop a user-added preset by category + id. No-op for baseline ids. */
  removeCustomPreset(category: PresetCategory, id: string): void {
    this._custom.update((map) => {
      const next: CustomPresetMap = {
        ...map,
        [category]: map[category].filter((p) => p.id !== id),
      };
      saveCustomPresets(next);
      return next;
    });
  }
}

function mapPresets(
  raw: Array<{ id: string; label: string; prompt: string }> | undefined,
): Preset[] {
  if (!raw) return [];
  return raw.map((p) => ({ ...p, labelKey: keyOf(p.id) }));
}

function mapSpecs(
  raw: Array<{ id: string; label: string; value: string }> | undefined,
): SpecOption[] {
  if (!raw) return [];
  return raw.map((s) => ({ ...s, labelKey: keyOf(s.id) }));
}
