/**
 * Pruebas de accesibilidad con AXE (axe-core) para las páginas principales
 * de E-Shop (Req 8).
 *
 * Cada prueba renderiza un componente de página, ejecuta el análisis de
 * axe-core sobre el DOM resultante y espera cero violaciones. Si hay
 * violaciones, el mensaje del fallo incluye el detalle de cada una para
 * facilitar la corrección.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import axe, { AxeResults } from 'axe-core';
import type { Mock } from 'vitest';

import { Product } from './core/models/product.model';
import { Category } from './core/models/category.model';
import { ProductsService } from './features/catalog/products.service';
import { CatalogPage } from './features/catalog/catalog-page';
import { CartPage } from './features/cart/cart-page';
import { CartService } from './features/cart/cart.service';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { CheckoutPage } from './features/checkout/checkout-page';
import { OrderService } from './features/checkout/order.service';
import { AuthService } from './features/auth/auth.service';

/* ──────────────────── Helpers ──────────────────── */

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    name: 'Camiseta de algodón',
    description: 'Camiseta básica 100% algodón',
    price: 29.99,
    category_id: 1,
    ...overrides,
  };
}

function makeCategories(): Category[] {
  return [
    { category_id: 1, name: 'Ropa' },
    { category_id: 2, name: 'Accesorios' },
  ];
}

interface ProductsServiceMock {
  getAll: Mock<() => Observable<Product[]>>;
  getByCategory: Mock<(id: number) => Observable<Product[]>>;
  getCategories: Mock<() => Observable<Category[]>>;
}

function createProductsMock(): ProductsServiceMock {
  return {
    getAll: vi.fn(() =>
      of([
        makeProduct({ product_id: 1, name: 'Camiseta de algodón' }),
        makeProduct({ product_id: 2, name: 'Pantalón de mezclilla', price: 59.99 }),
      ]),
    ),
    getByCategory: vi.fn(() => of([])),
    getCategories: vi.fn(() => of(makeCategories())),
  };
}

/**
 * Ejecuta axe-core sobre el elemento nativo de un fixture Angular y devuelve
 * los resultados. Solo analiza reglas de nivel A y AA (WCAG 2.1).
 */
async function runAxe(element: HTMLElement): Promise<AxeResults> {
  return axe.run(element, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  });
}

/** Formatea las violaciones de AXE para un mensaje de error legible. */
function formatViolations(results: AxeResults): string {
  return results.violations
    .map((v) => `[${v.id}] ${v.help} (${v.impact})\n  ${v.helpUrl}`)
    .join('\n\n');
}

/* ──────────────────── Tests ──────────────────── */

describe('Accesibilidad (AXE) — Páginas principales', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('CatalogPage no tiene violaciones de accesibilidad', async () => {
    const mock = createProductsMock();
    TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [{ provide: ProductsService, useValue: mock }],
    });
    const fixture = TestBed.createComponent(CatalogPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });

  it('CartPage (con productos) no tiene violaciones de accesibilidad', async () => {
    TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(CartPage);
    const cart = TestBed.inject(CartService);
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta', price: 100 }));
    cart.add(makeProduct({ product_id: 2, name: 'Pantalón', price: 50 }));
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });

  it('CartPage (vacío) no tiene violaciones de accesibilidad', async () => {
    TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });

  it('LoginPage no tiene violaciones de accesibilidad', async () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });

  it('RegisterPage no tiene violaciones de accesibilidad', async () => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });

  it('CheckoutPage (con carrito) no tiene violaciones de accesibilidad', async () => {
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: { create: vi.fn(() => of({})) } },
      ],
    });
    const fixture = TestBed.createComponent(CheckoutPage);
    const cart = TestBed.inject(CartService);
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta', price: 100 }));
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, formatViolations(results)).toHaveLength(0);
  });
});
