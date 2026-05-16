# Sistema de Gestión de Tareas — Especificación Técnica

## 1. Propósito

Desarrollar un módulo de gestión de tareas (Task Manager) como parte del backend existente. El sistema permitirá crear, listar, actualizar, eliminar y organizar tareas, con soporte para estados, prioridades, etiquetas, filtros y autenticación de usuarios.

## 2. Modelo de Datos

### Task

| Campo | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` (UUID v4) | auto | — | Identificador único |
| `title` | `string` | sí | — | Título de la tarea (1-200 caracteres) |
| `description` | `string` | no | `""` | Descripción detallada |
| `status` | `enum` | sí | `"pending"` | Estado: `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `priority` | `enum` | sí | `"medium"` | Prioridad: `low` \| `medium` \| `high` \| `critical` |
| `tags` | `string[]` | no | `[]` | Etiquetas para categorización |
| `dueDate` | `string` (ISO 8601) | no | `null` | Fecha límite |
| `assigneeId` | `string` (UUID) | no | `null` | ID del usuario asignado |
| `createdAt` | `string` (ISO 8601) | auto | — | Fecha de creación |
| `updatedAt` | `string` (ISO 8601) | auto | — | Fecha de última modificación |

### User

| Campo | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` (UUID v4) | auto | — | Identificador único |
| `name` | `string` | sí | — | Nombre del usuario (1-100 caracteres) |
| `email` | `string` | sí | — | Email único del usuario |
| `passwordHash` | `string` | sí | — | Hash seguro de la contraseña, nunca exponerlo en respuestas |
| `createdAt` | `string` (ISO 8601) | auto | — | Fecha de creación |
| `updatedAt` | `string` (ISO 8601) | auto | — | Fecha de última modificación |

### JWT Payload

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sub` | `string` (UUID v4) | sí | ID del usuario autenticado |
| `email` | `string` | sí | Email del usuario |
| `iat` | `number` | auto | Fecha de emisión del token |
| `exp` | `number` | auto | Fecha de expiración del token |

## 3. Requerimientos Funcionales

### RF-01: Crear tarea
- `POST /api/v1/tasks`
- Crear una tarea con `title`, `description`, `priority`, `tags`, `dueDate`, `assigneeId`
- Validar que `title` no esté vacío y no exceda 200 caracteres
- Validar que `priority` sea uno de los valores permitidos
- Validar que `dueDate` sea una fecha futura si se proporciona
- Validar que `assigneeId` corresponda a un `User` existente (404 si no existe)
- Responder `201 Created` con la tarea creada
- Responder `400 Bad Request` si falla validación de campos
- Responder `404 Not Found` si `assigneeId` no existe

### RF-02: Listar tareas
- `GET /api/v1/tasks`
- Listar todas las tareas con paginación
- Responder `200 OK` con un array de tareas y metadatos de paginación

### RF-03: Obtener tarea por ID
- `GET /api/v1/tasks/:id`
- Responder `200 OK` con la tarea
- Responder `404 Not Found` si la tarea no existe

### RF-04: Actualizar tarea
- `PUT /api/v1/tasks/:id`
- Actualizar campos parciales: `title`, `description`, `status`, `priority`, `tags`, `dueDate`, `assigneeId`
- Validar los mismos criterios que en creación
- Transición de estados validada (ver RF-07)
- Responder `200 OK` con la tarea actualizada
- Responder `400 Bad Request` si la transición de estado no es válida
- Responder `404 Not Found` si la tarea no existe

### RF-05: Eliminar tarea
- `DELETE /api/v1/tasks/:id`
- Responder `200 OK` con `{ success: true }`
- Responder `404 Not Found` si la tarea no existe

### RF-06: Filtros y búsqueda
- `GET /api/v1/tasks?status=pending&priority=high&tag=urgent&assigneeId=<uuid>&search=texto`
- Filtrar por: `status`, `priority`, `tag`, `assigneeId`, `dueDateBefore`, `dueDateAfter`
- Búsqueda textual (`search`) sobre `title` y `description` (case-insensitive, coincidencia parcial)
- Múltiples filtros se combinan con AND

### RF-07: Validación de transición de estados
El cambio de `status` debe seguir este flujo permitido:

```
pending ───► in_progress ───► completed
   │                              │
   └──────► cancelled ◄───────────┘
```

- `pending` → `in_progress` ✓
- `pending` → `cancelled` ✓
- `in_progress` → `completed` ✓
- `in_progress` → `cancelled` ✓
- `completed` → `cancelled` ✓
- Cualquier otra transición: `400 INVALID_STATUS_TRANSITION`

### RF-08: Paginación
- `GET /api/v1/tasks?page=1&limit=20`
- `page`: número de página (default: 1, mínimo: 1)
- `limit`: elementos por página (default: 20, máximo: 100)
- Responder con metadatos:
  ```json
  {
    "success": true,
    "data": [ ... ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```

### RF-09: Ordenamiento
- `GET /api/v1/tasks?sortBy=createdAt&sortOrder=desc`
- Campos ordenables: `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`
- `sortOrder`: `asc` | `desc` (default: `desc`)
- Orden por prioridad: `critical` > `high` > `medium` > `low`

### RF-10: Registro de usuario
- `POST /api/v1/auth/register`
- Crear un usuario con `name`, `email`, `password`
- Validar que `name` no esté vacío y no exceda 100 caracteres
- Validar que `email` tenga formato válido y sea único
- Validar política de contraseña:
  - mínimo 8 caracteres
  - al menos 1 mayúscula
  - al menos 1 minúscula
  - al menos 1 número
  - al menos 1 símbolo
