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
