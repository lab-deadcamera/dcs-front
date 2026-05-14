import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Provider, ProviderWithModels, Model } from '../interfaces';
import { ProvidersApiService } from './providers-api.service';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly api = inject(ProvidersApiService);

  private readonly _providers = signal<ProviderWithModels[]>([]);
  private readonly _loading = signal(false);

  readonly providers = this._providers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly count = computed(() => this._providers().length);

  load(): Observable<{ error: boolean; msg: string; data?: ProviderWithModels[] }> {
    this._loading.set(true);
    return this.api.listProviders().pipe(
      tap((res) => {
        if (!res.error && res.data) this._providers.set(res.data);
        this._loading.set(false);
      }),
    );
  }

  getModelsForProvider(providerId: string): Model[] {
    const p = this._providers().find((p) => p.provider.id === providerId);
    return p?.models ?? [];
  }

  createProvider(
    name: string,
  ): Observable<{ error: boolean; msg: string; data?: Provider }> {
    return this.api.createProvider({ name }).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._providers.update((list) => [
            { provider: res.data!, models: [] },
            ...list,
          ]);
        }
      }),
    );
  }

  updateProvider(
    id: string,
    payload: { name?: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Provider }> {
    return this.api.updateProvider(id, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._providers.update((list) =>
            list.map((p) =>
              p.provider.id === id ? { provider: res.data!, models: p.models } : p,
            ),
          );
        }
      }),
    );
  }

  deleteProvider(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteProvider(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._providers.update((list) => list.filter((p) => p.provider.id !== id));
        }
      }),
    );
  }

  createModel(
    payload: { provider_id: string; name: string; api_key: string; url: string; endpoint: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Model }> {
    return this.api.createModel(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._providers.update((list) =>
            list.map((p) =>
              p.provider.id === payload.provider_id
                ? { ...p, models: [...p.models, res.data!] }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateModel(
    id: string,
    providerId: string,
    payload: { name?: string; api_key?: string; url?: string; endpoint?: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Model }> {
    return this.api.updateModel(id, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._providers.update((list) =>
            list.map((p) =>
              p.provider.id === providerId
                ? {
                    ...p,
                    models: p.models.map((m) => (m.id === id ? res.data! : m)),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteModel(
    modelId: string,
    providerId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteModel(modelId).pipe(
      tap((res) => {
        if (!res.error) {
          this._providers.update((list) =>
            list.map((p) =>
              p.provider.id === providerId
                ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
                : p,
            ),
          );
        }
      }),
    );
  }
}
