import type { TaskStatus } from '@/types/task.types';

export const ENABLED_STATUS_ACTIONS: Record<
  TaskStatus,
  { play: boolean; complete: boolean; cancel: boolean }
> = {
  pending: { play: true, complete: false, cancel: true },
  in_progress: { play: false, complete: true, cancel: true },
  completed: { play: false, complete: false, cancel: true },
  cancelled: { play: false, complete: false, cancel: false },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Creación' },
  { value: 'updatedAt', label: 'Actualización' },
  { value: 'dueDate', label: 'Vencimiento' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'title', label: 'Título' },
] as const;

export const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
] as const;
