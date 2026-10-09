// customerId NO se envía: el backend lo deriva del token (JWT).
export interface CreateOrderRequest {
  amount: number;
  shippingAddress: string;
}

export interface CreateOrderResponse {
  message: string;
  orderId: number;
}
