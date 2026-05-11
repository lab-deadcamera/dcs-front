import { Injectable, computed, signal } from '@angular/core';
import { ReferenceAsset } from '../interfaces/studio.models';

/**
 * Asset library state.
 *
 * - First-frame & last-frame are special anchor slots used by Seedance.
 * - Free assets get auto-tagged "Image 1", "Image 2", "Video 1", …
 *   so the user can reference them directly inside the prompt textarea.
 */
@Injectable({ providedIn: 'root' })
export class AssetsStateService {
  private readonly _firstFrame = signal<ReferenceAsset | null>(null);
  private readonly _lastFrame = signal<ReferenceAsset | null>(null);
  private readonly _freeAssets = signal<ReferenceAsset[]>([]);

  readonly firstFrame = this._firstFrame.asReadonly();
  readonly lastFrame = this._lastFrame.asReadonly();
  readonly freeAssets = this._freeAssets.asReadonly();

  readonly totalCount = computed(() => {
    const f = this._firstFrame() ? 1 : 0;
    const l = this._lastFrame() ? 1 : 0;
    return f + l + this._freeAssets().length;
  });

  setFirstFrame(asset: ReferenceAsset | null) {
    this._firstFrame.set(asset ? { ...asset, slot: 'first-frame' } : null);
  }

  setLastFrame(asset: ReferenceAsset | null) {
    this._lastFrame.set(asset ? { ...asset, slot: 'last-frame' } : null);
  }

  addFreeAsset(asset: ReferenceAsset) {
    this._freeAssets.update((list) => {
      const sameKind = list.filter((a) => a.kind === asset.kind).length;
      const tagBase = asset.kind === 'image'
        ? 'Image'
        : asset.kind === 'video' ? 'Video' : 'Audio';
      return [
        ...list,
        { ...asset, slot: 'free', tag: `${tagBase} ${sameKind + 1}` },
      ];
    });
  }

  removeFreeAsset(id: string) {
    this._freeAssets.update((list) => list.filter((a) => a.id !== id));
  }

  clearAll() {
    this._firstFrame.set(null);
    this._lastFrame.set(null);
    this._freeAssets.set([]);
  }
}
