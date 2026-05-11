import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StudioUser } from '../interfaces/studio.models';
import { StudioStorageService } from './studio-storage.service';

interface StudioSnapshot {
  user: StudioUser;
  apiKey: string | null;
  projectCode: string;
  exportCount: number;
}

/**
 * Global meta-state: identity, API connection, project counter.
 * Persisted in IndexedDB via StudioStorageService.
 */
@Injectable({ providedIn: 'root' })
export class StudioStateService {
  private readonly storage = inject(StudioStorageService);
  private hydrated = false;

  private readonly _user = signal<StudioUser>({ handle: 'jander', initial: 'J' });
  private readonly _apiKey = signal<string | null>(null);
  private readonly _projectCode = signal<string>('SR · 20');
  private readonly _exportCount = signal<number>(0);

  readonly user = this._user.asReadonly();
  readonly apiKey = this._apiKey.asReadonly();
  readonly projectCode = this._projectCode.asReadonly();
  readonly exportCount = this._exportCount.asReadonly();

  readonly hasApiKey = computed(() => this._apiKey() !== null);
  /** i18n key — translate in the template. */
  readonly apiBadge = computed(() =>
    this._apiKey() ? 'STUDIO.API.CONNECTED' : 'STUDIO.API.NO_KEY',
  );

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: StudioSnapshot = {
        user: this._user(),
        apiKey: this._apiKey(),
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
        this._user.set(snap.user);
        this._apiKey.set(snap.apiKey);
        this._projectCode.set(snap.projectCode);
        this._exportCount.set(snap.exportCount);
      }
    } finally {
      this.hydrated = true;
    }
  }

  setApiKey(key: string | null) {
    this._apiKey.set(key && key.trim() ? key : null);
  }

  incrementExportCount() {
    this._exportCount.update((n) => n + 1);
  }

  setProjectCode(code: string) {
    this._projectCode.set(code);
  }
}
