import type { 
  ApiResponse, 
  HealthStatus, 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  RegisterUserDto, 
  RegisterResponse, 
  Task, 
  CreateTaskDto 
} from "../types";

export class ApiClient {
    private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_URL || "http://localhost:3000/api/v1";
  }

  private async request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: { message: response.statusText, code: "HTTP_ERROR" } };
        }
        
        throw new Error(
          errorData.error?.message || `HTTP Request failed with status ${response.status}`
        );
      }

      return (await response.json()) as ApiResponse<T>;
    } catch (error: any) {
      console.error(`API request error on ${url}:`, error.message);
      throw error;
    }
  }

  async getHealth(): Promise<HealthStatus> {
    const res = await this.request<HealthStatus>("/health");
    if (!res.success || !res.data) {
      throw new Error("Failed to fetch health status");
    }
    return res.data;
  }

  async listUsers(): Promise<User[]> {
    const res = await this.request<User[]>("/users");
    if (!res.success || !res.data) {
      throw new Error("Failed to list users");
    }
    return res.data;
  }

  async getUser(id: string): Promise<User> {
    const res = await this.request<User>(`/users/${id}`);
    if (!res.success || !res.data) {
      throw new Error(`Failed to get user with id: ${id}`);
    }
    return res.data;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const res = await this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    if (!res.success || !res.data) {
      throw new Error("Failed to create user");
    }
    return res.data;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const res = await this.request<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    });
    if (!res.success || !res.data) {
      throw new Error(`Failed to update user with id: ${id}`);
    }
    return res.data;
  }

  async deleteUser(id: string): Promise<void> {
    const res = await this.request<void>(`/users/${id}`, {
      method: "DELETE",
    });
    if (!res.success) {
      throw new Error(`Failed to delete user with id: ${id}`);
    }
  }

  async registerUser(dto: RegisterUserDto): Promise<RegisterResponse> {
    const res = await this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    if (!res.success || !res.data) {
      throw new Error("Failed to register user");
    }
    return res.data;
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const res = await this.request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    if (!res.success || !res.data) {
      throw new Error("Failed to create task");
    }
    return res.data;
  }
}
