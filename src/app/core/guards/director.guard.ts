import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/stores/session.store';

/**
 * Guards director routes — DIRECTOR (level 2), ADMIN (level 1), SUPER_ADMIN (level 0).
 * Level must be <= 2.
 */
export function directorGuard() {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated() && session.roleLevel() <= 2) {
    return true;
  }

  return router.parseUrl('/');
}
