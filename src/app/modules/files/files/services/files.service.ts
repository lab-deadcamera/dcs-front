import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { FilesApiService } from './files-api.service';
import {
  FileCategory,
  FileEntity,
  FileStorage,
  UploadParams,
} from '../interfaces';

/**
 * Business layer for Files. Maintains an in-memory list scoped to the
 * currently-active category (or trash) and delegates HTTP work to
 * `FilesApiService`.
 */
@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly api = inject(FilesApiService);

  private readonly _items = signal<FileEntity[]>([]);
  private readonly _loading = signal(false);
  private readonly _category = signal<FileCategory | 'trash'>('images');

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly category = this._category.asReadonly();
  readonly count = computed(() => this._items().length);

  /** Switch active view + refresh items from the backend. */
  setCategory(next: FileCategory | 'trash'): Observable<unknown> {
    this._category.set(next);
    return this.load();
  }

  load(): Observable<{ error: boolean; msg: string; data?: FileEntity[] }> {
    const cat = this._category();
    this._loading.set(true);
    const source$ =
      cat === 'trash'
        ? this.api.listTrash()
        : this.api.list(cat as FileCategory, 'persistent');

    return source$.pipe(
      tap((res) => {
        if (!res.error && res.data) this._items.set(res.data);
        this._loading.set(false);
      }),
    );
  }

  upload(
    payload: UploadParams,
  ): Observable<{ error: boolean; msg: string; data?: FileEntity }> {
    return this.api.upload(payload).pipe(
      tap((res) => {
        // Prepend to the current list if the upload lands in the active view.
        if (!res.error && res.data) {
          const active = this._category();
          const landsHere =
            active === 'trash'
              ? false
              : payload.category === active &&
                payload.storage === 'persistent';
          if (landsHere) {
            this._items.update((list) => [res.data!, ...list]);
          }
        }
      }),
    );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.delete(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._items.update((list) => list.filter((f) => f.id !== id));
        }
      }),
    );
  }

  restore(id: string, storage: FileStorage = 'persistent'): Observable<{
    error: boolean;
    msg: string;
  }> {
    const op$ =
      storage === 'temp' ? this.api.recoverTemp(id) : this.api.restore(id);
    return op$.pipe(
      tap((res) => {
        if (!res.error && this._category() === 'trash') {
          this._items.update((list) => list.filter((f) => f.id !== id));
        }
      }),
    );
  }

  hardDelete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.hardDelete(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._items.update((list) => list.filter((f) => f.id !== id));
        }
      }),
    );
  }

  /** Re-exposed for direct lookups. */
  serveUrl(id: string): string {
    return this.api.serveUrl(id);
  }
}
