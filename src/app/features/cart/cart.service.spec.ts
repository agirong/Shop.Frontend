import { TestBed } from '@angular/core/testing';
import { Product } from '../../core/models/product.model';
import { CartService } from './cart.service';

const STORAGE_KEY = 'eshop_cart';

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

function createService(): CartService {
  TestBed.configureTestingModule({});
  return TestBed.inject(CartService);
}

describe('CartService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('agrega un producto con cantidad 1', () => {
    const service = createService();
    service.add(makeProduct());

    expect(service.items().length).toBe(1);
    expect(service.items()[0].quantity).toBe(1);
  });

  it('incrementa la cantidad en lugar de duplicar la línea al agregar un producto repetido', () => {
    const service = createService();
    const product = makeProduct();

    service.add(product);
    service.add(product);

    expect(service.items().length).toBe(1);
    expect(service.items()[0].quantity).toBe(2);
  });

  it('incrementa la cantidad de un producto existente', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 7 }));

    service.increment(7);

    expect(service.items()[0].quantity).toBe(2);
  });

  it('disminuye la cantidad de un producto', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 7 }));
    service.increment(7);

    service.decrement(7);

    expect(service.items()[0].quantity).toBe(1);
  });

  it('elimina la línea cuando la cantidad llega a 0', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 7 }));

    service.decrement(7);

    expect(service.items().length).toBe(0);
  });

  it('elimina explícitamente una línea del carrito', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 1 }));
    service.add(makeProduct({ product_id: 2 }));

    service.remove(1);

    expect(service.items().length).toBe(1);
    expect(service.items()[0].product.product_id).toBe(2);
  });

  it('vacía el carrito con clear()', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 1 }));
    service.add(makeProduct({ product_id: 2 }));

    service.clear();

    expect(service.items().length).toBe(0);
    expect(service.totalItems()).toBe(0);
    expect(service.totalAmount()).toBe(0);
  });

  it('calcula totalItems como la suma de cantidades', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 1, price: 100 }));
    service.add(makeProduct({ product_id: 1, price: 100 }));
    service.add(makeProduct({ product_id: 2, price: 50 }));

    expect(service.totalItems()).toBe(3);
  });

  it('calcula totalAmount como la suma de precio por cantidad', () => {
    const service = createService();
    service.add(makeProduct({ product_id: 1, price: 100 }));
    service.add(makeProduct({ product_id: 1, price: 100 }));
    service.add(makeProduct({ product_id: 2, price: 50 }));

    expect(service.totalAmount()).toBe(250);
  });

  it('persiste el carrito en localStorage al modificarlo', async () => {
    const service = createService();
    service.add(makeProduct({ product_id: 1, price: 100 }));

    await TestBed.tick();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as { product: Product; quantity: number }[];
    expect(stored.length).toBe(1);
    expect(stored[0].product.product_id).toBe(1);
    expect(stored[0].quantity).toBe(1);
  });

  it('hidrata el carrito desde localStorage al iniciar', () => {
    const seeded = [{ product: makeProduct({ product_id: 42, price: 100 }), quantity: 3 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));

    const service = createService();

    expect(service.items().length).toBe(1);
    expect(service.items()[0].product.product_id).toBe(42);
    expect(service.totalItems()).toBe(3);
    expect(service.totalAmount()).toBe(300);
  });

  it('ignora datos corruptos en localStorage e inicia con un carrito vacío', () => {
    localStorage.setItem(STORAGE_KEY, 'no-es-json-valido');

    const service = createService();

    expect(service.items().length).toBe(0);
  });
});
