import { computed } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState,
} from '@ngrx/signals';
import type { SessionState, UserSession } from '@core/interfaces';
import { inject } from '@angular/core';
import { SessionStorageService } from './session-storage.service';

const initialState: SessionState = {
  user: null,
  token: null,
  isLoading: true,
};

/**
 * SessionStore
 * 
 * * Centralized state management for session data, handling authentication state, user/token persistence, and lazy loading.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user, token }) => ({
    isAuthenticated: computed(() => user() !== null && token() !== null),
  })),
  withMethods((store, storage = inject(SessionStorageService)) => ({
    async login(user: UserSession, token: string) {
      patchState(store, { user, token, isLoading: false });
      await storage.set({ user, token });
    },
    async logout() {
      patchState(store, { user: null, token: null, isLoading: false });
      await storage.delete();
    },
    async setUser(user: UserSession) {
      patchState(store, { user });
    },
    async load() {
      const session = await storage.get();
      if (session) {
        patchState(store, {
          user: session.user,
          token: session.token,
          isLoading: false,
        });
      } else {
        patchState(store, { isLoading: false });
      }
    },
  })),
  withHooks({
    onInit(store) {
      store.load();
    },
  }),
);
