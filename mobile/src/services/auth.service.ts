import { api } from '@/services/api';
import type {
  ApiResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from '@/types/auth.types';

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'No se pudo iniciar sesión.');
    }
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'No se pudo completar el registro.');
    }
    return data.data;
  },
};
