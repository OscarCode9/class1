# Task Manager Mobile

App Expo (SDK 57) del monorepo **class1**: gestor de tareas con arquitectura atomic, Redux Toolkit, Axios y design system *Warm Command*.

## Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Expo SDK 57 · React Native 0.86 · React 19 |
| Navegación | Expo Router (auth stack + bottom tabs) |
| Estado | Redux Toolkit |
| HTTP | Axios (`src/services/`) |
| Tokens | `expo-secure-store` |
| UI | Atomic design (`atoms` → `screens`) + hooks de lógica |

## Arranque

```bash
# Terminal 1 — API del monorepo
cd .. && bun run dev:api

# Terminal 2 — app móvil
cd mobile
cp .env.example .env   # ajusta EXPO_PUBLIC_API_URL
npm start
```

### `EXPO_PUBLIC_API_URL`

| Entorno | URL |
|---------|-----|
| iOS Simulator | `http://127.0.0.1:3000/api/v1` |
| Android Emulator | `http://10.0.2.2:3000/api/v1` |
| Teléfono físico (misma Wi‑Fi) | `http://<IP-LAN>:3000/api/v1` |
| API en Docker (host) | puerto **6060** en lugar de 3000 |

## Estructura

```
mobile/
├── app/                 # Rutas Expo Router
├── src/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── templates/
│   ├── screens/
│   ├── hooks/           # Lógica (sin JSX)
│   ├── services/        # Axios + SecureStore
│   ├── store/           # RTK slices
│   ├── types/
│   ├── constants/       # theme + env
│   └── utils/
```

## Pantallas

- **Auth:** Login / Registro (gradiente crema, card glass)
- **Tareas:** AppHeader · FilterPanel · ListHeader · TaskCards · bottom tabs
- **Etiquetas / Reportes:** snapshot de tareas cargadas
- **Perfil:** datos de sesión + logout + theme toggle

## Scripts

```bash
npm start
npm run ios
npm run android
npm run typecheck
```