- Persistir únicamente `passwordHash`, nunca la contraseña en texto plano
- Responder `201 Created` con el usuario creado y un `accessToken`
- Responder `400 Bad Request` si falla validación
- Responder `409 Conflict` si el email ya existe

### RF-11: Login
- `POST /api/v1/auth/login`
- Autenticar con `email` y `password`
- Comparar contraseña contra `passwordHash`
- Responder `200 OK` con `accessToken` JWT y datos básicos del usuario
- Responder `401 Unauthorized` si las credenciales no son válidas

### RF-12: Autenticación con JWT
- Todos los endpoints `/api/v1/tasks` requieren `Authorization: Bearer <jwt>`
- El token debe incluir al menos `sub`, `email`, `iat`, `exp`
- Si el token falta, es inválido o expiró, responder `401 Unauthorized`
- `POST /api/v1/auth/register` y `POST /api/v1/auth/login` no requieren autenticación

## 4. Requerimientos No Funcionales

### RNF-01: Rendimiento
- Tiempo de respuesta < 200ms para operaciones CRUD simples (p95)
- Tiempo de respuesta < 500ms para listados con filtros y paginación (p95)
- Soportar al menos 100 peticiones concurrentes sin degradación

### RNF-02: Consistencia
- Las operaciones de escritura deben ser atómicas
- La paginación debe reflejar el estado consistente al momento de la consulta

### RNF-03: Formato de respuesta
- Toda respuesta debe usar el formato `ApiResponse<T>` existente:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "meta": { "timestamp": "2026-05-02T...", "version": "1" }
  }
  ```

### RNF-04: Códigos de error
| Código | Significado | HTTP Status |
|---|---|---|
| `VALIDATION_ERROR` | Campos inválidos | 400 |
| `INVALID_STATUS_TRANSITION` | Cambio de estado no permitido | 400 |
| `INVALID_CREDENTIALS` | Email o contraseña incorrectos | 401 |
| `UNAUTHORIZED` | Token faltante, inválido o expirado | 401 |
| `TASK_NOT_FOUND` | Tarea inexistente | 404 |
| `USER_NOT_FOUND` | Asignee inexistente | 404 |
| `EMAIL_EXISTS` | Ya existe un usuario con ese email | 409 |
| `INTERNAL_ERROR` | Error inesperado | 500 |

### RNF-05: Validación
- Validar tipos y formatos en el handler antes de llegar al modelo
- Usar un esquema de validación desacoplado (p.ej. funciones validator o Zod)
- Rechazar `dueDate` con formato inválido o fecha pasada

### RNF-06: Mantenibilidad
- Separar en capas: routes → controllers → services → models
- Los handlers de ruta no deben contener lógica de negocio
- Las funciones de validación deben ser unit-testables
- Seguir la estructura de carpetas existente (`src/routes/`, `src/models/`, `src/types/`, `src/middleware/`)

### RNF-07: Seguridad
- Validar y sanitizar todos los inputs
- Tamaño máximo de `title`: 200 caracteres
- Tamaño máximo de `description`: 2000 caracteres
- Máximo de 10 tags por tarea
- Cada tag debe tener entre 1 y 30 caracteres alfanuméricos
- Hashear contraseñas con un algoritmo seguro (`argon2id` recomendado; `bcrypt` como alternativa aceptable)
- Nunca devolver `passwordHash` en respuestas de la API
- Firmar JWT con una clave secreta robusta y mantenerla fuera del código fuente
- Definir expiración corta para `accessToken` (recomendado: 15 minutos)
- No incluir información sensible adicional dentro del JWT

### RNF-08: Cobertura de pruebas
- Tests unitarios para validación de transición de estados
- Tests unitarios para lógica de filtros
- Tests de integración para cada endpoint (éxito y error)
- Tests de integración para `register` y `login`
- Cobertura mínima del 80% en el módulo de tareas

## 5. Endpoints — Resumen

| Método | Ruta | RF |
|---|---|---|
| `POST` | `/api/v1/auth/register` | RF-10 |
| `POST` | `/api/v1/auth/login` | RF-11, RF-12 |
| `POST` | `/api/v1/tasks` | RF-01 |
| `GET` | `/api/v1/tasks` | RF-02, RF-06, RF-08, RF-09 |
| `GET` | `/api/v1/tasks/:id` | RF-03 |
| `PUT` | `/api/v1/tasks/:id` | RF-04, RF-07 |
| `DELETE` | `/api/v1/tasks/:id` | RF-05 |

## 6. Recomendaciones de Seguridad Adicionales

- Rate limiting para `register` y `login` por IP y por email
- Bloqueo temporal o backoff progresivo tras varios intentos fallidos
- Verificación de email antes de habilitar acceso completo
- Rotación e invalidación de tokens al cambiar contraseña
- Reglas de autorización para que un usuario no pueda leer o modificar tareas ajenas sin permiso
- Logs de auditoría para login, login fallido, cambio de contraseña y borrado de tareas
- Mensajes de error neutros en login para evitar enumeración de usuarios
- Si en el futuro usan cookies en vez de header Bearer: `HttpOnly`, `Secure`, `SameSite` y protección CSRF

## 7. Glosario

| Término | Definición |
|---|---|
| **Task** | Unidad de trabajo con título, descripción, estado y prioridad |
| **User** | Usuario autenticado del sistema |
| **Status** | Estado del ciclo de vida de una tarea |
| **Priority** | Nivel de urgencia asignado a una tarea |
| **Tag** | Etiqueta textual para agrupar tareas por categoría |
| **Assignee** | Usuario responsable de la tarea |
| **JWT** | JSON Web Token usado para autenticar requests |
