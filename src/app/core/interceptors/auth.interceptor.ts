import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Inyecta el token JWT en todas las peticiones salientes si existe.
 * No interfiere con peticiones que ya tengan un header Authorization.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('dcs-token');

  if (token && !req.headers.has('Authorization')) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned);
  }

  return next(req);
};
