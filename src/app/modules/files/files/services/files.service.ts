import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { FileCategory, FileEntity, FileStorage, UploadParams } from '../interfaces';
import { FilesApiService } from '@app/services/files-api.service';

/**
 * Business layer for Files. Maintains a paginated list scoped to the
 * currently-active category (or trash) and delegates HTTP work to
 * `FilesApiService`.
 */
@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly api = inject(FilesApiService);

  private readonly _items = signal<FileEntity[]>([]);
  private readonly _loading = signal(false);
  private readonly _category = signal<FileCategory | 'trash'>('images');
  private readonly _searchQuery = signal<string>('');

  // Pagination state
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _totalPages = signal(0);
  private readonly _pageSize = signal(50);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly category = this._category.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly count = computed(() => this._items().length);

  /** Switch active view + refresh items from the backend. */
  setCategory(next: FileCategory | 'trash'): Observable<unknown> {
    this._category.set(next);
    this._page.set(1);
    return this.load();
  }

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

  load(): Observable<{ error: boolean; msg: string; data?: any }> {
    const cat = this._category();
    const page = this._page();
    const pageSize = this._pageSize();
    const q = this._searchQuery();

    // Trash and temp still use the non-paginated endpoints
    if (cat === 'trash' || cat === 'temp') {
      this._loading.set(true);
      const source$ = cat === 'trash' ? this.api.listTrash() : this.api.list('temp', 'temp');
      return source$.pipe(
        tap((res) => {
          if (!res.error && res.data) {
            this._items.set(res.data);
            this._total.set(res.data.length);
            this._totalPages.set(1);
          }
          this._loading.set(false);
        }),
      );
    }

    this._loading.set(true);
    return this.api.listPage({ page, pageSize, category: cat as FileCategory, q: q || undefined }).pipe(
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

  upload(payload: UploadParams): Observable<{ error: boolean; msg: string; data?: FileEntity }> {
    return this.api.upload(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          const active = this._category();
          const landsHere =
            active === 'trash'
              ? false
              : payload.category === active && (payload.storage === 'persistent' || payload.storage === 'temp');
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

  restore(
    id: string,
    storage: FileStorage = 'persistent',
  ): Observable<{
    error: boolean;
    msg: string;
  }> {
    const op$ = storage === 'temp' ? this.api.recoverTemp(id) : this.api.restore(id);
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
