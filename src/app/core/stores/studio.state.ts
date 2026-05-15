import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StudioUser } from '../interfaces/studio.models';
import { ApiKeysStateService } from './api-keys.state';
import { StudioStorageService } from './studio-storage.service';
import { ModelData } from '../interfaces';

interface StudioSnapshot {
  user: StudioUser;
  modelCode: ModelData | null;
  exportCount: number;
}

/**
 * Global meta-state: identity and project counter.
 * API key state lives in ApiKeysStateService (multi-key vault).
 *
 * Persisted in IndexedDB via StudioStorageService.
 */
@Injectable({ providedIn: 'root' })
export class StudioStateService {
  private readonly storage = inject(StudioStorageService);
  private readonly apiKeys = inject(ApiKeysStateService);
  private hydrated = false;

  private readonly _user = signal<StudioUser>({ handle: 'jander', initial: 'J' });
  private readonly _modelCode = signal<ModelData | null>(null);
  private readonly _exportCount = signal<number>(0);

  readonly user = this._user.asReadonly();
  readonly modelCode = this._modelCode.asReadonly();
  readonly exportCount = this._exportCount.asReadonly();

  readonly hasApiKey = computed(() => this.apiKeys.hasActiveKey());
  /** i18n key — translate in the template. */
  readonly apiBadge = computed(() =>
    this.apiKeys.hasActiveKey() ? 'STUDIO.API.CONNECTED' : 'STUDIO.API.NO_KEY',
  );

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: StudioSnapshot = {
        user: this._user(),
        modelCode: this._modelCode(),
        exportCount: this._exportCount(),
      };
      if (this.hydrated) {
        void this.storage.set('studio', snap);
      }
    });
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<StudioSnapshot>('studio');
      if (snap) {
        if (snap.user) this._user.set(snap.user);
        if (snap.modelCode) this._modelCode.set(snap.modelCode);
        if (typeof snap.exportCount === 'number') {
          this._exportCount.set(snap.exportCount);
        }
      }
    } finally {
      this.hydrated = true;
    }
  }

  incrementExportCount() {
    this._exportCount.update((n) => n + 1);
  }

  setModelCode(code: ModelData | null) {
    this._modelCode.set(code);
  }

  /**
   * Update the studio identity from the gate dialog. `initial` is derived
   * from the first character of the handle so the header avatar tracks
   * whatever username the user typed.
   */
  setUser(user: { handle: string }): void {
    const handle = user.handle.trim();
    if (!handle) return;
    this._user.set({
      handle,
      initial: handle.charAt(0).toUpperCase(),
    });
  }
}
