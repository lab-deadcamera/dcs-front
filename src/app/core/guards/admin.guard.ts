import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/stores/session.store';

/**
 * Guards admin routes — only SUPER_ADMIN (level 0) and ADMIN (level 1).
 */
export function adminGuard() {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated() && session.roleLevel() <= 1) {
    return true;
  }

  return router.parseUrl('/');
}
