import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { setAuthToken } from '@/services/api';
import { authService } from '@/services/auth.service';
import { tokenStorage, userStorage } from '@/services/token.storage';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  bootstrapped: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
  bootstrapped: false,
  error: null,
};

async function persistSession(data: AuthResponse) {
  setAuthToken(data.accessToken);
  await tokenStorage.set(data.accessToken);
  await userStorage.set(data.user);
}

export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const data = await authService.login(payload);
      await persistSession(data);
      return data;
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Login failed',
      );
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const data = await authService.register(payload);
      await persistSession(data);
      return data;
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Register failed',
      );
    }
  },
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async () => {
    const token = await tokenStorage.get();
    const user = await userStorage.get();
    if (token && user) {
      setAuthToken(token);
      return { token, user };
    }
    setAuthToken(null);
    return null;
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await tokenStorage.clear();
  await userStorage.clear();
  setAuthToken(null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutLocal(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      setAuthToken(null);
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Register failed';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.status = 'succeeded';
        }
        state.bootstrapped = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.bootstrapped = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
        state.error = null;
      });
  },
});

export const { logoutLocal, clearAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;
