export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  phone_number?: string;
  date_joined?: string;
  store_name?: string;
  store_description?: string;
  store_logo?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: User; // Django SimpleJWT might not return user by default, we might need a separate call or custom token claims
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role: UserRole;
}
