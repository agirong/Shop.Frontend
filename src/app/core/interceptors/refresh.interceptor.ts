import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

/**
 * Observable de refresh compartido entre peticiones concurrentes.
 *
 * Vive a nivel de módulo (singleton) para que varios 401 simultáneos
 * disparen una sola llamada a `refresh()` y todos esperen el mismo resultado
 * (coalescing, Req 6.4). Se limpia al completarse o fallar.
 */
let refreshInFlight$: Observable<string> | null = null;

/** Rutas de auth que no deben disparar el flujo de refresh (evita bucles, Req 6.4). */
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function isAuthEndpoint(url: string): boolean {
  return SKIP_REFRESH_PATHS.some((path) => url.includes(path));
}

/** Cabecera marca para no reintentar una petición más de una vez (evita bucles). */
const RETRIED_HEADER = 'X-Refresh-Retried';

/** Clona la petición con el token renovado y la marca como ya reintentada. */
function withRetryMark(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      [RETRIED_HEADER]: '1',
    },
  });
}

/**
 * Interceptor de renovación de sesión (Req 6).
 *
 * Ante un 401 por access token expirado:
 *  - llama a `refresh()` y, si tiene éxito, reintenta la petición original con
 *    el nuevo token (Req 6.1, 6.2);
 *  - coalesce refresh concurrentes en una sola llamada compartida (Req 6.4);
 *  - si el refresh falla, limpia la sesión y redirige al login (Req 6.3);
 *  - evita bucles: ignora los endpoints de auth y no reintenta una petición ya
 *    reintentada.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const alreadyRetried = req.headers.has(RETRIED_HEADER);
      const shouldAttemptRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint(req.url) &&
        !alreadyRetried;

      if (!shouldAttemptRefresh) {
        return throwError(() => error);
      }

      // Coalescing: reutiliza el refresh en vuelo o inicia uno nuevo.
      if (!refreshInFlight$) {
        refreshInFlight$ = auth.refresh().pipe(
          map((res) => res.access_token),
          catchError((refreshError: unknown) => {
            auth.clearSession();
            void router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
          finalize(() => {
            refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }

      return refreshInFlight$.pipe(switchMap((token) => next(withRetryMark(req, token))));
    }),
  );
};
