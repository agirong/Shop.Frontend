import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/**
 * Rutas de la aplicación.
 *
 * Mapa objetivo (ver design.md). Las rutas se registran con lazy loading
 * (`loadComponent`) a medida que se implementan sus páginas en tareas posteriores:
 *
 *   ''         → CatalogPage   (pública)    — tarea 8
 *   'cart'     → CartPage      (pública)    — tarea 9
 *   'login'    → LoginPage     (pública)    — tarea 10
 *   'register' → RegisterPage  (pública)    — tarea 10
 *   'checkout' → CheckoutPage  (authGuard)  — tarea 11
 *   '**'       → redirect a '' — tarea 12
 *
 * Ejemplo de registro con lazy loading:
 *   {
 *     path: '',
 *     loadComponent: () =>
 *       import('./features/catalog/catalog-page').then((m) => m.CatalogPage),
 *   }
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/catalog/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/checkout-page').then((m) => m.CheckoutPage),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
