# Advanced Patterns

Deeper React patterns for atomic architecture with MUI and Redux Toolkit.

## Table of Contents

1. [RTK Query over createAsyncThunk](#rtk-query-over-createasyncthunk)
2. [State Normalization](#state-normalization)
3. [Custom MUI Theme Tokens](#custom-mui-theme-tokens)
4. [Protected Routes](#protected-routes)
5. [Form Handling (React Hook Form + Zod)](#form-handling)
6. [Code Splitting with Lazy Pages](#code-splitting)

---

## RTK Query over createAsyncThunk

For data fetching, RTK Query eliminates manual loading/error state management. Use it instead of `createAsyncThunk` when the primary purpose is fetching and caching server data.

```bash
npm install @reduxjs/toolkit  # already includes RTK Query
```

```tsx
// store/api/productsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface Product {
  id: string;
  name: string;
  price: number;
}

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => '/products',
      providesTags: ['Product'],
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    addProduct: builder.mutation<Product, Omit<Product, 'id'>>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const { useGetProductsQuery, useGetProductQuery, useAddProductMutation } = productsApi;
```

Register in store:

```tsx
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { productsApi } from './api/productsApi';

export const store = configureStore({
  reducer: {
    [productsApi.reducerPath]: productsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productsApi.middleware),
});
```

Usage in organism (no manual loading state, no dispatch, no useEffect):

```tsx
// organisms/ProductList/ProductList.tsx
import { useGetProductsQuery } from '@/store/api/productsApi';

export const ProductList = () => {
  const { data: products, isLoading, error } = useGetProductsQuery();

  if (isLoading) return <Skeleton variant="rectangular" height={400} />;
  if (error) return <Alert severity="error">Failed to load products</Alert>;

  return (
    <Stack spacing={2}>
      {products?.map((p) => <ProductCard key={p.id} product={p} />)}
    </Stack>
  );
};
```

---

## State Normalization

Avoid deeply nested state. Use `createEntityAdapter` for collections.

```tsx
// store/slices/productsSlice.ts
import { createSlice, createEntityAdapter, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  price: number;
}

const productsAdapter = createEntityAdapter<Product>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState({ status: 'idle' as const }),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      productsAdapter.setAll(state, action.payload);
    });
  },
});

// Export pre-built selectors
export const {
  selectAll: selectAllProducts,
  selectById: selectProductById,
  selectIds: selectProductIds,
} = productsAdapter.getSelectors<RootState>((state) => state.products);
```

---

## Custom MUI Theme Tokens

Extend MUI's theme with project-specific tokens via module augmentation.

```tsx
// theme/theme.ts
import { createTheme } from '@mui/material/styles';

// Extend the Palette interface
declare module '@mui/material/styles' {
  interface Palette {
    brand: Palette['primary'];
    surface: { card: string; hover: string };
  }
  interface PaletteOptions {
    brand?: PaletteOptions['primary'];
    surface?: { card: string; hover: string };
  }
}

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    brand: { main: '#6200ea' },
    surface: { card: '#ffffff', hover: '#fafafa' },
    background: { default: '#f5f5f5' },
  },
  spacing: 8, // 8px grid
  shape: { borderRadius: 8 },
});

// Access custom tokens in components:
// <Box sx={{ bgcolor: 'surface.card', '&:hover': { bgcolor: 'surface.hover' } }} />
```

---

## Protected Routes

Wrap routes that require authentication. Redirect to `/login` if not authenticated.

```tsx
// organisms/ProtectedRoute/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useAppStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAppSelector((s) => s.auth.token !== null);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

Usage in App:

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />
```

---

## Form Handling

Use React Hook Form for form state + Zod for schema validation. This pattern goes in organisms since forms are data-connected.

```bash
npm install react-hook-form zod @hookform/resolvers
```

```tsx
// organisms/LoginForm/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Stack, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { loginUser } from '@/store/slices/authSlice';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const dispatch = useAppDispatch();
  const { error, status } = useAppSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginFormData) => {
    dispatch(loginUser(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Email"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button type="submit" loading={status === 'loading'}>
          Sign In
        </Button>
      </Stack>
    </form>
  );
};
```

---

## Code Splitting with Lazy Pages

Lazy-load routes for smaller initial bundles. This is a page-level concern.

```tsx
// App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

const HomePage = lazy(() => import('@/pages/HomePage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
    <CircularProgress />
  </Box>
);

export const App = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  </Suspense>
);
```
