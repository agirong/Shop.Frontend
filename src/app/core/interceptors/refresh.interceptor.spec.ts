import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { environment } from '../../shared/environment';
import { authInterceptor } from './auth.interceptor';
import { refreshInterceptor } from './refresh.interceptor';

const BASE_URL = environment.apiBaseUrl;

/** Construye un JWT de prueba con el payload indicado (firma ficticia). */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.firma`;
}

interface Harness {
  http: HttpClient;
  httpMock: HttpTestingController;
  auth: AuthService;
  router: { navigate: ReturnType<typeof vi.fn> };
}

function setup(): Harness {
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor])),
      provideHttpClientTesting(),
      { provide: Router, useValue: router },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
    router,
  };
}

/** Autentica el servicio con un access token inicial (vía login simulado). */
function authenticate(h: Harness, token: string): void {
  h.auth.login({ email: 'u@eshop.test', password: 'x' }).subscribe();
  h.httpMock.expectOne(`${BASE_URL}/auth/login`).flush({ access_token: token });
}

describe('refreshInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('reintenta la petición original tras un refresh exitoso', () => {
    const h = setup();
    authenticate(h, makeJwt({ sub: 1 }));
    const nuevoToken = makeJwt({ sub: 1, email: 'nuevo@eshop.test' });

    let resultado: unknown;
    h.http.get(`${BASE_URL}/orders`).subscribe((r) => (resultado = r));

    // Primera petición → 401 por token expirado.
    const first = h.httpMock.expectOne(`${BASE_URL}/orders`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer ' + makeJwt({ sub: 1 }));
    first.flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });

    // El interceptor dispara un único refresh.
    const refresh = h.httpMock.expectOne(`${BASE_URL}/auth/refresh`);
    expect(refresh.request.method).toBe('POST');
    refresh.flush({ access_token: nuevoToken });

    // Reintento de la petición original con el nuevo token.
    const retry = h.httpMock.expectOne(`${BASE_URL}/orders`);
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${nuevoToken}`);
    expect(retry.request.headers.get('X-Refresh-Retried')).toBe('1');
    retry.flush({ ok: true });

    expect(resultado).toEqual({ ok: true });
    expect(h.router.navigate).not.toHaveBeenCalled();
  });

  it('un solo refresh() atiende varios 401 concurrentes (coalescing)', () => {
    const h = setup();
    authenticate(h, makeJwt({ sub: 2 }));
    const nuevoToken = makeJwt({ sub: 2 });

    const resultados: unknown[] = [];
    h.http.get(`${BASE_URL}/orders`).subscribe((r) => resultados.push(r));
    h.http.get(`${BASE_URL}/products`).subscribe((r) => resultados.push(r));
    h.http.get(`${BASE_URL}/categories`).subscribe((r) => resultados.push(r));

    // Las tres peticiones fallan con 401 de forma concurrente.
    for (const url of [`${BASE_URL}/orders`, `${BASE_URL}/products`, `${BASE_URL}/categories`]) {
      h.httpMock.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    }

    // Debe existir UNA sola petición de refresh para las tres.
    const refreshReqs = h.httpMock.match(`${BASE_URL}/auth/refresh`);
    expect(refreshReqs.length).toBe(1);
    refreshReqs[0].flush({ access_token: nuevoToken });

    // Las tres peticiones originales se reintentan.
    for (const url of [`${BASE_URL}/orders`, `${BASE_URL}/products`, `${BASE_URL}/categories`]) {
      const retry = h.httpMock.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${nuevoToken}`);
      retry.flush({ ok: url });
    }

    expect(resultados.length).toBe(3);
    expect(h.router.navigate).not.toHaveBeenCalled();
  });

  it('hace logout y redirige al login si el refresh falla', () => {
    const h = setup();
    authenticate(h, makeJwt({ sub: 3 }));
    expect(h.auth.isAuthenticated()).toBe(true);

    let errorCapturado: unknown;
    h.http.get(`${BASE_URL}/orders`).subscribe({
      error: (e) => (errorCapturado = e),
    });

    h.httpMock
      .expectOne(`${BASE_URL}/orders`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // El refresh también falla (p. ej. refresh token expirado).
    h.httpMock
      .expectOne(`${BASE_URL}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errorCapturado).toBeDefined();
    expect(h.auth.isAuthenticated()).toBe(false);
    expect(h.router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('no intenta refrescar cuando falla el propio endpoint de refresh (evita bucles)', () => {
    const h = setup();

    let errorCapturado: unknown;
    h.auth.refresh().subscribe({ error: (e) => (errorCapturado = e) });

    h.httpMock
      .expectOne(`${BASE_URL}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // No debe generarse una segunda llamada a /auth/refresh.
    h.httpMock.expectNone(`${BASE_URL}/auth/refresh`);
    expect(errorCapturado).toBeDefined();
  });
});

describe('authInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('adjunta el Bearer token a las peticiones al apiBaseUrl', () => {
    const h = setup();
    const token = makeJwt({ sub: 10 });
    authenticate(h, token);

    h.http.get(`${BASE_URL}/products`).subscribe();
    const req = h.httpMock.expectOne(`${BASE_URL}/products`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('no adjunta token a /auth/login, /auth/register ni /auth/refresh', () => {
    const h = setup();
    authenticate(h, makeJwt({ sub: 11 }));

    h.http.post(`${BASE_URL}/auth/login`, {}).subscribe();
    const login = h.httpMock.expectOne(`${BASE_URL}/auth/login`);
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({ access_token: makeJwt({ sub: 11 }) });

    h.http.post(`${BASE_URL}/auth/register`, {}).subscribe();
    const register = h.httpMock.expectOne(`${BASE_URL}/auth/register`);
    expect(register.request.headers.has('Authorization')).toBe(false);
    register.flush({});

    h.auth.refresh().subscribe();
    const refresh = h.httpMock.expectOne(`${BASE_URL}/auth/refresh`);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access_token: makeJwt({ sub: 11 }) });
  });

  it('no adjunta token cuando no hay sesión', () => {
    const h = setup();

    h.http.get(`${BASE_URL}/products`).subscribe();
    const req = h.httpMock.expectOne(`${BASE_URL}/products`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });
});
