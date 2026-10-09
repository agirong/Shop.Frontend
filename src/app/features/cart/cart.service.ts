import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem } from '../../core/models/cart.model';
import { Product } from '../../core/models/product.model';

const STORAGE_KEY = 'eshop_cart';

/**
 * Servicio de estado del carrito de compras (Req 3).
 *
 * Mantiene las líneas del carrito con signals y las persiste en `localStorage`
 * para que sobrevivan la navegación entre páginas (Req 3.7).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  /** Estado interno de las líneas del carrito. */
  private readonly _items = signal<CartItem[]>(this.loadFromStorage());

  /** Líneas del carrito expuestas como solo lectura. */
  readonly items = this._items.asReadonly();

  /** Total de artículos (suma de cantidades). */
  readonly totalItems = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0),
  );

  /** Monto total del carrito (precio * cantidad). */
  readonly totalAmount = computed(() =>
    this._items().reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );

  constructor() {
    // Sincroniza el estado del carrito con localStorage ante cualquier cambio.
    effect(() => {
      this.saveToStorage(this._items());
    });
  }

  /**
   * Agrega un producto al carrito. Si ya existe, incrementa su cantidad en 1
   * en lugar de duplicar la línea (Req 3.1, 3.2).
   */
  add(product: Product): void {
    this._items.update((items) => {
      const existing = items.find((item) => item.product.product_id === product.product_id);
      if (existing) {
        return items.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  /** Incrementa en 1 la cantidad de un producto del carrito (Req 3.3). */
  increment(productId: number): void {
    this._items.update((items) =>
      items.map((item) =>
        item.product.product_id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  }

  /**
   * Disminuye en 1 la cantidad de un producto. Si llega a 0, elimina la línea
   * del carrito (Req 3.3, 3.4).
   */
  decrement(productId: number): void {
    this._items.update((items) =>
      items
        .map((item) =>
          item.product.product_id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  /** Elimina explícitamente una línea del carrito (Req 3.5). */
  remove(productId: number): void {
    this._items.update((items) =>
      items.filter((item) => item.product.product_id !== productId),
    );
  }

  /** Vacía el carrito por completo (p. ej. tras una compra exitosa). */
  clear(): void {
    this._items.set([]);
  }

  /** Hidrata el estado del carrito desde `localStorage` (Req 3.7). */
  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  /** Persiste el estado del carrito en `localStorage`. */
  private saveToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Silencioso: si localStorage no está disponible, el carrito sigue en memoria.
    }
  }
}
