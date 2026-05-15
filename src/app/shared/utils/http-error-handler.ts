import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';

/**
 * Central RxJS `catchError` handler for feature API services.
 *
 * Converts any HTTP failure into the project-wide normalized response
 * shape (`{ error: true, msg, data: undefined }`) so components never
 * have to handle raw `HttpErrorResponse` objects. Logs to the console
 * for developer visibility; UI is responsible for displaying `msg`.
 */
export function httpErrorHandler<T>(
  err: HttpErrorResponse,
): Observable<{ error: true; msg: string; data?: T }> {
  console.log({ err });
  const msg =
    (typeof err.error === 'object' && err.error && 'message' in err.error
      ? String((err.error as { message: unknown }).message)
      : null) ||
    err.message ||
    'Unknown HTTP error';

  console.error('[http]', err.status, msg, err);
  return of({ error: true, msg, data: undefined });
}
