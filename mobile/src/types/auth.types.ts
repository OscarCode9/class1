export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export type RegisterField = keyof RegisterPayload;
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

export interface LoginPayload {
  email: string;
  password: string;
}

export type LoginField = keyof LoginPayload;
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: Record<string, unknown>;
}
