import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, email, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../core/models/auth.model';
import { AuthService } from './auth.service';

/**
 * Página de inicio de sesión (Req 5).
 *
 * Formulario de credenciales (email + contraseña) construido con Signal Forms:
 * el estado vive en un signal del modelo y la validación en español se declara
 * de forma esquemática (`required`, `email`). Los mensajes de validación se
 * anuncian a lectores de pantalla (`aria-live`) y los campos inválidos se
 * marcan con `aria-invalid`.
 *
 * Al enviar credenciales válidas llama a `AuthService.login()`. Si tiene éxito
 * redirige al flujo que el usuario intentaba completar, leído del query param
 * `returnUrl` (Req 5.4); por defecto vuelve al catálogo. Si las credenciales
 * son inválidas muestra un mensaje genérico en español, sin revelar qué campo
 * falló (Req 5.3).
 */
@Component({
  selector: 'app-login-page',
  imports: [FormField, RouterLink],
  template: `
    <main class="mx-auto max-w-md px-4 py-10">
      <h1 class="mb-6 text-2xl font-bold text-gray-900">Iniciar sesión</h1>

      <form class="flex flex-col gap-5" (submit)="onSubmit($event)" novalidate>
        @if (justRegistered()) {
          <p
            class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            role="status"
            aria-live="polite"
          >
            Tu cuenta se creó correctamente. Inicia sesión para continuar.
          </p>
        }

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
          <label for="login-email" class="text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autocomplete="email"
            [formField]="loginForm.email"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(loginForm.email)"
            aria-describedby="login-email-error"
          />
          @if (isInvalid(loginForm.email)) {
            <p id="login-email-error" class="text-sm text-red-700" role="alert" aria-live="polite">
              {{ firstError(loginForm.email) }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="login-password" class="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            autocomplete="current-password"
            [formField]="loginForm.password"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            [attr.aria-invalid]="isInvalid(loginForm.password)"
            aria-describedby="login-password-error"
          />
          @if (isInvalid(loginForm.password)) {
            <p
              id="login-password-error"
              class="text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {{ firstError(loginForm.password) }}
            </p>
          }
        </div>

        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          [disabled]="loginForm().submitting()"
        >
          {{ loginForm().submitting() ? 'Entrando…' : 'Iniciar sesión' }}
        </button>

        <p class="text-center text-sm text-gray-600">
          ¿No tienes cuenta?
          <a
            routerLink="/register"
            class="font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Crear una cuenta
          </a>
        </p>
      </form>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Modelo de credenciales respaldado por un signal (fuente de verdad de Signal Forms). */
  private readonly model = signal<LoginRequest>({ email: '', password: '' });

  /** Formulario de login con validación en español declarada por esquema (Req 5.1, 5.3). */
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Ingresa tu correo electrónico.' });
    email(path.email, { message: 'Ingresa un correo electrónico válido.' });
    required(path.password, { message: 'Ingresa tu contraseña.' });
  });

  /** Mensaje de error de envío (credenciales inválidas o fallo del servidor), o `null`. */
  protected readonly submitError = signal<string | null>(null);

  /** `true` cuando se llega al login tras registrarse (muestra el aviso de éxito, Req 4.5). */
  protected justRegistered(): boolean {
    return this.route.snapshot.queryParamMap.get('registered') === '1';
  }

  /** `true` si el campo tiene errores y ya fue tocado (evita marcar errores prematuros). */
  protected isInvalid(field: FieldTree<string>): boolean {
    const state = field();
    return state.invalid() && state.touched();
  }

  /** Primer mensaje de error del campo para mostrarlo al usuario. */
  protected firstError(field: FieldTree<string>): string {
    return field().errors()[0]?.message ?? '';
  }

  /** Envía el formulario: valida, llama a `login()` y redirige o muestra error (Req 5.2, 5.3, 5.4). */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitError.set(null);

    await submit(this.loginForm, async (f) => {
      const { email: userEmail, password } = f().value();
      try {
        await this.login({ email: userEmail, password });
        void this.router.navigateByUrl(this.returnUrl());
        return undefined;
      } catch {
        // Mensaje genérico: no se revela cuál campo falló (Req 5.3).
        this.submitError.set('Correo o contraseña incorrectos. Inténtalo de nuevo.');
        return undefined;
      }
    });
  }

  /** Adapta el observable de `login()` a una promesa para usarlo en `submit()`. */
  private login(req: LoginRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.auth.login(req).subscribe({
        next: () => resolve(),
        error: (err: HttpErrorResponse) => reject(err),
      });
    });
  }

  /** URL de retorno tras el login; por defecto el catálogo (Req 5.4). */
  private returnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    // Solo se aceptan rutas internas (que empiezan por "/") para evitar
    // redirecciones abiertas a sitios externos.
    return raw && raw.startsWith('/') ? raw : '/';
  }
}
