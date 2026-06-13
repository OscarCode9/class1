import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TasksResponse,
} from "../types/tasks";
import type { ApiResponse } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class TaskRequestError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function listTasks(
  token: string,
  params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    tag?: string;
    assigneeId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {},
): Promise<TasksResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, String(val));
    }
  });

  const url = `${API_BASE_URL}/v1/tasks?${query.toString()}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new TaskRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local. Levanta el API.",
    );
  }

  const body = await response.json() as TasksResponse;

  if (!response.ok || !body.success) {
    const errorBody = body as unknown as ApiResponse<never>;
    throw new TaskRequestError(
      errorBody.error?.code ?? "REQUEST_FAILED",
      errorBody.error?.message ?? "Error al obtener las tareas.",
      errorBody.error?.details,
    );
  }

  return body;
}

export async function getTask(token: string, id: string): Promise<Task> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/v1/tasks/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new TaskRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local.",
    );
  }

  const body = await response.json() as ApiResponse<Task>;

  if (!response.ok || !body.success || !body.data) {
    throw new TaskRequestError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Error al obtener la tarea.",
      body.error?.details,
    );
  }

  return body.data;
}

export async function createTask(
  token: string,
  payload: CreateTaskPayload,
): Promise<Task> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/v1/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new TaskRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local.",
    );
  }

  const body = await response.json() as ApiResponse<Task>;

  if (!response.ok || !body.success || !body.data) {
    throw new TaskRequestError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Error al crear la tarea.",
      body.error?.details,
    );
  }

  return body.data;
}

export async function updateTask(
  token: string,
  id: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/v1/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new TaskRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local.",
    );
  }

  const body = await response.json() as ApiResponse<Task>;

  if (!response.ok || !body.success || !body.data) {
    throw new TaskRequestError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Error al actualizar la tarea.",
      body.error?.details,
    );
  }

  return body.data;
}

export async function deleteTask(token: string, id: string): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/v1/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new TaskRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local.",
    );
  }

  const body = await response.json() as ApiResponse<{ success: boolean }>;

  if (!response.ok || !body.success) {
    throw new TaskRequestError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Error al eliminar la tarea.",
      body.error?.details,
    );
  }

  return true;
}
