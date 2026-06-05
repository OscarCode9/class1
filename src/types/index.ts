export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  version: string;
}

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredUser extends User {
  passwordHash?: string;
}

export type CreateUserDto = Pick<User, "name" | "email">;

export type UpdateUserDto = Partial<CreateUserDto>;

export interface RegisterUserDto extends CreateUserDto {
  password: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
}

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

export interface CreateTaskDto {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
  dueDate: string | null;
  assigneeId: string | null;
}
