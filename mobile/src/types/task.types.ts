export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueDate: string | null;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface TasksMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TasksListResult {
  data: Task[];
  meta: TasksMeta;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  tag?: string;
  assigneeId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  tag: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
