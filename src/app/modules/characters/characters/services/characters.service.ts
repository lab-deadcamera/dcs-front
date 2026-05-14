import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CharactersApiService } from './characters-api.service';
import {
  AssetType,
  Character,
  CharacterFile,
  CharacterMetadata,
  CharacterWithFiles,
  CharacterWire,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../interfaces';

@Injectable({ providedIn: 'root' })
export class CharactersService {
  private readonly api = inject(CharactersApiService);

  private readonly _items = signal<CharacterWithFiles[]>([]);
  private readonly _loading = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly count = computed(() => this._items().length);

  /** Items bucketed by asset type. Untyped rows fall into `character`. */
  readonly itemsByType = computed<Record<AssetType, Character[]>>(() => {
    const buckets: Record<AssetType, Character[]> = {
      character: [],
      location: [],
      prop: [],
    };
    for (const item of this._items()) {
      if (!item.character.metadata) continue;

      const metadata: CharacterMetadata = JSON.parse(item.character.metadata);

      const t = metadata.assetType || 'character';
      const characterItem: Character = {
        ...item.character,
        metadata,
        createdAt: item.character.created_at,
        updatedAt: item.character.updated_at,
        deletedAt: item.character.deleted_at,
      };
      if (buckets[t]) {
        buckets[t].push(characterItem);
      } else {
        buckets.character.push(characterItem);
      }
    }
    return buckets;
  });

  /** Quick counts per bucket — drives the tab badges. */
  readonly countByType = computed<Record<AssetType, number>>(() => {
    const b = this.itemsByType();
    return {
      character: b.character.length,
      location: b.location.length,
      prop: b.prop.length,
    };
  });

  /** Refresh the in-memory cache from the backend. */
  load(): Observable<{ error: boolean; msg: string; data?: CharacterWithFiles[] }> {
    this._loading.set(true);
    return this.api.list().pipe(
      tap((res) => {
        if (!res.error && res.data) this._items.set(res.data);
        this._loading.set(false);
      }),
    );
  }

  getById(id: string): Observable<{
    error: boolean;
    msg: string;
    data?: { character: Character; files: CharacterFile[] };
  }> {
    return this.api.getById(id);
  }

  create(
    payload: CreateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: CharacterWire }> {
    return this.api.create(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._items.update((list) => [{ character: res.data!, files: [] }, ...list]);
        }
      }),
    );
  }

  update(
    id: string,
    payload: UpdateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: CharacterWire }> {
    return this.api.update(id, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._items.update((list) =>
            list.map((c) =>
              c.character.id === id ? { character: res.data!, files: c.files } : c,
            ),
          );
        }
      }),
    );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.delete(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._items.update((list) => list.filter((c) => c.character.id !== id));
        }
      }),
    );
  }

  assignFile(
    characterId: string,
    fileId: string,
    role: 'reference' | 'portrait' | 'asset' = 'reference',
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.assignFile(characterId, fileId, role);
  }

  listFiles(characterId: string): Observable<{
    error: boolean;
    msg: string;
    data?: CharacterFile[];
  }> {
    return this.api.listFiles(characterId);
  }

  unassignFile(characterId: string, fileId: string): Observable<{ error: boolean; msg: string }> {
    return this.api.unassignFile(characterId, fileId);
  }
}
