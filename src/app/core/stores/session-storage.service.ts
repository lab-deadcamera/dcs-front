import { Injectable } from '@angular/core';
import type { Session } from '@core/interfaces';

const DB_NAME = 'dcs-videos';
const STORE_NAME = 'session';
const DB_VERSION = 1;


/**
 * @description
 * 
 * Abstraction layer for IndexedDB operations, encapsulating the boilerplate of opening connections and transactions.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorageService {
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

  async get(): Promise<Session | null> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('session');

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(session: Session): Promise<void> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(session, 'session');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(): Promise<void> {
    const db = await this.#openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete('session');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
