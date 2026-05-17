import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '@core/stores/session.store';

/**
 * Inyecta el token JWT en todas las peticiones salientes si existe.
 * No interfiere con peticiones que ya tengan un header Authorization.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const token = session.token();

  if (token && !req.headers.has('Authorization')) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned);
  }

  return next(req);
};
