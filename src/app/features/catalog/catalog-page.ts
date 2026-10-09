import { Component, effect, inject, signal } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CategoryFilter } from './category-filter';
import { ProductCard } from './product-card';
import { ProductsService } from './products.service';

/**
 * Página de catálogo (Req 1, 2).
 *
 * Carga los productos del backend y los presenta en una cuadrícula de
 * `ProductCard`. Gestiona cuatro estados visibles: cargando (spinner), error
 * (mensaje + botón "Reintentar"), vacío (mensaje "sin productos") y la lista de
 * productos. Incluye un `CategoryFilter` bidireccional: al elegir una categoría
 * concreta usa `ProductsService.getByCategory()`, y "Todas" (`null`) vuelve a
 * `ProductsService.getAll()`.
 *
 * Estado reactivo con signals (`products`, `loading`, `error`,
 * `selectedCategory`). Accesible (WCAG AA): HTML semántico, foco visible,
 * `aria-busy`/`aria-live` en las regiones de carga y error.
 */
@Component({
  selector: 'app-catalog-page',
  imports: [ProductCard, CategoryFilter],
  template: `
    <main class="mx-auto max-w-6xl px-4 py-6">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Catálogo de productos</h1>

        <app-category-filter [(selectedCategory)]="selectedCategory" />
      </header>

      @if (loading()) {
        <div
          class="flex items-center justify-center gap-3 py-16 text-gray-600"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span
            class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
            aria-hidden="true"
          ></span>
          <span>Cargando productos…</span>
        </div>
      } @else if (error()) {
        <div
          class="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
          aria-live="assertive"
        >
          <p>{{ error() }}</p>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            (click)="retry()"
          >
            Reintentar
          </button>
        </div>
      } @else if (products().length === 0) {
        <p class="py-16 text-center text-gray-600" role="status" aria-live="polite">
          No hay productos disponibles por el momento.
        </p>
      } @else {
        <ul
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Lista de productos"
        >
          @for (product of products(); track product.product_id) {
            <li>
              <app-product-card [product]="product" />
            </li>
          }
        </ul>
      }
    </main>
  `,
})
export class CatalogPage {
  private readonly productsService = inject(ProductsService);

  /** Productos actualmente mostrados en la cuadrícula. */
  protected readonly products = signal<Product[]>([]);

  /** Indica si hay una carga en curso (muestra el spinner). */
  protected readonly loading = signal(false);

  /** Mensaje de error de la última carga fallida, o `null` si no hubo error. */
  protected readonly error = signal<string | null>(null);

  /** Categoría seleccionada (id) o `null` para "Todas". Bidireccional con el filtro. */
  protected readonly selectedCategory = signal<number | null>(null);

  constructor() {
    // Carga inicial y recarga automática ante cualquier cambio de categoría
    // (desde el filtro mediante `[(selectedCategory)]`). El `effect` lee
    // `selectedCategory()` como dependencia y vuelve a cargar la lista usando
    // `getByCategory()` o `getAll()` según corresponda (Req 1, 2).
    effect(() => {
      this.selectedCategory();
      this.load();
    });
  }

  /** Reintenta la carga tras un error (Req 1). */
  protected retry(): void {
    this.load();
  }

  /**
   * Carga los productos según la categoría seleccionada y actualiza los estados
   * de carga/error. "Todas" (`null`) usa `getAll()`; una categoría concreta usa
   * `getByCategory(id)`.
   */
  private load(): void {
    const category = this.selectedCategory();
    this.loading.set(true);
    this.error.set(null);

    const source$ =
      category === null
        ? this.productsService.getAll()
        : this.productsService.getByCategory(category);

    source$.subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.error.set('No se pudieron cargar los productos. Inténtalo de nuevo.');
        this.loading.set(false);
      },
    });
  }
}
