import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';

/**
 * Guard de autenticación (Req 7.1, 7.3).
 *
 * Protege las rutas que exigen sesión (p. ej. `/checkout`):
 *  - permite la activación cuando `isAuthenticated()` es `true`;
 *  - en caso contrario redirige al login conservando la URL que el usuario
 *    intentaba abrir en el parámetro `returnUrl`, para volver a ese flujo tras
 *    iniciar sesión (Req 5.4, 7.1).
 */
export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
