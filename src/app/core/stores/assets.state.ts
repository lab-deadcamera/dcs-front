import {
  Injectable,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ReferenceAsset } from '../interfaces/studio.models';
import { StudioStorageService } from './studio-storage.service';

interface AssetsSnapshot {
  firstFrame: ReferenceAsset | null;
  lastFrame: ReferenceAsset | null;
  freeAssets: ReferenceAsset[];
}

/**
 * Asset library state.
 *
 * - First-frame & last-frame are special anchor slots used by Seedance.
 * - Free assets get auto-tagged "Image 1", "Image 2", "Video 1", …
 *   so the user can reference them directly inside the prompt textarea.
 *
 * Persistence note: only metadata is persisted across reloads. Blob URLs
 * (`URL.createObjectURL`) are session-scoped — thumbnails reset on reload
 * until a follow-up PR stores the actual blobs.
 */
@Injectable({ providedIn: 'root' })
export class AssetsStateService implements OnDestroy {
  private readonly storage = inject(StudioStorageService);
  private hydrated = false;

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

  constructor() {
    this.hydrate();

    effect(() => {
      const strip = (a: ReferenceAsset | null): ReferenceAsset | null =>
        a ? { ...a, thumbnailUrl: undefined } : null;
      const snap: AssetsSnapshot = {
        firstFrame: strip(this._firstFrame()),
        lastFrame: strip(this._lastFrame()),
        freeAssets: this._freeAssets().map((a) => ({ ...a, thumbnailUrl: undefined })),
      };
      if (this.hydrated) {
        void this.storage.set('assets', snap);
      }
    });
  }

  setFirstFrame(asset: ReferenceAsset | null) {
    this.revoke(this._firstFrame());
    this._firstFrame.set(asset ? { ...asset, slot: 'first-frame' } : null);
  }

  setLastFrame(asset: ReferenceAsset | null) {
    this.revoke(this._lastFrame());
    this._lastFrame.set(asset ? { ...asset, slot: 'last-frame' } : null);
  }

  addFreeAsset(asset: ReferenceAsset) {
    this._freeAssets.update((list) => {
      const sameKind = list.filter((a) => a.kind === asset.kind).length;
      const tagBase =
        asset.kind === 'image' ? 'Image' : asset.kind === 'video' ? 'Video' : 'Audio';
      return [
        ...list,
        { ...asset, slot: 'free', tag: `${tagBase} ${sameKind + 1}` },
      ];
    });
  }

  removeFreeAsset(id: string) {
    this._freeAssets.update((list) => {
      const target = list.find((a) => a.id === id);
      if (target) this.revoke(target);
      return list.filter((a) => a.id !== id);
    });
  }

  clearAll() {
    this.revoke(this._firstFrame());
    this.revoke(this._lastFrame());
    this._freeAssets().forEach((a) => this.revoke(a));
    this._firstFrame.set(null);
    this._lastFrame.set(null);
    this._freeAssets.set([]);
  }

  ngOnDestroy(): void {
    this.revoke(this._firstFrame());
    this.revoke(this._lastFrame());
    this._freeAssets().forEach((a) => this.revoke(a));
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<AssetsSnapshot>('assets');
      if (snap) {
        this._firstFrame.set(snap.firstFrame);
        this._lastFrame.set(snap.lastFrame);
        this._freeAssets.set(snap.freeAssets);
      }
    } finally {
      this.hydrated = true;
    }
  }

  private revoke(a: ReferenceAsset | null | undefined) {
    if (a?.thumbnailUrl && a.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(a.thumbnailUrl);
    }
  }
}
