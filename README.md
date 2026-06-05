# class1

## Backend

Instala dependencias del backend:

```bash
bun install
```

Levanta el API local:

```bash
bun run dev:api
```

## Frontend de registro

Instala dependencias del frontend:

```bash
cd frontend
bun install
```

En otra terminal, corre la UI:

```bash
bun run dev:web
```

La app de Vite usa un proxy local para enviar `POST /api/v1/auth/register` al backend en `http://127.0.0.1:3000`.
