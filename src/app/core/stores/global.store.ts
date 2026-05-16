import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { StudioStorageService } from './studio-storage.service';
import {
  ApiEndpoint,
  ApiKey,
  API_ENDPOINTS,
  DEFAULT_ENDPOINT_ID,
} from '../interfaces/api-keys.interface';

const SCHEMA_VERSION = 1;

interface GlobalSnapshot {
  __v: number;
  keys: ApiKey[];
  activeKeyId: string | null;
}

/**
 * Global store — API keys (BytePlus / Volcengine credentials).
 *
 * Persisted in IndexedDB via StudioStorageService. Other global concerns
 * (presets, etc.) live in their own dedicated services for now.
 *
 * Security note: the key value is stored unmasked in IndexedDB so the
 * SeedanceService can use it for Bearer auth. This is the same trust
 * model as dcs-v0 (key on the user's machine, never leaves it).
 */
@Injectable({ providedIn: 'root' })
export class GlobalStore {
  private readonly storage = inject(StudioStorageService);
  private hydrated = false;

  private readonly _keys = signal<ApiKey[]>([]);
  private readonly _activeKeyId = signal<string | null>(null);

  readonly keys = this._keys.asReadonly();
  readonly activeId = this._activeKeyId.asReadonly();
  readonly activeKey = computed(
    () => this._keys().find((k) => k.id === this._activeKeyId()) ?? null,
  );
  readonly hasActiveKey = computed(() => this.activeKey() !== null);
  readonly endpoints: readonly ApiEndpoint[] = API_ENDPOINTS;

  /** i18n key — translate in the template. */
  readonly apiBadge = computed(() =>
    this.hasActiveKey() ? 'STUDIO.API.CONNECTED' : 'STUDIO.API.NO_KEY',
  );

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: GlobalSnapshot = {
        __v: SCHEMA_VERSION,
        keys: this._keys(),
        activeKeyId: this._activeKeyId(),
      };
      if (this.hydrated) {
        void this.storage.set('keys', snap);
      }
    });
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<GlobalSnapshot>('keys');
      if (snap && snap.__v === SCHEMA_VERSION) {
        this._keys.set(snap.keys);
        this._activeKeyId.set(snap.activeKeyId);
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
    if (!this._activeKeyId()) this._activeKeyId.set(newKey.id);
    return newKey;
  }

  activate(id: string) {
    if (this._keys().some((k) => k.id === id)) {
      this._activeKeyId.set(id);
    }
  }

  remove(id: string) {
    const wasActive = this._activeKeyId() === id;
    this._keys.update((list) => list.filter((k) => k.id !== id));
    if (wasActive) {
      this._activeKeyId.set(this._keys()[0]?.id ?? null);
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
