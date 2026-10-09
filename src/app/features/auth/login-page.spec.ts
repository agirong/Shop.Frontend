import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { LoginResponse } from '../../core/models/auth.model';
import { LoginPage } from './login-page';
import { AuthService } from './auth.service';

/** Doble de prueba de `AuthService` con solo lo que usa `LoginPage`. */
interface AuthServiceMock {
  login: Mock<() => Observable<LoginResponse>>;
}

function createAuthMock(): AuthServiceMock {
  return {
    login: vi.fn(() => of<LoginResponse>({ access_token: 'token' })),
  };
}

/** `ActivatedRoute` stub con un `queryParamMap` fijo en el snapshot. */
function activatedRouteStub(params: Record<string, string>): Partial<ActivatedRoute> {
  return { snapshot: { queryParamMap: convertToParamMap(params) } } as Partial<ActivatedRoute>;
}

function setup(
  auth: AuthServiceMock,
  queryParams: Record<string, string> = {},
): { fixture: ComponentFixture<LoginPage>; router: Router } {
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: activatedRouteStub(queryParams) },
    ],
  });
  const fixture = TestBed.createComponent(LoginPage);
  const router = TestBed.inject(Router);
  return { fixture, router };
}

/** Rellena un input y dispara los eventos que sincronizan el modelo del formulario. */
function setInput(fixture: ComponentFixture<LoginPage>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

/** Envía el formulario de login. */
function submitForm(fixture: ComponentFixture<LoginPage>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('LoginPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('no llama a login y muestra errores en español cuando los campos están vacíos', async () => {
    const auth = createAuthMock();
    const { fixture } = setup(auth);

    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ingresa tu correo electrónico.');
    expect(text).toContain('Ingresa tu contraseña.');
  });

  it('valida el formato del correo electrónico', async () => {
    const auth = createAuthMock();
    const { fixture } = setup(auth);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#login-email', 'no-es-un-email');
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ingresa un correo electrónico válido.');
  });

  it('llama a login y redirige al returnUrl cuando las credenciales son válidas', async () => {
    const auth = createAuthMock();
    const { fixture, router } = setup(auth, { returnUrl: '/checkout' });
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#login-email', 'cliente@eshop.test');
    setInput(fixture, '#login-password', 'secreta');
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.login).toHaveBeenCalledWith({
      email: 'cliente@eshop.test',
      password: 'secreta',
    });
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });

  it('redirige al catálogo cuando no hay returnUrl', async () => {
    const auth = createAuthMock();
    const { fixture, router } = setup(auth);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#login-email', 'cliente@eshop.test');
    setInput(fixture, '#login-password', 'secreta');
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('ignora returnUrl externo y redirige al catálogo (evita redirección abierta)', async () => {
    const auth = createAuthMock();
    const { fixture, router } = setup(auth, { returnUrl: 'https://malicioso.test' });
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#login-email', 'cliente@eshop.test');
    setInput(fixture, '#login-password', 'secreta');
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('muestra un error genérico sin revelar el campo cuando las credenciales son inválidas', async () => {
    const auth = createAuthMock();
    auth.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const { fixture, router } = setup(auth);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#login-email', 'cliente@eshop.test');
    setInput(fixture, '#login-password', 'incorrecta');
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Correo o contraseña incorrectos');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra el aviso de cuenta creada cuando llega con registered=1', async () => {
    const auth = createAuthMock();
    const { fixture } = setup(auth, { registered: '1' });

    await fixture.whenStable();
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.textContent).toContain('Tu cuenta se creó correctamente');
  });
});
