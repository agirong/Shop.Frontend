import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { CartService } from './cart.service';
import { CartSummary } from './cart-summary';

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

function setup(): { fixture: ComponentFixture<CartSummary>; cart: CartService } {
  TestBed.configureTestingModule({
    imports: [CartSummary],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(CartSummary);
  const cart = TestBed.inject(CartService);
  return { fixture, cart };
}

describe('CartSummary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('muestra 0 artículos cuando el carrito está vacío', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('0');
    expect(link.getAttribute('aria-label')).toContain('0 artículos');
  });

  it('refleja el total de artículos del carrito', () => {
    const { fixture, cart } = setup();
    cart.add(makeProduct({ product_id: 1 }));
    cart.add(makeProduct({ product_id: 1 })); // incrementa a 2
    cart.add(makeProduct({ product_id: 2 }));
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('3');
    expect(link.getAttribute('aria-label')).toContain('3 artículos');
  });

  it('enlaza a la ruta del carrito', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/cart');
  });
});
