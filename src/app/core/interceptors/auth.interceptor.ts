import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth/auth.service';
import { environment } from '../../shared/environment';

/** Rutas de autenticación que NO deben llevar el header `Authorization`. */
const SKIP_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'] as const;

/** `true` si la URL apunta a uno de los endpoints de autenticación excluidos. */
function isAuthEndpoint(url: string): boolean {
  return SKIP_AUTH_PATHS.some((path) => url.includes(path));
}

/**
 * Interceptor de autenticación (Req 5.5).
 *
 * Adjunta `Authorization: Bearer <token>` a las peticiones dirigidas al
 * `apiBaseUrl` cuando hay un access token en memoria, exceptuando los
 * endpoints `/auth/login`, `/auth/register` y `/auth/refresh`, que o bien no
 * requieren token o lo gestionan vía la cookie de refresh.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();

  const targetsApi = req.url.startsWith(environment.apiBaseUrl);
  if (!token || !targetsApi || isAuthEndpoint(req.url)) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
