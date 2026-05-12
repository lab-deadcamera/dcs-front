import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CharactersApiService } from './characters-api.service';
import {
  Character,
  CharacterFile,
  CharacterFileLinkView,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../interfaces';

/**
 * Business layer for Characters. Holds the in-memory list signal that
 * the UI binds to and orchestrates create / update / delete through
 * `CharactersApiService`. Keeps every HTTP detail (env URL, error mapping,
 * wire format) inside the API service.
 */
@Injectable({ providedIn: 'root' })
export class CharactersService {
  private readonly api = inject(CharactersApiService);

  private readonly _items = signal<Character[]>([]);
  private readonly _loading = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly count = computed(() => this._items().length);

  /** Refresh the in-memory cache from the backend. */
  load(): Observable<{ error: boolean; msg: string; data?: Character[] }> {
    this._loading.set(true);
    return this.api.list().pipe(
      tap((res) => {
        if (!res.error && res.data) this._items.set(res.data);
        this._loading.set(false);
      }),
    );
  }

  getById(
    id: string,
  ): Observable<{
    error: boolean;
    msg: string;
    data?: { character: Character; files: CharacterFile[] };
  }> {
    return this.api.getById(id);
  }

  create(
    payload: CreateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Character }> {
    return this.api.create(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._items.update((list) => [res.data!, ...list]);
        }
      }),
    );
  }

  update(
    id: string,
    payload: UpdateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Character }> {
    return this.api.update(id, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          const updated = res.data;
          this._items.update((list) =>
            list.map((c) => (c.id === id ? { ...c, ...updated } : c)),
          );
        }
      }),
    );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.delete(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._items.update((list) => list.filter((c) => c.id !== id));
        }
      }),
    );
  }

  assignFile(
    characterId: string,
    fileId: string,
    role: string = 'reference',
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.assignFile(characterId, fileId, role);
  }

  listFiles(
    characterId: string,
  ): Observable<{
    error: boolean;
    msg: string;
    data?: CharacterFileLinkView[];
  }> {
    return this.api.listFiles(characterId);
  }

  unassignFile(
    characterId: string,
    fileId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.unassignFile(characterId, fileId);
  }
}
