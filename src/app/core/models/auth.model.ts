export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

// Derivado del JWT (payload decodificado).
export interface AuthUser {
  userId: number;
  email: string;
}
