import { Injectable, computed, inject, signal } from '@angular/core';
import { Preset, PresetCategory, SpecOption } from '../interfaces/studio.models';
import { PresetApiService } from '@app/services/preset-api.service';

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

/** Raw preset shape returned by the backend API. */
interface ApiPreset {
  id: string;
  group_id: string;
  code: string;
  label: string;
  prompt: string;
}

interface GroupInfo {
  id: string;
  slug: string;
}

@Injectable({ providedIn: 'root' })
export class PresetsService {
  private readonly api = inject(PresetApiService);

  private readonly _presets = signal<ApiPreset[]>([]);
  private readonly _groups = signal<GroupInfo[]>([]);
  readonly loaded = computed(() => this._groups().length > 0);

  readonly lens = computed<Preset[]>(() => this.bySlug('lens'));
  readonly camera = computed<Preset[]>(() => this.bySlug('camera'));
  readonly cameraMotion = computed<Preset[]>(() => this.bySlug('cameraMotion'));
  readonly colorGrading = computed<Preset[]>(() => this.bySlug('colorGrading'));
  readonly genre = computed<Preset[]>(() => this.bySlug('genre'));
  readonly aspectRatio = computed<SpecOption[]>(() => []);
  readonly resolution = computed<SpecOption[]>(() => []);

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.getGroups().subscribe({
      next: (groups) => {
        this._groups.set(groups.map((g: any) => ({ id: g.id, slug: g.slug })));
      },
      error: (err) => console.warn('[presets] failed to load groups:', err),
    });

    this.api.getPresets().subscribe({
      next: (presets) => {
        this._presets.set(
          presets.map((p: any) => ({
            id: p.id,
            group_id: p.group_id,
            code: p.code,
            label: p.label,
            prompt: p.prompt,
          })),
        );
      },
      error: (err) => console.warn('[presets] failed to load presets:', err),
    });
  }

  private bySlug(slug: string): Preset[] {
    const group = this._groups().find((g) => g.slug === slug);
    if (!group) return [];
    return this._presets()
      .filter((p) => p.group_id === group.id)
      .map((p) => ({
        id: p.id,
        label: p.label,
        prompt: p.prompt,
        labelKey: keyOf(p.code),
      }));
  }

  findPreset(id: string | null): Preset | null {
    if (!id) return null;
    for (const p of this._presets()) {
      if (p.id === id) {
        return { id: p.id, label: p.label, prompt: p.prompt, labelKey: keyOf(p.code) };
      }
    }
    return null;
  }

  addCustomPreset(category: PresetCategory, input: { label: string; prompt: string }): void {
    const group = this._groups().find((g) => g.slug === category);
    if (!group) return;
    const code = 'custom_' + Date.now().toString(36);
    this.api
      .createPreset({
        group_id: group.id,
        code,
        label: input.label.trim(),
        prompt: input.prompt.trim(),
      })
      .subscribe({
        next: () => {
          this.load();
        },
        error: (err) => console.warn('[presets] create failed:', err),
      });
  }

  updatePreset(
    category: PresetCategory,
    id: string,
    patch: { label?: string; prompt?: string },
  ): void {
    this.api
      .updatePreset(id, patch)
      .subscribe({
        next: () => this.load(),
        error: (err) => console.warn('[presets] update failed:', err),
      });
  }

  removePreset(category: PresetCategory, id: string): void {
    this.api
      .deletePreset(id)
      .subscribe({
        next: () => this.load(),
        error: (err) => console.warn('[presets] delete failed:', err),
      });
  }

  removeCustomPreset(category: PresetCategory, id: string): void {
    this.removePreset(category, id);
  }
}
