import { api } from '@/services/api';
import type { ApiResponse } from '@/types/auth.types';
import type {
  CreateTaskPayload,
  Task,
  TaskListParams,
  TasksListResult,
  UpdateTaskPayload,
} from '@/types/task.types';

export const tasksService = {
  list: async (params: TaskListParams = {}): Promise<TasksListResult> => {
    const { data } = await api.get<{
      success: boolean;
      data: Task[];
      meta: TasksListResult['meta'];
      error?: { message?: string };
    }>('/tasks', { params });

    if (!data.success) {
      throw new Error(data.error?.message ?? 'Error al obtener las tareas.');
    }

    return {
      data: data.data ?? [],
      meta: data.meta ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
    };
  },

  byId: async (id: string): Promise<Task> => {
    const { data } = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'Error al obtener la tarea.');
    }
    return data.data;
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const { data } = await api.post<ApiResponse<Task>>('/tasks', payload);
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'Error al crear la tarea.');
    }
    return data.data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const { data } = await api.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'Error al actualizar la tarea.');
    }
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    const { data } = await api.delete<ApiResponse<{ success?: boolean }>>(
      `/tasks/${id}`,
    );
    if (!data.success) {
      throw new Error(data.error?.message ?? 'Error al eliminar la tarea.');
    }
  },
};
