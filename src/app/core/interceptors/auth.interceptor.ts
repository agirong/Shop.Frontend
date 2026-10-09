import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor de autenticación.
 *
 * TODO (tarea 6): adjuntar `Authorization: Bearer <token>` a las peticiones
 * dirigidas al `apiBaseUrl`, exceptuando `/auth/login`, `/auth/register`
 * y `/auth/refresh`.
 *
 * Por ahora es un pass-through para dejar la cadena de interceptores lista.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
