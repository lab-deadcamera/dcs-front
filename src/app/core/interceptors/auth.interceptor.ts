import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Inyecta el token JWT en todas las peticiones salientes si existe.
 * No interfiere con peticiones que ya tengan un header Authorization.
 *
 * Si el backend responde con 401, cierra la sesión y redirige al login,
 * excepto para la propia petición de login (para evitar un bucle).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('dcs-token');
  const router = inject(Router);

  const handled = token && !req.headers.has('Authorization')
    ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(req);

  return handled.pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
        && !req.url.startsWith(`${environment.API_URL}/auth/login`)
      ) {
        localStorage.removeItem('dcs-token');
        router.navigateByUrl('/auth/login');
      }
      return throwError(() => error);
    }),
  );
};
