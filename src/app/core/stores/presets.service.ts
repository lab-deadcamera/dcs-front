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

/** localStorage slot for the admin preset mutations — survives reloads. */
const STORAGE_KEY = 'dcs-custom-presets';

type CustomPresetMap = Record<PresetCategory, Preset[]>;
type OverridesMap = Record<PresetCategory, Record<string, PresetOverride>>;
type DeletionsMap = Record<PresetCategory, string[]>;

interface PresetOverride {
  label?: string;
  prompt?: string;
}

/**
 * Combined admin mutation state.
 *
 *   custom     — net-new presets added by the admin (no baseline counterpart).
 *   overrides  — per-baseline label/prompt edits keyed by category + id.
 *   deletions  — ids of baseline presets the admin has marked deleted.
 *
 * The browser cannot mutate `presets.json` on disk, so this state acts as
 * the source of truth for "after admin changes" and is merged into every
 * per-category computed signal. A future `PATCH /api/v1/presets` endpoint
 * could push this back to the file, but for now everything is local.
 */
interface PresetsState {
  custom: CustomPresetMap;
  overrides: OverridesMap;
  deletions: DeletionsMap;
}

function emptyCustomMap(): CustomPresetMap {
  return {
    lens: [],
    camera: [],
    cameraMotion: [],
    colorGrading: [],
    genre: [],
  };
}

function emptyOverrides(): OverridesMap {
  return { lens: {}, camera: {}, cameraMotion: {}, colorGrading: {}, genre: {} };
}

function emptyDeletions(): DeletionsMap {
  return { lens: [], camera: [], cameraMotion: [], colorGrading: [], genre: [] };
}

function emptyState(): PresetsState {
  return {
    custom: emptyCustomMap(),
    overrides: emptyOverrides(),
    deletions: emptyDeletions(),
  };
}

function loadState(): PresetsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);

    // Backwards-compat migration: prior versions wrote the custom map
    // flat at the root (no `custom`/`overrides`/`deletions` envelope).
    if (parsed.lens !== undefined && !parsed.custom) {
      return {
        custom: {
          lens: parsed.lens ?? [],
          camera: parsed.camera ?? [],
          cameraMotion: parsed.cameraMotion ?? [],
          colorGrading: parsed.colorGrading ?? [],
          genre: parsed.genre ?? [],
        },
        overrides: emptyOverrides(),
        deletions: emptyDeletions(),
      };
    }

    return {
      custom: { ...emptyCustomMap(), ...(parsed.custom ?? {}) },
      overrides: { ...emptyOverrides(), ...(parsed.overrides ?? {}) },
      deletions: { ...emptyDeletions(), ...(parsed.deletions ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: PresetsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

/**
 * Merge a baseline category list with the admin mutations:
 *   1. drop ids in `deletions`
 *   2. apply override label/prompt for surviving baseline rows
 *   3. append custom (admin-added) rows at the end
 */
function mergeCategory(
  baseline: Array<{ id: string; label: string; prompt: string }> | undefined,
  state: PresetsState,
  cat: PresetCategory,
): Preset[] {
  const deletions = new Set(state.deletions[cat]);
  const overrides = state.overrides[cat];

  const baselineMapped = mapPresets(baseline)
    .filter((p) => !deletions.has(p.id))
    .map((p) => {
      const ov = overrides[p.id];
      if (!ov) return p;
      return {
        ...p,
        label: ov.label ?? p.label,
        prompt: ov.prompt ?? p.prompt,
        isOverridden: true,
      } as Preset;
    });

  return [...baselineMapped, ...state.custom[cat]];
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
   * Admin mutation state — adds, edits and deletes applied on top of
   * `presets.json`. Hydrated from localStorage on boot and persisted on
   * every mutation. Merged into the per-category computed signals below
   * so the rest of the app never has to know which rows came from the
   * file and which from the admin.
   */
  private readonly _state = signal<PresetsState>(loadState());

  readonly loaded = computed(() => this._data() !== null);

  readonly lens = computed<Preset[]>(() =>
    mergeCategory(this._data()?.lens, this._state(), 'lens'),
  );
  readonly camera = computed<Preset[]>(() =>
    mergeCategory(this._data()?.camera, this._state(), 'camera'),
  );
  readonly cameraMotion = computed<Preset[]>(() =>
    mergeCategory(this._data()?.cameraMotion, this._state(), 'cameraMotion'),
  );
  readonly colorGrading = computed<Preset[]>(() =>
    mergeCategory(this._data()?.colorGrading, this._state(), 'colorGrading'),
  );
  readonly genre = computed<Preset[]>(() =>
    mergeCategory(this._data()?.genre, this._state(), 'genre'),
  );
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
   * with baseline ids.
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

    this._state.update((s) => {
      const next: PresetsState = {
        ...s,
        custom: {
          ...s.custom,
          [category]: [...s.custom[category], preset],
        },
      };
      saveState(next);
      return next;
    });
    return preset;
  }

  /**
   * Patch a preset's label and/or prompt. Routes the write to the right
   * slot depending on origin: customs are mutated in place inside the
   * `custom` map; baseline rows get a record in `overrides[category][id]`
   * so re-loads still see the change without touching `presets.json`.
   */
  updatePreset(
    category: PresetCategory,
    id: string,
    patch: { label?: string; prompt?: string },
  ): void {
    this._state.update((s) => {
      const customRow = s.custom[category].find((p) => p.id === id);

      let next: PresetsState;
      if (customRow) {
        next = {
          ...s,
          custom: {
            ...s.custom,
            [category]: s.custom[category].map((p) =>
              p.id === id
                ? {
                    ...p,
                    label: patch.label?.trim() ?? p.label,
                    labelKey: patch.label?.trim() ?? p.labelKey,
                    prompt: patch.prompt?.trim() ?? p.prompt,
                  }
                : p,
            ),
          },
        };
      } else {
        next = {
          ...s,
          overrides: {
            ...s.overrides,
            [category]: {
              ...s.overrides[category],
              [id]: {
                ...s.overrides[category][id],
                ...(patch.label !== undefined
                  ? { label: patch.label.trim() }
                  : {}),
                ...(patch.prompt !== undefined
                  ? { prompt: patch.prompt.trim() }
                  : {}),
              },
            },
          },
        };
      }
      saveState(next);
      return next;
    });
  }

  /**
   * Delete a preset regardless of origin. Customs are dropped from the
   * `custom` map; baseline rows are added to `deletions[category]` so they
   * stay hidden after reload until the admin restores via `restoreBaseline`.
   */
  removePreset(category: PresetCategory, id: string): void {
    this._state.update((s) => {
      const isCustom = s.custom[category].some((p) => p.id === id);
      let next: PresetsState;
      if (isCustom) {
        next = {
          ...s,
          custom: {
            ...s.custom,
            [category]: s.custom[category].filter((p) => p.id !== id),
          },
        };
      } else {
        next = {
          ...s,
          deletions: {
            ...s.deletions,
            [category]: s.deletions[category].includes(id)
              ? s.deletions[category]
              : [...s.deletions[category], id],
          },
        };
      }
      saveState(next);
      return next;
    });
  }

  /** Convenience alias kept for backwards-compat with prior call sites. */
  removeCustomPreset(category: PresetCategory, id: string): void {
    this.removePreset(category, id);
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
