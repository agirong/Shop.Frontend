import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de renovación de sesión.
 *
 * TODO (tarea 6): ante un 401 por access token expirado, llamar a `refresh()`
 * y reintentar la petición original; coalescer refresh concurrentes; si el
 * refresh falla, hacer logout y redirigir al login, evitando bucles.
 *
 * Por ahora es un pass-through para dejar la cadena de interceptores lista.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
