import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../../core/models/auth.model';
import { environment } from '../../shared/environment';

/** Estructura del payload del JWT emitido por el backend. */
interface JwtPayload {
  sub: number;
  email?: string;
  exp?: number;
  iat?: number;
}

/** Respuesta del backend al cerrar sesión. */
interface LogoutResponse {
  message: string;
}

/**
 * Servicio de sesión y tokens (Req 4, 5, 6).
 *
 * Guarda el access token en memoria (signal). El refresh token vive en una
 * cookie httpOnly que el navegador adjunta automáticamente cuando las
 * peticiones se hacen con `withCredentials: true`, por lo que no es accesible
 * desde JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** Access token en memoria; `null` cuando no hay sesión. */
  private readonly _accessToken = signal<string | null>(null);

  /** Access token actual expuesto como solo lectura (lo usa el interceptor). */
  readonly accessToken = this._accessToken.asReadonly();

  /** `true` cuando existe un access token válido (Req 5.2). */
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  /** Usuario actual derivado de decodificar el JWT; `null` si no hay sesión. */
  readonly currentUser = computed<AuthUser | null>(() => {
    const token = this._accessToken();
    if (!token) {
      return null;
    }
    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }
    return { userId: payload.sub, email: payload.email ?? '' };
  });

  /**
   * Inicia sesión (Req 5.2). Envía credenciales a `/auth/login` con
   * `withCredentials: true` para recibir la cookie de refresh y guarda el
   * access token en memoria.
   */
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, req, { withCredentials: true })
      .pipe(tap((res) => this._accessToken.set(res.access_token)));
  }

  /** Registra una cuenta nueva (Req 4.2). */
  register(req: RegisterRequest): Observable<{ message: string; customerId: number }> {
    return this.http.post<{ message: string; customerId: number }>(
      `${this.baseUrl}/auth/register`,
      req,
      { withCredentials: true },
    );
  }

  /**
   * Renueva el access token usando la cookie httpOnly de refresh (Req 6.1,
   * 6.2). Actualiza el token en memoria al tener éxito.
   */
  refresh(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((res) => this._accessToken.set(res.access_token)));
  }

  /**
   * Cierra la sesión (Req 5.6). Llama a `/auth/logout` para invalidar el
   * refresh token en el backend y limpia el estado local.
   */
  logout(): Observable<LogoutResponse> {
    return this.http
      .post<LogoutResponse>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  /** Limpia el estado de sesión en memoria. */
  clearSession(): void {
    this._accessToken.set(null);
  }

  /**
   * Decodifica el payload de un JWT sin verificar la firma (la verificación la
   * hace el backend). Devuelve `null` si el token está mal formado.
   */
  private decodeToken(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(''),
      );
      const parsed: unknown = JSON.parse(json);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'sub' in parsed &&
        typeof (parsed as JwtPayload).sub === 'number'
      ) {
        return parsed as JwtPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
}
