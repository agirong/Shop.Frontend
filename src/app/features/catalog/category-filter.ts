import { Component, inject, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Category } from '../../core/models/category.model';
import { ProductsService } from './products.service';

/**
 * Filtro de categorías del catálogo (Req 2).
 *
 * Presenta un `<select>` accesible con las categorías obtenidas de
 * `ProductsService.getCategories()` más una opción "Todas". La selección se
 * expone mediante un `model()` bidireccional (`selectedCategory`): el id de la
 * categoría elegida, o `null` para "Todas".
 *
 * Este componente solo presenta las opciones y emite la selección; la página
 * de catálogo reacciona al cambio (usa `getByCategory()` para una categoría
 * concreta y `getAll()` cuando se elige "Todas").
 */
@Component({
  selector: 'app-category-filter',
  template: `
    <div class="flex flex-col gap-1">
      <label for="category-filter" class="text-sm font-medium text-gray-700">
        Filtrar por categoría
      </label>

      <select
        id="category-filter"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        [value]="selectValue()"
        (change)="onChange($event)"
      >
        <option value="">Todas</option>
        @for (category of categories(); track category.category_id) {
          <option [value]="category.category_id">{{ category.name }}</option>
        }
      </select>
    </div>
  `,
})
export class CategoryFilter {
  /**
   * Categoría seleccionada (id) o `null` para "Todas". Bidireccional con
   * `[(selectedCategory)]`.
   */
  readonly selectedCategory = model<number | null>(null);

  private readonly productsService = inject(ProductsService);

  /** Categorías disponibles, obtenidas del backend. */
  protected readonly categories = toSignal(this.productsService.getCategories(), {
    initialValue: [] as Category[],
  });

  /** Valor del `<select>`: cadena vacía para "Todas" o el id como texto. */
  protected selectValue(): string {
    const current = this.selectedCategory();
    return current === null ? '' : String(current);
  }

  /** Actualiza el modelo según la opción elegida (Req 2). */
  protected onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(value === '' ? null : Number(value));
  }
}
