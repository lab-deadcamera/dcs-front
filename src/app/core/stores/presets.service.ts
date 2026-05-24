import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Preset,
  PresetCategory,
  PresetGroup,
  SpecOption,
} from '../interfaces/studio.models';
import { PresetApiService } from '@app/services/preset-api.service';

/**
 * Maps preset ids to i18n keys.
 */
const LABEL_KEYS: Readonly<Record<string, string>> = {
  wide_24mm: 'STUDIO.CINEMATOGRAPHY.LENSES.24MM_WIDE',
  classic_35mm: 'STUDIO.CINEMATOGRAPHY.LENSES.35MM_CLASSIC',
  portrait_50mm: 'STUDIO.CINEMATOGRAPHY.LENSES.50MM_PORTRAIT',
  tele_85mm: 'STUDIO.CINEMATOGRAPHY.LENSES.85MM_TELE',
  arri_alexa: 'STUDIO.CINEMATOGRAPHY.BODIES.ARRI_ALEXA_65',
  red_komodo: 'STUDIO.CINEMATOGRAPHY.BODIES.RED_KOMODO_6K',
  sony_venice: 'STUDIO.CINEMATOGRAPHY.BODIES.SONY_VENICE',
  film_16mm: 'STUDIO.CINEMATOGRAPHY.BODIES.FILM_16MM',
  static_lockoff: 'STUDIO.CINEMATOGRAPHY.MOTIONS.STATIC',
  slow_dolly_in: 'STUDIO.CINEMATOGRAPHY.MOTIONS.DOLLY_IN',
  orbit: 'STUDIO.CINEMATOGRAPHY.MOTIONS.ORBIT',
  handheld: 'STUDIO.CINEMATOGRAPHY.MOTIONS.HANDHELD',
  tokio: 'STUDIO.CINEMATOGRAPHY.GRADES.TOKIO',
  colombia: 'STUDIO.CINEMATOGRAPHY.GRADES.COLOMBIA',
  ohio: 'STUDIO.CINEMATOGRAPHY.GRADES.OHIO',
  bank: 'STUDIO.CINEMATOGRAPHY.GRADES.BANK',
  drama: 'STUDIO.CINEMATOGRAPHY.GENRES.DRAMA',
  action: 'STUDIO.CINEMATOGRAPHY.GENRES.ACTION',
  noir: 'STUDIO.CINEMATOGRAPHY.GENRES.NOIR',
  horror: 'STUDIO.CINEMATOGRAPHY.GENRES.HORROR',
  '16:9': 'STUDIO.OUTPUT.ASPECT_16_9',
  '9:16': 'STUDIO.OUTPUT.ASPECT_9_16',
  '21:9': 'STUDIO.OUTPUT.ASPECT_21_9',
  '1:1': 'STUDIO.OUTPUT.ASPECT_1_1',
  '480p': 'STUDIO.OUTPUT.RES_480P',
  '720p': 'STUDIO.OUTPUT.RES_720P',
  '1080p': 'STUDIO.OUTPUT.RES_1080P',
};

function keyOf(id: string): string {
  return LABEL_KEYS[id] ?? id;
}

const slugToCategory: Record<string, PresetCategory> = {
  lens: 'lens',
  camera: 'camera',
  cameraMotion: 'cameraMotion',
  colorGrading: 'colorGrading',
  genre: 'genre',
};

/**
 * Loads presets from the backend API (`/api/v1/presets`) grouped by slug,
 * and exposes them as signals. Create/update/delete are delegated to the
 * PresetApiService so changes persist across sessions.
 */
@Injectable({ providedIn: 'root' })
export class PresetsService {
  private readonly api = inject(PresetApiService);

  private readonly _presetsByGroup = signal<Map<string, Preset[]>>(new Map());
  private readonly _groups = signal<PresetGroup[]>([]);
  readonly loaded = computed(() => this._groups().length > 0);

  readonly lens = computed<Preset[]>(() => this.bySlug('lens'));
  readonly camera = computed<Preset[]>(() => this.bySlug('camera'));
  readonly cameraMotion = computed<Preset[]>(() => this.bySlug('cameraMotion'));
  readonly colorGrading = computed<Preset[]>(() => this.bySlug('colorGrading'));
  readonly genre = computed<Preset[]>(() => this.bySlug('genre'));
  readonly aspectRatio = computed<SpecOption[]>(() => []);
  readonly resolution = computed<SpecOption[]>(() => []);

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const groups = await this.api.getGroups().toPromise();
      if (!groups) return;
      this._groups.set(groups);

      const allPresets = await this.api.getPresets().toPromise();
      if (!allPresets) return;

      const byGroup = new Map<string, Preset[]>();
      for (const p of allPresets) {
        const list = byGroup.get(p.group_id) || [];
        list.push({ ...p, labelKey: keyOf(p.code) });
        byGroup.set(p.group_id, list);
      }
      this._presetsByGroup.set(byGroup);
    } catch (err) {
      console.warn('[presets] failed to load from API:', err);
    }
  }

  private bySlug(slug: string): Preset[] {
    const group = this._groups().find((g) => g.slug === slug);
    if (!group) return [];
    return this._presetsByGroup().get(group.id) || [];
  }

  /** Look up a single preset by id from any category. */
  findPreset(id: string | null): Preset | null {
    if (!id) return null;
    for (const presets of this._presetsByGroup().values()) {
      const found = presets.find((p) => p.id === id);
      if (found) return found;
    }
    return null;
  }

  /** Create a new preset via API. */
  async addCustomPreset(
    category: PresetCategory,
    input: { label: string; prompt: string },
  ): Promise<Preset | null> {
    const group = this._groups().find((g) => g.slug === category);
    if (!group) return null;

    const code = 'custom_' + Date.now().toString(36);
    const created = await this.api.createPreset({
      group_id: group.id,
      code,
      label: input.label.trim(),
      prompt: input.prompt.trim(),
    }).toPromise();
    if (created) {
      await this.load(); // refresh
    }
    return created ?? null;
  }

  /** Update an existing preset via API. */
  async updatePreset(
    category: PresetCategory,
    id: string,
    patch: { label?: string; prompt?: string },
  ): Promise<void> {
    await this.api.updatePreset(id, patch).toPromise();
    await this.load();
  }

  /** Delete (soft) a preset via API. */
  async removePreset(category: PresetCategory, id: string): Promise<void> {
    await this.api.deletePreset(id).toPromise();
    await this.load();
  }

  /** Alias kept for backwards compatibility. */
  removeCustomPreset(category: PresetCategory, id: string): void {
    void this.removePreset(category, id);
  }
}
