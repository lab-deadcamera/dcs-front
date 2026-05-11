import { Injectable, computed, signal } from '@angular/core';
import { User } from '../interfaces/studio.models';

/**
 * Global meta-state: identity, API connection, project counter.
 * Everything is exposed read-only; mutations go through methods.
 */
@Injectable({ providedIn: 'root' })
export class StudioStateService {
  private readonly _user = signal<User>({ handle: 'jander', initial: 'J' });
  private readonly _apiKey = signal<string | null>(null);
  private readonly _projectCode = signal<string>('SR · 20');
  private readonly _exportCount = signal<number>(0);

  readonly user = this._user.asReadonly();
  readonly apiKey = this._apiKey.asReadonly();
  readonly projectCode = this._projectCode.asReadonly();
  readonly exportCount = this._exportCount.asReadonly();

  readonly hasApiKey = computed(() => this._apiKey() !== null);
  readonly apiBadge = computed(() => (this._apiKey() ? 'connected' : 'no key'));

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
