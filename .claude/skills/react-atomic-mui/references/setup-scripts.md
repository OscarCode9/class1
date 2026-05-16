# Setup Scripts

Scaffolding scripts to bootstrap a React atomic project in one command.

## Quick Start Generator

Save as `scripts/scaffold.sh` and run with `bash scaffold.sh my-app`:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-my-app}"

npm create vite@latest "$APP_NAME" -- --template react-ts
cd "$APP_NAME"

npm install react@^19.2.0 react-dom@^19.2.0
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install @reduxjs/toolkit react-redux react-router-dom

# Create directory structure
mkdir -p src/{atoms,molecules,organisms,templates,pages}
mkdir -p src/store/slices
mkdir -p src/{hooks,theme,types}

# Clean boilerplate
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg

# Create theme
cat > src/theme/theme.ts << 'THEME'
import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none' } },
    },
  },
});
THEME

# Create typed hooks
cat > src/hooks/useAppStore.ts << 'HOOKS'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
HOOKS

# Create store
cat > src/store/store.ts << 'STORE'
import { configureStore } from '@reduxjs/toolkit';
export const store = configureStore({ reducer: {} });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
STORE

# Create minimal App.tsx
cat > src/App.tsx << 'APP'
import { Routes, Route } from 'react-router-dom';
export const App = () => (
  <Routes>
    <Route path="/" element={<div>Hello world</div>} />
  </Routes>
);
APP

# Update main.tsx with providers
cat > src/main.tsx << 'MAIN'
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
MAIN

echo "Project '$APP_NAME' scaffolded successfully."
echo "Run: cd $APP_NAME && npm run dev"
```

## Vite Path Aliases

Add to `vite.config.ts` and `tsconfig.json` so imports use `@/` prefix:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

```json
// tsconfig.json (add to compilerOptions)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
