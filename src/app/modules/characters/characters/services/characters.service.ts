import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
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
  private readonly _searchQuery = signal<string>('');

  // Pagination state (infinite-scroll chunks; pageSize matches the backend cap).
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _totalPages = signal(0);
  private readonly _pageSize = signal(200);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly count = computed(() => this._items().length);

  /** True when more items exist on the server than are currently loaded. */
  readonly hasMore = computed(() => this._items().length < this._total());

  /** Items bucketed by asset type. Untyped rows fall into `character`. */
  readonly itemsByType = computed<Record<AssetType, Character[]>>(() => {
    const buckets: Record<AssetType, Character[]> = {
      character: [],
      location: [],
      prop: [],
      audio: [],
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
      audio: b.audio.length,
    };
  });

  /** Set search query and reload from page 1. */
  setSearchQuery(q: string): void {
    this._searchQuery.set(q);
    this._page.set(1);
    this.load().subscribe();
  }

  /** Go to a specific page. */
  goToPage(page: number): void {
    if (page < 1 || (this._totalPages() > 0 && page > this._totalPages())) return;
    this._page.set(page);
    this.load().subscribe();
  }

  /** Refresh the in-memory cache from the backend (page 1, full chunk). */
  load(): Observable<{ error: boolean; msg: string; data?: any }> {
    this._loading.set(true);
    return this.api
      .listPage({
        page: this._page(),
        pageSize: this._pageSize(),
        q: this._searchQuery() || undefined,
      })
      .pipe(
        tap((res) => {
          if (!res.error && res.data) {
            this._items.set(res.data.items);
            this._total.set(res.data.total);
            this._page.set(res.data.page);
            this._totalPages.set(res.data.totalPages);
          }
          this._loading.set(false);
        }),
      );
  }

  /** Fetch the next chunk from the server and append it to the loaded items.
   *  Keeps the current search query; no-op when the server has no more items. */
  loadMore(): Observable<{ error: boolean; msg: string; data?: any }> {
    if (!this.hasMore()) {
      return of({ error: false, msg: '', data: undefined }); // nothing left to fetch
    }
    const nextPage = this._page() + 1;
    this._loading.set(true);
    return this.api
      .listPage({
        page: nextPage,
        pageSize: this._pageSize(),
        q: this._searchQuery() || undefined,
      })
      .pipe(
        tap((res) => {
          if (!res.error && res.data) {
            const incoming: CharacterWithFiles[] = (res.data.items || []) as CharacterWithFiles[];
            const known = new Set(this._items().map((i) => i.character.id));
            this._items.update((list) => [
              ...list,
              ...incoming.filter((i) => !known.has(i.character.id)),
            ]);
            this._total.set(res.data.total);
            this._page.set(res.data.page);
            this._totalPages.set(res.data.totalPages);
          }
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
            list.map((c) => (c.character.id === id ? { character: res.data!, files: c.files } : c)),
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
