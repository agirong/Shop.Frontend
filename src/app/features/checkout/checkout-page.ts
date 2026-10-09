import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { CreateOrderResponse } from '../../core/models/order.model';
import { CartService } from '../cart/cart.service';
import { OrderService } from './order.service';

/**
 * Página de checkout protegida por `authGuard` (Req 7).
 *
 * Muestra el resumen del carrito (productos, cantidades, total) leído de
 * `CartService` y un formulario con `shippingAddress` construido con Signal
 * Forms. Al confirmar la orden llama a `OrderService.create()`; en éxito
 * muestra la confirmación y vacía el carrito (Req 7.4), en error muestra un
 * mensaje en español y conserva el carrito (Req 7.5).
 *
 * Si el carrito está vacío y no hay confirmación pendiente, indica al usuario
 * que no hay productos y ofrece volver al catálogo.
 */
@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, FormField, RouterLink],
  template: `
    <main class="mx-auto max-w-3xl px-4 py-6">
      <h1 class="mb-6 text-2xl font-bold text-gray-900">Confirmar compra</h1>

      <!-- Estado de confirmación exitosa (Req 7.4) -->
      @if (confirmation()) {
        <section
          class="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <svg
            class="h-12 w-12 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <h2 class="text-lg font-semibold text-green-800">¡Orden confirmada!</h2>
          <p class="text-sm text-green-700">
            {{ confirmation()!.message }} — Orden #{{ confirmation()!.orderId }}
          </p>
          <a
            routerLink="/"
            class="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Volver al catálogo
          </a>
        </section>
      } @else if (cart.items().length === 0) {
        <!-- Carrito vacío sin confirmación pendiente -->
        <section class="py-16 text-center" role="status" aria-live="polite">
          <p class="text-gray-600">Tu carrito está vacío. Agrega productos antes de continuar.</p>
          <a
            routerLink="/"
            class="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Ver catálogo
          </a>
        </section>
      } @else {
        <!-- Resumen del carrito (Req 7.2) -->
        <section aria-label="Resumen de tu pedido" class="mb-6">
          <h2 class="mb-3 text-lg font-semibold text-gray-900">Resumen del pedido</h2>

          <ul class="flex flex-col gap-2" aria-label="Productos en el pedido">
            @for (item of cart.items(); track item.product.product_id) {
              <li
                class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium text-gray-900">{{ item.product.name }}</p>
                  <p class="text-sm text-gray-600">
                    {{ item.product.price | currency: 'USD' : 'symbol' : '1.2-2' }} ×
                    {{ item.quantity }}
                  </p>
                </div>
                <p class="shrink-0 font-semibold text-gray-900">
                  {{ item.product.price * item.quantity | currency: 'USD' : 'symbol' : '1.2-2' }}
                </p>
              </li>
            }
          </ul>

          <div
            class="mt-3 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <p class="text-sm text-gray-700">
              Total de artículos: <span class="font-semibold">{{ cart.totalItems() }}</span>
            </p>
            <p class="text-lg font-bold text-gray-900">
              {{ cart.totalAmount() | currency: 'USD' : 'symbol' : '1.2-2' }}
            </p>
          </div>
        </section>

        <!-- Formulario de envío y confirmación -->
        <form class="flex flex-col gap-5" (submit)="onSubmit($event)" novalidate>
          @if (submitError()) {
            <p
              class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
              aria-live="assertive"
            >
              {{ submitError() }}
            </p>
          }

          <div class="flex flex-col gap-1">
            <label for="checkout-address" class="text-sm font-medium text-gray-700">
              Dirección de envío
            </label>
            <input
              id="checkout-address"
              type="text"
              autocomplete="street-address"
              [formField]="checkoutForm.shippingAddress"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              [attr.aria-invalid]="isInvalid(checkoutForm.shippingAddress)"
              aria-describedby="checkout-address-error"
            />
            @if (isInvalid(checkoutForm.shippingAddress)) {
              <p
                id="checkout-address-error"
                class="text-sm text-red-700"
                role="alert"
                aria-live="polite"
              >
                {{ firstError(checkoutForm.shippingAddress) }}
              </p>
            }
          </div>

          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="checkoutForm().submitting()"
          >
            {{ checkoutForm().submitting() ? 'Procesando…' : 'Confirmar orden' }}
          </button>
        </form>
      }
    </main>
  `,
})
export class CheckoutPage {
  protected readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  /** Modelo del formulario respaldado por un signal. */
  private readonly model = signal<{ shippingAddress: string }>({ shippingAddress: '' });

  /** Formulario con validación en español (Signal Forms). */
  protected readonly checkoutForm = form(this.model, (path) => {
    required(path.shippingAddress, { message: 'Ingresa una dirección de envío.' });
  });

  /** Mensaje de error de envío (fallo del backend), o `null`. */
  protected readonly submitError = signal<string | null>(null);

  /** Datos de la orden confirmada, o `null` si no se ha confirmado aún. */
  protected readonly confirmation = signal<CreateOrderResponse | null>(null);

  /** `true` si el campo tiene errores y ya fue tocado. */
  protected isInvalid(field: FieldTree<string>): boolean {
    const state = field();
    return state.invalid() && state.touched();
  }

  /** Primer mensaje de error del campo. */
  protected firstError(field: FieldTree<string>): string {
    return field().errors()[0]?.message ?? '';
  }

  /**
   * Envía la orden al backend (Req 7.4, 7.5). Si tiene éxito muestra la
   * confirmación y vacía el carrito; si falla muestra un mensaje en español y
   * conserva el carrito.
   */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitError.set(null);

    await submit(this.checkoutForm, async (f) => {
      const { shippingAddress } = f().value();
      try {
        const response = await this.createOrder(shippingAddress);
        this.confirmation.set(response);
        this.cart.clear();
        return undefined;
      } catch (err) {
        this.submitError.set(this.errorMessage(err));
        return undefined;
      }
    });
  }

  /** Adapta el observable de `OrderService.create()` a una promesa. */
  private createOrder(shippingAddress: string): Promise<CreateOrderResponse> {
    return new Promise<CreateOrderResponse>((resolve, reject) => {
      this.orderService
        .create({ amount: this.cart.totalAmount(), shippingAddress })
        .subscribe({
          next: (res) => resolve(res),
          error: (err: HttpErrorResponse) => reject(err),
        });
    });
  }

  /**
   * Deriva el mensaje de error a mostrar. Intenta extraer el mensaje del
   * backend; si no es posible, usa un mensaje genérico en español.
   */
  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body: unknown = err.error;
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = (body as { message: unknown }).message;
        if (typeof message === 'string' && message.trim() !== '') {
          return message;
        }
      }
    }
    return 'No se pudo crear la orden. Inténtalo de nuevo.';
  }
}
