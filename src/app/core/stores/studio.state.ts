import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StudioUser } from '../interfaces/studio.models';
import { ApiKeysStateService } from './api-keys.state';
import { StudioStorageService } from './studio-storage.service';

interface StudioSnapshot {
  user: StudioUser;
  projectCode: string;
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
  private readonly _projectCode = signal<string>('SR · 20');
  private readonly _exportCount = signal<number>(0);

  readonly user = this._user.asReadonly();
  readonly projectCode = this._projectCode.asReadonly();
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
        projectCode: this._projectCode(),
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
        if (snap.projectCode) this._projectCode.set(snap.projectCode);
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

  setProjectCode(code: string) {
    this._projectCode.set(code);
  }
}
