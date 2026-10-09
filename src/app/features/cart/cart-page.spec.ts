import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { CartPage } from './cart-page';
import { CartService } from './cart.service';

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

function setup(): { fixture: ComponentFixture<CartPage>; cart: CartService; router: Router } {
  TestBed.configureTestingModule({
    imports: [CartPage],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(CartPage);
  const cart = TestBed.inject(CartService);
  const router = TestBed.inject(Router);
  return { fixture, cart, router };
}

describe('CartPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra el mensaje de carrito vacío cuando no hay líneas', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tu carrito está vacío');
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(0);
  });

  it('lista las líneas del carrito y muestra los totales', () => {
    const { fixture, cart } = setup();
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta', price: 100 }));
    cart.add(makeProduct({ product_id: 2, name: 'Pantalón', price: 50 }));
    cart.increment(1); // Camiseta → cantidad 2
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ul[aria-label="Productos en el carrito"] > li');
    expect(items.length).toBe(2);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total de artículos:');
    expect(text).toContain('3'); // 2 camisetas + 1 pantalón
    expect(text).toContain('$250.00'); // 100*2 + 50*1
  });

  it('aumenta la cantidad al pulsar el botón de aumentar', () => {
    const { fixture, cart } = setup();
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta' }));
    fixture.detectChanges();

    const incBtn = fixture.nativeElement.querySelector(
      '[aria-label="Aumentar cantidad de Camiseta"]',
    ) as HTMLButtonElement;
    expect(incBtn).not.toBeNull();
    incBtn.click();
    fixture.detectChanges();

    expect(cart.items()[0].quantity).toBe(2);
  });

  it('disminuye la cantidad y elimina la línea al llegar a 0', () => {
    const { fixture, cart } = setup();
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta' }));
    fixture.detectChanges();

    const decBtn = fixture.nativeElement.querySelector(
      '[aria-label="Disminuir cantidad de Camiseta"]',
    ) as HTMLButtonElement;
    decBtn.click();
    fixture.detectChanges();

    expect(cart.items().length).toBe(0);
  });

  it('elimina una línea al pulsar "Eliminar"', () => {
    const { fixture, cart } = setup();
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta' }));
    cart.add(makeProduct({ product_id: 2, name: 'Pantalón' }));
    fixture.detectChanges();

    const removeBtn = fixture.nativeElement.querySelector(
      '[aria-label="Eliminar Camiseta del carrito"]',
    ) as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();

    expect(cart.items().length).toBe(1);
    expect(cart.items()[0].product.product_id).toBe(2);
  });

  it('navega a /checkout al pulsar "Proceder al pago"', () => {
    const { fixture, cart, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cart.add(makeProduct({ product_id: 1, name: 'Camiseta' }));
    fixture.detectChanges();

    const checkoutBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.includes('Proceder al pago')) as HTMLButtonElement;
    expect(checkoutBtn).toBeTruthy();
    checkoutBtn.click();

    expect(navigate).toHaveBeenCalledWith(['/checkout']);
  });
});
