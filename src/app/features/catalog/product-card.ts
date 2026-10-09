import { CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CartService } from '../cart/cart.service';

/**
 * Tarjeta de producto del catálogo (Req 1.2, 3.1, 8.2).
 *
 * Muestra el nombre, precio y descripción del producto y ofrece un botón
 * "Agregar al carrito" operable con teclado (elemento `<button>` semántico con
 * foco visible) que delega en `CartService.add()`.
 */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  template: `
    <article
      class="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h3 class="text-lg font-semibold text-gray-900">{{ product().name }}</h3>

      <p class="mt-1 text-xl font-bold text-gray-900">
        {{ product().price | currency: 'USD' : 'symbol' : '1.2-2' }}
      </p>

      <p class="mt-2 flex-1 text-sm text-gray-600">{{ product().description }}</p>

      <button
        type="button"
        class="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        [attr.aria-label]="'Agregar ' + product().name + ' al carrito'"
        (click)="addToCart()"
      >
        Agregar al carrito
      </button>
    </article>
  `,
})
export class ProductCard {
  /** Producto que representa la tarjeta. */
  readonly product = input.required<Product>();

  private readonly cart = inject(CartService);

  /** Agrega el producto actual al carrito (Req 3.1). */
  protected addToCart(): void {
    this.cart.add(this.product());
  }
}
