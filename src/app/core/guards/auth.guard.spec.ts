import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { authGuard } from './auth.guard';

/** Snapshot de ruta vacío; el guard no lo usa. */
const route = {} as ActivatedRouteSnapshot;

/** Construye un `RouterStateSnapshot` con la URL indicada. */
function stateFor(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

interface Harness {
  auth: AuthService;
  router: Router;
}

function setup(): Harness {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    auth: TestBed.inject(AuthService),
    router: TestBed.inject(Router),
  };
}

/** Ejecuta el guard dentro del contexto de inyección de Angular. */
function runGuard(state: RouterStateSnapshot): boolean | UrlTree {
  return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
}

describe('authGuard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('permite el acceso cuando el usuario está autenticado', () => {
    const { auth } = setup();
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);

    const result = runGuard(stateFor('/checkout'));

    expect(result).toBe(true);
  });

  it('redirige al login con returnUrl cuando no está autenticado', () => {
    const { auth, router } = setup();
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);

    const result = runGuard(stateFor('/checkout'));

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    // La redirección apunta a /login.
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual(['login']);
    // Y conserva la URL intentada en el parámetro returnUrl (Req 7.1).
    expect(tree.queryParams['returnUrl']).toBe('/checkout');
  });

  it('conserva la URL completa (con query) en returnUrl', () => {
    const { auth } = setup();
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);

    const result = runGuard(stateFor('/checkout?step=2'));

    const tree = result as UrlTree;
    expect(tree.queryParams['returnUrl']).toBe('/checkout?step=2');
  });
});
