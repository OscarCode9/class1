---
name: react-atomic-mui
description: Build React frontends with atomic architecture, Vite, Redux Toolkit, and Material Design (MUI). Use this skill whenever the user asks for a React project setup, frontend with atomic design, Redux state management, MUI/Material UI styling, or a Vite-powered React app. Also use when they mention building a component library, dashboard, or enterprise frontend with React.
---

# React Atomic Architecture with MUI and Redux Toolkit

Production-ready React apps using Vite, atomic component design, global state with Redux Toolkit, and Material Design via MUI.

## When to Use This Skill

- Setting up a new React project with Vite
- Structuring components using atomic design (atoms → molecules → organisms → templates → pages)
- Adding global state management with Redux Toolkit
- Applying Material Design styles with MUI (v5+)
- Building dashboards, admin panels, or enterprise UIs

## React Version Policy

- Frontend projects created or updated with this skill must use React 19.x, not React 18 or older.
- When an explicit version is needed, use the latest stable React 19.x release from the official React docs/blog. At the time of this update, that is React 19.2 (released October 1, 2025).
- Prefer React 19 APIs when they simplify the code instead of recreating the same behavior manually.
- Do not introduce Server Components or Server Actions in a plain Vite SPA unless the project is using a framework/runtime that explicitly supports them.

### React 19 Features To Prefer

- Actions with async transitions for mutation flows with pending/error handling.
- `useActionState` for forms and submit state instead of ad hoc `isLoading` + `error` plumbing when the flow is action-driven.
- `<form action={fn}>`, `formAction`, and `useFormStatus` for form submissions and submit buttons.
- `useOptimistic` for optimistic UI updates during mutations.
- `use` for reading Suspense-compatible resources in render. Do not create uncached promises during render.
- `ref` as a prop in function components instead of adding new `forwardRef` wrappers.
- `<Context value={...}>` instead of `<Context.Provider>` for new providers.
- `useEffectEvent` (React 19.2) to keep Effects reactive while reading the latest props/state inside effect-driven event callbacks.
- `useDeferredValue(value, initialValue)` when an initial deferred value improves perceived responsiveness.
- Native document metadata (`<title>`, `<meta>`, `<link>`) and React DOM resource APIs (`preload`, `preinit`, `preconnect`, `prefetchDNS`) when SSR/framework support makes them useful.
- Custom Elements are fully supported in React 19, so integrate them directly instead of adding React-specific wrappers unless the design system truly needs one.

## Project Setup (Vite + Dependencies)

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install react@^19.2.0 react-dom@^19.2.0
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @reduxjs/toolkit react-redux react-router-dom
```

Remove boilerplate files (`src/App.css`, `src/index.css`) and clean `App.tsx` to a minimal shell.

## Directory Structure (Atomic)

```
src/
├── atoms/              # Smallest UI units (Button, Input, Typography, Icon)
│   └── Button/
│       ├── index.tsx
│       └── Button.styles.ts
├── molecules/          # Atom combos (SearchBar, FormField, CardHeader)
│   └── SearchBar/
│       ├── index.tsx
│       └── SearchBar.styles.ts
├── organisms/          # Complex sections (Header, Footer, ProductCard, LoginForm)
│   └── ProductCard/
│       ├── index.tsx
│       └── ProductCard.styles.ts
├── templates/          # Page layouts (MainLayout, DashboardLayout, AuthLayout)
│   └── MainLayout/
│       ├── index.tsx
│       └── MainLayout.styles.ts
├── pages/              # Route pages using templates + organisms
├── store/              # Redux Toolkit
│   ├── store.ts
│   └── slices/
├── hooks/              # Custom hooks (useAppDispatch, useAppSelector)
├── theme/              # MUI theme customization
├── types/              # TypeScript type definitions
├── App.tsx
└── main.tsx
```

### Component Rules

- **Atoms** are pure presentational — receive ALL data via props. No API calls, no Redux, no side effects.
- **Molecules** combine 2-3 atoms. May have local state (useState) for UI concerns (open/close, focus). Still no API calls or Redux.
- **Organisms** compose molecules + atoms into meaningful sections. They connect to Redux store and dispatch actions. They can also call custom hooks that fetch data.
- **Templates** are layout shells. They receive children via props and place them in grid/flex slots. Usually only one per page wraps the entire layout.
- **Pages** compose templates with organisms for each route. Pages are the only components that know about React Router.
- **Styles** for every component live in a co-located `.styles.ts` file (e.g., `Button/Button.styles.ts`). The component `.tsx` file must never contain `styled()` definitions, `sx` constants/objects, `sx={{}}` props, `style={{}}` props, or any CSS-in-JS blocks. **CERO estilos dentro de archivos `.tsx` — esta regla no es negociable.** All styling must be defined in the dedicated `.styles.ts` file using MUI's `styled()` or Emotion's `styled()`.

### Naming Convention

- Component file: always `index.tsx` inside the component folder
- Styles file: `ComponentName.styles.ts` (e.g., `Button.styles.ts`)
- Folder: PascalCase for component folders
- Export: named export for the component

```
# PascalCase folders
atoms/Button/index.tsx
molecules/SearchBar/index.tsx
organisms/ProductCard/index.tsx
templates/MainLayout/index.tsx
pages/HomePage/index.tsx
```

## Component Patterns

### Atom Example (Button)

Atoms wrap MUI components with project-specific defaults. Never add business logic.

```tsx
// atoms/Button/index.tsx
import { Button as MuiButton, ButtonProps } from '@mui/material';

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

