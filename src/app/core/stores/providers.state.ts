import { Injectable, computed, signal } from '@angular/core';
import { AIModel, AIProvider } from '@core/interfaces/providers.interface';

const STORAGE_KEY = 'dcs-ai-providers';
const ACTIVE_PROVIDER_KEY = 'dcs-ai-active-provider';
const ACTIVE_MODEL_KEY = 'dcs-ai-active-model';

function makeId(prefix: 'prov' | 'model'): string {
  return (
    prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
  );
}

function loadProviders(): AIProvider[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AIProvider[]) : [];
  } catch {
    return [];
  }
}

function saveProviders(list: AIProvider[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

function loadKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveKey(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Admin-managed catalog of AI providers and their models.
 *
 * Holds the provider list plus the currently-selected (active) provider
 * and model — those are the ones a future generation call would target.
 * Everything persists to localStorage; no backend integration yet.
 */
@Injectable({ providedIn: 'root' })
export class ProvidersStateService {
  private readonly _providers = signal<AIProvider[]>(loadProviders());
  private readonly _activeProviderId = signal<string | null>(
    loadKey(ACTIVE_PROVIDER_KEY),
  );
  private readonly _activeModelId = signal<string | null>(
    loadKey(ACTIVE_MODEL_KEY),
  );

  readonly providers = this._providers.asReadonly();
  readonly activeProviderId = this._activeProviderId.asReadonly();
  readonly activeModelId = this._activeModelId.asReadonly();

  readonly activeProvider = computed<AIProvider | null>(
    () =>
      this._providers().find((p) => p.id === this._activeProviderId()) ?? null,
  );

  readonly activeModel = computed<AIModel | null>(() => {
    const provider = this.activeProvider();
    if (!provider) return null;
    return (
      provider.models.find((m) => m.id === this._activeModelId()) ?? null
    );
  });

  // ---------------------------------------------------------------------------
  // Providers — CRUD
  // ---------------------------------------------------------------------------

  addProvider(input: {
    name: string;
    url: string;
    apiKey: string;
    description?: string;
  }): AIProvider {
    const provider: AIProvider = {
      id: makeId('prov'),
      name: input.name.trim(),
      url: input.url.trim(),
      apiKey: input.apiKey.trim(),
      description: input.description?.trim() || undefined,
      models: [],
      createdAt: new Date().toISOString(),
    };
    this._providers.update((list) => {
      const next = [...list, provider];
      saveProviders(next);
      return next;
    });
    return provider;
  }

  updateProvider(
    id: string,
    patch: Partial<Pick<AIProvider, 'name' | 'url' | 'apiKey' | 'description'>>,
  ): void {
    this._providers.update((list) => {
      const next = list.map((p) =>
        p.id === id
          ? {
              ...p,
              ...(patch.name !== undefined
                ? { name: patch.name.trim() }
                : {}),
              ...(patch.url !== undefined ? { url: patch.url.trim() } : {}),
              ...(patch.apiKey !== undefined
                ? { apiKey: patch.apiKey.trim() }
                : {}),
              ...(patch.description !== undefined
                ? { description: patch.description.trim() || undefined }
                : {}),
            }
          : p,
      );
      saveProviders(next);
      return next;
    });
  }

  removeProvider(id: string): void {
    this._providers.update((list) => {
      const next = list.filter((p) => p.id !== id);
      saveProviders(next);
      return next;
    });
    if (this._activeProviderId() === id) {
      this._activeProviderId.set(null);
      saveKey(ACTIVE_PROVIDER_KEY, null);
      this._activeModelId.set(null);
      saveKey(ACTIVE_MODEL_KEY, null);
    }
  }

  // ---------------------------------------------------------------------------
  // Models — nested CRUD under a provider
  // ---------------------------------------------------------------------------

  addModel(
    providerId: string,
    input: { name: string; description: string },
  ): AIModel | null {
    const model: AIModel = {
      id: makeId('model'),
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: new Date().toISOString(),
    };
    let attached: AIModel | null = null;
    this._providers.update((list) => {
      const next = list.map((p) => {
        if (p.id !== providerId) return p;
        attached = model;
        return { ...p, models: [...p.models, model] };
      });
      if (attached) saveProviders(next);
      return attached ? next : list;
    });
    return attached;
  }

  updateModel(
    providerId: string,
    modelId: string,
    patch: Partial<Pick<AIModel, 'name' | 'description'>>,
  ): void {
    this._providers.update((list) => {
      const next = list.map((p) => {
        if (p.id !== providerId) return p;
        return {
          ...p,
          models: p.models.map((m) =>
            m.id === modelId
              ? {
                  ...m,
                  ...(patch.name !== undefined
                    ? { name: patch.name.trim() }
                    : {}),
                  ...(patch.description !== undefined
                    ? { description: patch.description.trim() }
                    : {}),
                }
              : m,
          ),
        };
      });
      saveProviders(next);
      return next;
    });
  }

  removeModel(providerId: string, modelId: string): void {
    this._providers.update((list) => {
      const next = list.map((p) => {
        if (p.id !== providerId) return p;
        return { ...p, models: p.models.filter((m) => m.id !== modelId) };
      });
      saveProviders(next);
      return next;
    });
    if (this._activeModelId() === modelId) {
      this._activeModelId.set(null);
      saveKey(ACTIVE_MODEL_KEY, null);
    }
  }

  // ---------------------------------------------------------------------------
  // Active selection — drives which provider/model future API calls hit
  // ---------------------------------------------------------------------------

  setActiveProvider(id: string | null): void {
    this._activeProviderId.set(id);
    saveKey(ACTIVE_PROVIDER_KEY, id);
    // Reset active model whenever the provider changes — the previous
    // model id won't be valid under a different provider.
    this._activeModelId.set(null);
    saveKey(ACTIVE_MODEL_KEY, null);
  }

  setActiveModel(id: string | null): void {
    this._activeModelId.set(id);
    saveKey(ACTIVE_MODEL_KEY, id);
  }
}
