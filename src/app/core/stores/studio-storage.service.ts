import { Injectable } from '@angular/core';

const DB_NAME = 'dcs-videos-studio';
const STORE_NAME = 'studio';
const DB_VERSION = 1;

export type StudioStorageKey = 'studio' | 'prompt' | 'assets' | 'keys';

/**
 * IndexedDB-backed key/value storage for studio state slices.
 * Mirrors the shape of SessionStorageService so the persistence patterns
 * stay aligned across the app.
 */
@Injectable({ providedIn: 'root' })
export class StudioStorageService {
  #db: IDBDatabase | null = null;

  async #openDb(): Promise<IDBDatabase> {
    if (this.#db) return this.#db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        this.#db = request.result;
        this.#db.onclose = () => { this.#db = null; };
        resolve(this.#db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: StudioStorageKey): Promise<T | null> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result ?? null) as T | null);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(key: StudioStorageKey, value: T): Promise<void> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: StudioStorageKey): Promise<void> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