export const Button = ({ loading, disabled, children, ...props }: AppButtonProps) => (
  <MuiButton
    variant="contained"
    disabled={disabled || loading}
    {...props}
  >
    {loading ? 'Loading...' : children}
  </MuiButton>
);
```

### Molecule Example (SearchBar)

Molecules compose atoms, manage their own local UI state only.

```tsx
// molecules/SearchBar/index.tsx
import { useState, useCallback } from 'react';
import { TextField } from '@mui/material';
import { Button } from '@/atoms/Button';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [value, setValue] = useState('');

  const handleSearch = useCallback(() => {
    onSearch(value.trim());
  }, [value, onSearch]);

  return (
    <TextField
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      InputProps={{
        endAdornment: <Button onClick={handleSearch}>Search</Button>,
      }}
    />
  );
};
```

### Organism Example (ProductList)

Organisms are where Redux and data fetching happen.

```tsx
// organisms/ProductList/index.tsx
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchProducts } from '@/store/slices/productsSlice';
import { ProductCard } from '@/organisms/ProductCard';
import { useEffect } from 'react';
import { Stack, Skeleton } from '@mui/material';

export const ProductList = () => {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.products);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchProducts());
  }, [dispatch, status]);

  if (status === 'loading') return <Skeleton variant="rectangular" height={400} />;

  return (
    <Stack spacing={2}>
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
    </Stack>
  );
};
```

### Template Example (MainLayout)

Templates are layout-only. They accept children and optionally render fixed organisms (Header, Sidebar).

```tsx
// templates/MainLayout/MainLayout.styles.ts
import { styled } from '@mui/material/styles';
import { Box, Container } from '@mui/material';

export const LayoutRoot = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
});

export const MainContent = styled(Container)(({ theme }) => ({
  flex: 1,
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));
```

```tsx
// templates/MainLayout/index.tsx
import { Header } from '@/organisms/Header';
import { ReactNode } from 'react';
import { LayoutRoot, MainContent } from './MainLayout.styles';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => (
  <LayoutRoot>
    <Header />
    <MainContent component="main">
      {children}
    </MainContent>
  </LayoutRoot>
);
```

### Page Example

Pages are the entry points for routes. They compose a template with organisms.

```tsx
// pages/HomePage/index.tsx
import { MainLayout } from '@/templates/MainLayout';
import { ProductList } from '@/organisms/ProductList';

export const HomePage = () => (
  <MainLayout>
    <ProductList />
  </MainLayout>
);
```

## Redux Toolkit Setup

### Store Configuration

```tsx
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { productsReducer } from './slices/productsSlice';
import { authReducer } from './slices/authSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Slice Pattern (with async thunk)

```tsx
// store/slices/productsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchProducts = createAsyncThunk('products/fetch', async () => {
  const res = await fetch('/api/products');
  return (await res.json()) as Product[];
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearProducts: (state) => {
      state.items = [];
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown error';
      });
  },
});

export const { clearProducts } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;
```

### Typed Hooks

Always create typed versions of `useDispatch` and `useSelector` — never use the raw hooks.

```tsx
// hooks/useAppStore.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Provider Wiring

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store/store';
import { theme } from './theme/theme';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
```

## Material UI Theme

```tsx
// theme/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
  },
});
```

## Routing (React Router)

Routes are defined in `App.tsx` and point to page components.

```tsx
// App.tsx
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
```

## Best Practices Checklist

1. **Functional components only** — no class components. Use hooks for all logic.
2. **Keep components simple** — if a component exceeds 150 lines, split it. Extract hooks for logic, separate files for types.
3. **One component per file** — no multi-component files outside barrel exports.
4. **Props drilling limit** — if props pass through more than 2 layers, use Redux or React Context for truly local-global state.
5. **Atomic boundaries** — atoms don't connect to Redux. Molecules don't call APIs. Organisms own the data layer.
6. **Typed hooks always** — never use raw `useDispatch`/`useSelector` from react-redux.
7. **Styles always in separate files** — never inline styles inside the component file. Keep all CSS/styled components in a co-located styles file (e.g., `Button/Button.styles.ts`). Zero `sx={{}}`, `style={{}}`, or `styled()` inside `.tsx` files — no exceptions.
8. **No index.ts barrel re-exports in atoms/molecules** — they cause circular dependency risks with atomic designs. Import directly from component file.
9. **Async thunks for all API calls** — never call `fetch`/`axios` directly inside components. Use `createAsyncThunk` and dispatch.
10. **Avoid premature abstraction** — if you only have one organism using a molecule, that molecule shouldn't exist. Extract upward when you have 2+ consumers.
11. **TypeScript everywhere** — every file must be `.ts` or `.tsx`. No plain `.js`/`.jsx`. All props, state, Redux slices, hooks, and API responses must be fully typed. No `any` without explicit justification.
12. **Styles outside the component file** — styles (including `styled()` components, `sx` constants, and `sx` object maps) must live in a co-located `.styles.ts` file, never inside the component `.tsx`. The component file only contains JSX, logic, and hooks. Zero inline styling allowed — no exceptions.

## Advanced Patterns

See these references for deeper patterns:

- [references/setup-scripts.md](references/setup-scripts.md) — One-command project scaffolding scripts
- [references/advanced-patterns.md](references/advanced-patterns.md) — State normalization, RTK Query, custom MUI theme tokens, protected routes, form handling with React Hook Form + Zod
