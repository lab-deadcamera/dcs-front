import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  API_ENDPOINTS,
  ApiEndpoint,
  ApiKey,
  DEFAULT_ENDPOINT_ID,
} from '../interfaces/api-keys.interface';
import { StudioStorageService } from './studio-storage.service';

const SCHEMA_VERSION = 1;

interface KeysSnapshot {
  __v: number;
  keys: ApiKey[];
  activeId: string | null;
}

/**
 * Multi-key vault for BytePlus / Volcengine credentials.
 * Mirrors the keys.json + /api/keys endpoints in dcs-v0/server.js — but
 * lives entirely in the browser, persisted via IndexedDB.
 *
 * Security note: the key value is stored unmasked in IndexedDB so the
 * upcoming SeedanceService can use it for Bearer auth. This is the same
 * trust model as dcs-v0 (key on the user's machine, never leaves it).
 */
@Injectable({ providedIn: 'root' })
export class ApiKeysStateService {
  private readonly storage = inject(StudioStorageService);
  private hydrated = false;

  private readonly _keys = signal<ApiKey[]>([]);
  private readonly _activeId = signal<string | null>(null);

  readonly keys = this._keys.asReadonly();
  readonly activeId = this._activeId.asReadonly();
  readonly activeKey = computed(
    () => this._keys().find((k) => k.id === this._activeId()) ?? null,
  );
  readonly hasActiveKey = computed(() => this.activeKey() !== null);
  readonly endpoints: readonly ApiEndpoint[] = API_ENDPOINTS;

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: KeysSnapshot = {
        __v: SCHEMA_VERSION,
        keys: this._keys(),
        activeId: this._activeId(),
      };
      if (this.hydrated) {
        void this.storage.set('keys', snap);
      }
    });
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<KeysSnapshot>('keys');
      if (snap && snap.__v === SCHEMA_VERSION) {
        this._keys.set(snap.keys);
        this._activeId.set(snap.activeId);
      }
    } finally {
      this.hydrated = true;
    }
  }

  add(input: {
    name?: string;
    value: string;
    endpoint?: string;
    ak?: string;
    sk?: string;
  }): ApiKey {
    const endpoint =
      input.endpoint && API_ENDPOINTS.some((e) => e.id === input.endpoint)
        ? input.endpoint
        : DEFAULT_ENDPOINT_ID;

    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: input.name?.trim() || `key-${this._keys().length + 1}`,
      value: input.value.trim(),
      endpoint,
      ak: input.ak?.trim() || null,
      sk: input.sk?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    this._keys.update((list) => [...list, newKey]);
    if (!this._activeId()) this._activeId.set(newKey.id);
    return newKey;
  }

  activate(id: string) {
    if (this._keys().some((k) => k.id === id)) {
      this._activeId.set(id);
    }
  }

  remove(id: string) {
    const wasActive = this._activeId() === id;
    this._keys.update((list) => list.filter((k) => k.id !== id));
    if (wasActive) {
      this._activeId.set(this._keys()[0]?.id ?? null);
    }
  }

  rename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this._keys.update((list) =>
      list.map((k) => (k.id === id ? { ...k, name: trimmed } : k)),
    );
  }

  setEndpoint(id: string, endpoint: string) {
    if (!API_ENDPOINTS.some((e) => e.id === endpoint)) return;
    this._keys.update((list) =>
      list.map((k) => (k.id === id ? { ...k, endpoint } : k)),
    );
  }
}
