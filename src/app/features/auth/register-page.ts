import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  email,
  form,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../core/models/auth.model';
import { AuthService } from './auth.service';

/** Longitud mínima de la contraseña exigida en el registro. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Página de registro de cuenta (Req 4).
 *
 * Formulario con nombre, apellido, email y contraseña construido con Signal
 * Forms. La validación en español se declara por esquema (`required`, `email`,
 * `minLength`) y se anuncia a lectores de pantalla (`aria-live`), marcando los
 * campos inválidos con `aria-invalid` (Req 4.3, 8.3).
 *
 * Al enviar datos válidos llama a `AuthService.register()`. Si el backend
 * responde 409 (email ya registrado) muestra el mensaje de conflicto devuelto
 * por el backend (Req 4.4). Si el registro tiene éxito redirige al login con un
 * aviso de cuenta creada para que el usuario inicie sesión (Req 4.5).
 */
@Component({
  selector: 'app-register-page',
  imports: [FormField, RouterLink],
  template: `
    <main class="mx-auto max-w-md px-4 py-10">
      <h1 class="mb-6 text-2xl font-bold text-gray-900">Crear una cuenta</h1>

      <form class="flex flex-col gap-5" (submit)="onSubmit($event)" novalidate>
        @if (submitError()) {
          <p
            class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            role="alert"
            aria-live="assertive"
          >
            {{ submitError() }}
          </p>
        }

        <div class="flex flex-col gap-1">
          <label for="register-first-name" class="text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="register-first-name"
            type="text"
            autocomplete="given-name"
            [formField]="registerForm.firstName"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(registerForm.firstName)"
            aria-describedby="register-first-name-error"
          />
          @if (isInvalid(registerForm.firstName)) {
            <p
              id="register-first-name-error"
              class="text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {{ firstError(registerForm.firstName) }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="register-last-name" class="text-sm font-medium text-gray-700">
            Apellido
          </label>
          <input
            id="register-last-name"
            type="text"
            autocomplete="family-name"
            [formField]="registerForm.lastName"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(registerForm.lastName)"
            aria-describedby="register-last-name-error"
          />
          @if (isInvalid(registerForm.lastName)) {
            <p
              id="register-last-name-error"
              class="text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {{ firstError(registerForm.lastName) }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="register-email" class="text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="register-email"
            type="email"
            autocomplete="email"
            [formField]="registerForm.email"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(registerForm.email)"
            aria-describedby="register-email-error"
          />
          @if (isInvalid(registerForm.email)) {
            <p
              id="register-email-error"
              class="text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {{ firstError(registerForm.email) }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="register-password" class="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="register-password"
            type="password"
            autocomplete="new-password"
            [formField]="registerForm.password"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(registerForm.password)"
            aria-describedby="register-password-error register-password-hint"
          />
          <p id="register-password-hint" class="text-xs text-gray-500">
            Mínimo {{ minPasswordLength }} caracteres.
          </p>
          @if (isInvalid(registerForm.password)) {
            <p
              id="register-password-error"
              class="text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {{ firstError(registerForm.password) }}
            </p>
          }
        </div>

        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          [disabled]="registerForm().submitting()"
        >
          {{ registerForm().submitting() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>

        <p class="text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?
          <a
            routerLink="/login"
            class="font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Iniciar sesión
          </a>
        </p>
      </form>
    </main>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Longitud mínima de contraseña expuesta a la plantilla. */
  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  /** Modelo del registro respaldado por un signal (fuente de verdad de Signal Forms). */
  private readonly model = signal<RegisterRequest>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  /** Formulario de registro con validación en español declarada por esquema (Req 4.1, 4.3). */
  protected readonly registerForm = form(this.model, (path) => {
    required(path.firstName, { message: 'Ingresa tu nombre.' });
    required(path.lastName, { message: 'Ingresa tu apellido.' });
    required(path.email, { message: 'Ingresa tu correo electrónico.' });
    email(path.email, { message: 'Ingresa un correo electrónico válido.' });
    required(path.password, { message: 'Ingresa una contraseña.' });
    minLength(path.password, MIN_PASSWORD_LENGTH, {
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  });

  /** Mensaje de error de envío (conflicto de email o fallo del servidor), o `null`. */
  protected readonly submitError = signal<string | null>(null);

  /** `true` si el campo tiene errores y ya fue tocado (evita marcar errores prematuros). */
  protected isInvalid(field: FieldTree<string>): boolean {
    const state = field();
    return state.invalid() && state.touched();
  }

  /** Primer mensaje de error del campo para mostrarlo al usuario. */
  protected firstError(field: FieldTree<string>): string {
    return field().errors()[0]?.message ?? '';
  }

  /** Envía el formulario: valida, llama a `register()` y redirige o muestra error (Req 4.2, 4.4, 4.5). */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitError.set(null);

    await submit(this.registerForm, async (f) => {
      try {
        await this.register(f().value());
        // Éxito: redirige al login con aviso de cuenta creada (Req 4.5).
        void this.router.navigate(['/login'], { queryParams: { registered: '1' } });
        return undefined;
      } catch (err) {
        this.submitError.set(this.errorMessage(err));
        return undefined;
      }
    });
  }

  /** Adapta el observable de `register()` a una promesa para usarlo en `submit()`. */
  private register(req: RegisterRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.auth.register(req).subscribe({
        next: () => resolve(),
        error: (err: HttpErrorResponse) => reject(err),
      });
    });
  }

  /**
   * Deriva el mensaje a mostrar según el error. En 409 (email ya registrado)
   * usa el mensaje de conflicto devuelto por el backend (Req 4.4); para otros
   * fallos muestra un mensaje genérico en español.
   */
  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const backendMessage = this.extractBackendMessage(err);
      return backendMessage ?? 'Este correo ya está registrado.';
    }
    return 'No se pudo crear la cuenta. Inténtalo de nuevo.';
  }

  /** Extrae el mensaje de error del cuerpo de la respuesta del backend, si existe. */
  private extractBackendMessage(err: HttpErrorResponse): string | null {
    const body: unknown = err.error;
    if (typeof body === 'string' && body.trim() !== '') {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string' && message.trim() !== '') {
        return message;
      }
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return message[0];
      }
    }
    return null;
  }
}
