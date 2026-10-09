import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { CatalogPage } from './catalog-page';
import { ProductsService } from './products.service';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    name: 'Camiseta',
    description: 'Camiseta de algodón',
    price: 100,
    category_id: 1,
    ...overrides,
  };
}

/**
 * Doble de prueba de `ProductsService`. Cada método es un `vi.fn()` que por
 * defecto devuelve observables vacíos/inmediatos; cada prueba configura el
 * comportamiento que necesita.
 */
interface ProductsServiceMock {
  getAll: Mock<() => Observable<Product[]>>;
  getByCategory: Mock<(categoryId: number) => Observable<Product[]>>;
  getCategories: Mock<() => Observable<Category[]>>;
}

function createMock(): ProductsServiceMock {
  return {
    getAll: vi.fn(() => of<Product[]>([])),
    getByCategory: vi.fn(() => of<Product[]>([])),
    // El CategoryFilter embebido consume getCategories() al construirse.
    getCategories: vi.fn(() => of<Category[]>([{ category_id: 1, name: 'Ropa' }])),
  };
}

function setup(mock: ProductsServiceMock): ComponentFixture<CatalogPage> {
  TestBed.configureTestingModule({
    imports: [CatalogPage],
    providers: [{ provide: ProductsService, useValue: mock }],
  });
  return TestBed.createComponent(CatalogPage);
}

describe('CatalogPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('muestra el spinner de carga mientras se obtienen los productos', async () => {
    const mock = createMock();
    // Observable que no emite: la carga queda en curso.
    mock.getAll.mockReturnValue(new Subject<Product[]>().asObservable());
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Cargando');
  });

  it('muestra la cuadrícula de productos cuando la carga tiene éxito', async () => {
    const mock = createMock();
    mock.getAll.mockReturnValue(
      of([makeProduct({ product_id: 1, name: 'Camiseta' }), makeProduct({ product_id: 2, name: 'Pantalón' })]),
    );
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-product-card');
    expect(cards.length).toBe(2);
  });

  it('muestra el mensaje "sin productos" cuando la lista está vacía', async () => {
    const mock = createMock();
    mock.getAll.mockReturnValue(of<Product[]>([]));
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No hay productos');
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(0);
  });

  it('muestra un mensaje de error con un botón "Reintentar" cuando la carga falla', async () => {
    const mock = createMock();
    mock.getAll.mockReturnValue(throwError(() => new Error('red caída')));
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('No se pudieron cargar');

    const retryBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.includes('Reintentar')) as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
  });

  it('reintenta la carga al pulsar "Reintentar" y muestra los productos tras un reintento exitoso', async () => {
    const mock = createMock();
    // Primera carga falla; el reintento tiene éxito.
    mock.getAll
      .mockReturnValueOnce(throwError(() => new Error('fallo')))
      .mockReturnValueOnce(of([makeProduct({ product_id: 9, name: 'Gorra' })]));
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    const retryBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.includes('Reintentar')) as HTMLButtonElement;
    retryBtn.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(mock.getAll).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);
  });

  it('usa getByCategory al seleccionar una categoría concreta', async () => {
    const mock = createMock();
    mock.getAll.mockReturnValue(of([makeProduct({ product_id: 1 })]));
    mock.getByCategory.mockReturnValue(of([makeProduct({ product_id: 5, category_id: 3 })]));
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();
    expect(mock.getAll).toHaveBeenCalledTimes(1);

    // Simula la selección de una categoría desde el filtro (modelo bidireccional).
    const filter = fixture.debugElement.query(By.css('app-category-filter'));
    filter.componentInstance.selectedCategory.set(3);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(mock.getByCategory).toHaveBeenCalledWith(3);
    const cards = fixture.nativeElement.querySelectorAll('app-product-card');
    expect(cards.length).toBe(1);
  });

  it('vuelve a getAll al seleccionar "Todas" (null)', async () => {
    const mock = createMock();
    mock.getAll.mockReturnValue(of([makeProduct({ product_id: 1 })]));
    mock.getByCategory.mockReturnValue(of([makeProduct({ product_id: 5, category_id: 3 })]));
    const fixture = setup(mock);

    await fixture.whenStable();
    fixture.detectChanges();

    const filter = fixture.debugElement.query(By.css('app-category-filter'));
    // Selecciona una categoría concreta...
    filter.componentInstance.selectedCategory.set(3);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mock.getByCategory).toHaveBeenCalledWith(3);

    // ...y luego vuelve a "Todas".
    filter.componentInstance.selectedCategory.set(null);
    await fixture.whenStable();
    fixture.detectChanges();

    // getAll: una vez en la carga inicial y otra al volver a "Todas".
    expect(mock.getAll).toHaveBeenCalledTimes(2);
  });
});
