import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export const userStorage = {
  get: async () => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        id: string;
        name: string;
        email: string;
        createdAt: string;
        updatedAt: string;
      };
    } catch {
      return null;
    }
  },
  set: (user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  }) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  clear: () => SecureStore.deleteItemAsync(USER_KEY),
};
