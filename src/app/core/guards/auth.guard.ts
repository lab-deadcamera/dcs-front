import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/stores/session.store';

/**
 * Guards the private (authenticated) routes.
 * Redirects to /auth/login when the user has no valid token.
 */
export function authGuard() {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/auth/login');
}
