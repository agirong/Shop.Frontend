import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from './cart.service';

/**
 * Página del carrito de compras (Req 3, 7.1).
 *
 * Lista las líneas del carrito (`CartItem`), permite ajustar cantidades
 * (aumentar/disminuir) y eliminar productos, y muestra el total de artículos y
 * el monto total (Req 3.3, 3.4, 3.5, 3.6). Cuando el carrito está vacío muestra
 * un mensaje. El botón "Proceder al pago" navega a `/checkout` (Req 7.1); el
 * `authGuard` de esa ruta decide si redirige al login conservando el carrito.
 *
 * Accesible (WCAG AA): HTML semántico, botones con `aria-label` que describen la
 * acción y el producto, foco visible y operación por teclado.
 */
@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-6">
      <h1 class="mb-6 text-2xl font-bold text-gray-900">Tu carrito</h1>

      @if (cart.items().length === 0) {
        <p class="py-16 text-center text-gray-600" role="status" aria-live="polite">
          Tu carrito está vacío.
        </p>
      } @else {
        <ul class="flex flex-col gap-3" aria-label="Productos en el carrito">
          @for (item of cart.items(); track item.product.product_id) {
            <li
              class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0">
                <h2 class="truncate text-lg font-semibold text-gray-900">
                  {{ item.product.name }}
                </h2>
                <p class="text-sm text-gray-600">
                  {{ item.product.price | currency: 'USD' : 'symbol' : '1.2-2' }} c/u
                </p>
              </div>

              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    [attr.aria-label]="'Disminuir cantidad de ' + item.product.name"
                    (click)="cart.decrement(item.product.product_id)"
                  >
                    −
                  </button>

                  <span
                    class="min-w-[2rem] text-center text-sm font-medium text-gray-900"
                    aria-live="polite"
                    [attr.aria-label]="'Cantidad de ' + item.product.name + ': ' + item.quantity"
                  >
                    {{ item.quantity }}
                  </span>

                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    [attr.aria-label]="'Aumentar cantidad de ' + item.product.name"
                    (click)="cart.increment(item.product.product_id)"
                  >
                    +
                  </button>
                </div>

                <p class="w-24 text-right text-sm font-semibold text-gray-900">
                  {{ item.product.price * item.quantity | currency: 'USD' : 'symbol' : '1.2-2' }}
                </p>

                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                  [attr.aria-label]="'Eliminar ' + item.product.name + ' del carrito'"
                  (click)="cart.remove(item.product.product_id)"
                >
                  Eliminar
                </button>
              </div>
            </li>
          }
        </ul>

        <section
          class="mt-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Resumen del carrito"
        >
          <div class="text-gray-900">
            <p class="text-sm">
              Total de artículos:
              <span class="font-semibold">{{ cart.totalItems() }}</span>
            </p>
            <p class="text-lg font-bold">
              Total:
              {{ cart.totalAmount() | currency: 'USD' : 'symbol' : '1.2-2' }}
            </p>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            (click)="checkout()"
          >
            Proceder al pago
          </button>
        </section>
      }
    </main>
  `,
})
export class CartPage {
  /** Servicio de estado del carrito. */
  protected readonly cart = inject(CartService);

  private readonly router = inject(Router);

  /** Navega al checkout; el `authGuard` protege la ruta y conserva el carrito (Req 7.1). */
  protected checkout(): void {
    void this.router.navigate(['/checkout']);
  }
}
