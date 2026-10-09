import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../shared/environment';
import { AuthService } from './auth.service';

const BASE_URL = environment.apiBaseUrl;

/**
 * Construye un JWT de prueba (firma ficticia) con el payload indicado.
 * Solo se decodifica el payload en el frontend, así que la firma es irrelevante.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  return `${header}.${body}.firma-de-prueba`;
}

function setup(): { service: AuthService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('inicia sin sesión: isAuthenticated es false y currentUser es null', () => {
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });

  it('guarda el access token y refleja el estado autenticado tras un login exitoso', () => {
    const { service, httpMock } = setup();
    const token = makeJwt({ sub: 42, email: 'cliente@eshop.test' });

    service.login({ email: 'cliente@eshop.test', password: 'secreta' }).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ access_token: token });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe(token);
    expect(service.currentUser()).toEqual({ userId: 42, email: 'cliente@eshop.test' });
  });

  it('limpia el estado tras un logout exitoso', () => {
    const { service, httpMock } = setup();
    const token = makeJwt({ sub: 7, email: 'adios@eshop.test' });

    service.login({ email: 'adios@eshop.test', password: 'secreta' }).subscribe();
    httpMock.expectOne(`${BASE_URL}/auth/login`).flush({ access_token: token });
    expect(service.isAuthenticated()).toBe(true);

    service.logout().subscribe();
    const req = httpMock.expectOne(`${BASE_URL}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ message: 'Sesión cerrada' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('actualiza el access token tras un refresh exitoso con withCredentials', () => {
    const { service, httpMock } = setup();
    const nuevoToken = makeJwt({ sub: 99, email: 'renovado@eshop.test' });

    service.refresh().subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ access_token: nuevoToken });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual({ userId: 99, email: 'renovado@eshop.test' });
  });

  it('isAuthenticated es true cuando hay token y false tras limpiar la sesión', () => {
    const { service, httpMock } = setup();
    const token = makeJwt({ sub: 1, email: 'estado@eshop.test' });

    expect(service.isAuthenticated()).toBe(false);

    service.login({ email: 'estado@eshop.test', password: 'x' }).subscribe();
    httpMock.expectOne(`${BASE_URL}/auth/login`).flush({ access_token: token });
    expect(service.isAuthenticated()).toBe(true);

    service.clearSession();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('currentUser sin email (token de refresh con solo sub) usa email vacío', () => {
    const { service, httpMock } = setup();
    const token = makeJwt({ sub: 55 });

    service.refresh().subscribe();
    httpMock.expectOne(`${BASE_URL}/auth/refresh`).flush({ access_token: token });

    expect(service.currentUser()).toEqual({ userId: 55, email: '' });
  });

  it('currentUser es null cuando el token está mal formado', () => {
    const { service, httpMock } = setup();

    service.login({ email: 'malo@eshop.test', password: 'x' }).subscribe();
    httpMock.expectOne(`${BASE_URL}/auth/login`).flush({ access_token: 'token-invalido' });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toBeNull();
  });

  it('envía register con withCredentials', () => {
    const { service, httpMock } = setup();

    service
      .register({
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana@eshop.test',
        password: 'secreta',
      })
      .subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ message: 'Cliente registrado exitosamente', customerId: 10 });
  });
});
