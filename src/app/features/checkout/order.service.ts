import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateOrderRequest,
  CreateOrderResponse,
} from '../../core/models/order.model';
import { environment } from '../../shared/environment';

/**
 * Servicio de creación de órdenes (Req 7.4, 7.5).
 *
 * Envía la orden al endpoint protegido `POST /orders`. El `authInterceptor`
 * adjunta el `Bearer token`; el `customerId` lo deriva el backend del JWT,
 * por lo que el body solo incluye `amount` y `shippingAddress`.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * Crea una orden en el backend.
   *
   * @param req - Monto total y dirección de envío.
   * @returns Observable con el mensaje de confirmación y el id de la orden.
   */
  create(req: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.baseUrl}/orders`, req);
  }
}
