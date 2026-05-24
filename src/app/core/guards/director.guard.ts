import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/stores/session.store';
import { LEVEL_ROL } from '../constants';

/**
 * Guards director routes — DIRECTOR (level 2), ADMIN (level 1), SUPER_ADMIN (level 0).
 * Level must be <= 2.
 */
export function directorGuard() {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated() && session.roleLevel() <= LEVEL_ROL.DIRECTOR) {
    return true;
  }

  return router.parseUrl('/');
}
