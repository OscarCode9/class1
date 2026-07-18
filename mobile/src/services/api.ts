import axios from 'axios';
import { ENV } from '@/constants/env';
import { tokenStorage } from '@/services/token.storage';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const getAuthToken = () => authToken;

type LogoutHandler = () => void;
let onUnauthorized: LogoutHandler | null = null;

export const registerUnauthorizedHandler = (handler: LogoutHandler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.clear();
      setAuthToken(null);
      onUnauthorized?.();
    }

    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      'Network error';

    return Promise.reject(new Error(message));
  },
);
