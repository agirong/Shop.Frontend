import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { CartSummary } from '../../features/cart/cart-summary';

/**
 * Encabezado principal de la aplicación (Tarea 12).
 *
 * Muestra navegación: Catálogo, Carrito (con CartSummary), y enlaces de sesión
 * (Login/Registro o Cerrar sesión) según el estado de autenticación.
 * Textos en español, accesible con HTML semántico y foco visible.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CartSummary],
  template: `
    <header class="border-b border-gray-200 bg-white">
      <nav
        class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Navegación principal"
      >
        <!-- Logo / nombre -->
        <a
          routerLink="/"
          class="text-lg font-bold text-gray-900 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          E-Shop
        </a>

        <!-- Enlaces de navegación -->
        <ul class="flex items-center gap-1 sm:gap-2" role="list">
          <!-- Catálogo -->
          <li>
            <a
              routerLink="/"
              routerLinkActive="bg-gray-100"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Catálogo
            </a>
          </li>

          <!-- Carrito (mini-resumen) -->
          <li>
            <app-cart-summary />
          </li>

          <!-- Sesión -->
          @if (auth.isAuthenticated()) {
            <li class="hidden text-sm text-gray-600 sm:list-item" aria-hidden="true">
              {{ auth.currentUser()?.email }}
            </li>
            <li>
              <button
                type="button"
                (click)="onLogout()"
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Cerrar sesión
              </button>
            </li>
          } @else {
            <li>
              <a
                routerLink="/login"
                routerLinkActive="bg-gray-100"
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Iniciar sesión
              </a>
            </li>
            <li>
              <a
                routerLink="/register"
                routerLinkActive="bg-gray-100"
                class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Registrarse
              </a>
            </li>
          }
        </ul>
      </nav>
    </header>
  `,
})
export class AppHeader {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Cierra la sesión y redirige al catálogo (Req 5.6). */
  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        // Aunque falle la petición, limpiamos el estado local
        this.auth.clearSession();
        this.router.navigateByUrl('/');
      },
    });
  }
}
