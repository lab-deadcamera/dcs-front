import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/stores/session.store';
import { LEVEL_ROL } from '../constants';

/**
 * Guards admin routes — only SUPER_ADMIN (level 0) and ADMIN (level 1).
 */
export function adminGuard() {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated() && session.roleLevel() <= LEVEL_ROL.ADMIN) {
    return true;
  }

  return router.parseUrl('/');
}
