import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from './cart.service';

/**
 * Mini-resumen del carrito para el encabezado (Req 3.6).
 *
 * Muestra el total de artículos del carrito y enlaza a la página del carrito
 * (`/cart`). Es un enlace semántico (`<a routerLink>`) operable con teclado y
 * accesible: anuncia el conteo mediante texto descriptivo y `aria-label`.
 */
@Component({
  selector: 'app-cart-summary',
  imports: [RouterLink],
  template: `
    <a
      routerLink="/cart"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      [attr.aria-label]="'Carrito, ' + cart.totalItems() + ' artículos'"
    >
      <span aria-hidden="true">🛒</span>
      <span>Carrito</span>
      <span
        class="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white"
      >
        {{ cart.totalItems() }}
      </span>
    </a>
  `,
})
export class CartSummary {
  /** Servicio de estado del carrito (total de artículos). */
  protected readonly cart = inject(CartService);
}
