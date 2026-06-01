import { Injectable, computed, inject, signal } from '@angular/core';
import { Preset, PresetCategory, SpecOption } from '../interfaces/studio.models';
import { PresetApiService } from '@app/services/preset-api.service';

const LABEL_KEYS: Record<string, string> = {};

function keyOf(code: string, apiLabelKey: string): string {
  return apiLabelKey || LABEL_KEYS[code] || '';
}

interface ApiPreset {
  id: string;
  group_id: string;
  code: string;
  label: string;
  label_key: string;
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
            label_key: p.label_key || '',
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
        labelKey: keyOf(p.code, p.label_key),
      }));
  }

  findPreset(id: string | null): Preset | null {
    if (!id) return null;
    for (const p of this._presets()) {
      if (p.id === id) {
        return { id: p.id, label: p.label, prompt: p.prompt, labelKey: keyOf(p.code, p.label_key) };
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
        next: () => this.load(),
        error: (err) => console.warn('[presets] create failed:', err),
      });
  }

  updatePreset(category: PresetCategory, id: string, patch: { label?: string; prompt?: string }): void {
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
