import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { RegisterPage } from './register-page';
import { AuthService } from './auth.service';

type RegisterResult = { message: string; customerId: number };

/** Doble de prueba de `AuthService` con solo lo que usa `RegisterPage`. */
interface AuthServiceMock {
  register: Mock<() => Observable<RegisterResult>>;
}

function createAuthMock(): AuthServiceMock {
  return {
    register: vi.fn(() => of<RegisterResult>({ message: 'ok', customerId: 1 })),
  };
}

function setup(auth: AuthServiceMock): { fixture: ComponentFixture<RegisterPage>; router: Router } {
  TestBed.configureTestingModule({
    imports: [RegisterPage],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const fixture = TestBed.createComponent(RegisterPage);
  const router = TestBed.inject(Router);
  return { fixture, router };
}

/** Rellena un input y dispara los eventos que sincronizan el modelo del formulario. */
function setInput(fixture: ComponentFixture<RegisterPage>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

/** Rellena el formulario completo con datos válidos. */
function fillValid(fixture: ComponentFixture<RegisterPage>): void {
  setInput(fixture, '#register-first-name', 'Ana');
  setInput(fixture, '#register-last-name', 'López');
  setInput(fixture, '#register-email', 'ana@eshop.test');
  setInput(fixture, '#register-password', 'contrasena8');
}

function submitForm(fixture: ComponentFixture<RegisterPage>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('RegisterPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('no registra y muestra mensajes de validación en español con campos vacíos', async () => {
    const auth = createAuthMock();
    const { fixture } = setup(auth);

    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.register).not.toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ingresa tu nombre.');
    expect(text).toContain('Ingresa tu apellido.');
    expect(text).toContain('Ingresa tu correo electrónico.');
    expect(text).toContain('Ingresa una contraseña.');
  });

  it('valida la longitud mínima de la contraseña', async () => {
    const auth = createAuthMock();
    const { fixture } = setup(auth);

    await fixture.whenStable();
    fixture.detectChanges();

    setInput(fixture, '#register-password', 'corta');
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('al menos 8 caracteres');
  });

  it('registra y redirige al login con registered=1 cuando los datos son válidos', async () => {
    const auth = createAuthMock();
    const { fixture, router } = setup(auth);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    fillValid(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.register).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'López',
      email: 'ana@eshop.test',
      password: 'contrasena8',
    });
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: '1' } });
  });

  it('muestra el mensaje de conflicto del backend en un 409 de email duplicado', async () => {
    const auth = createAuthMock();
    auth.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { message: 'El correo ya está registrado' },
          }),
      ),
    );
    const { fixture, router } = setup(auth);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await fixture.whenStable();
    fixture.detectChanges();

    fillValid(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('El correo ya está registrado');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra un mensaje genérico en español ante un error no esperado', async () => {
    const auth = createAuthMock();
    auth.register.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }),
      ),
    );
    const { fixture } = setup(auth);

    await fixture.whenStable();
    fixture.detectChanges();

    fillValid(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('No se pudo crear la cuenta');
  });
});
