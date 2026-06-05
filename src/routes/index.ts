import { Router, type Request, type Response, type NextFunction } from "express";
import type { ApiResponse, HealthStatus } from "../types";
import { createAuthRoutes } from "./auth";
import { createTaskRoutes } from "./tasks";
import { createUserRoutes } from "./users";

const startTime = Date.now();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createRoutes(): Router {
  const router = Router();

  router.get(
    "/health",
    asyncHandler(async (_req: Request, res: Response) => {
      const uptime = Math.floor((Date.now() - startTime) / 1000);

      const health: HealthStatus = {
        status: "healthy",
        uptime,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };

      const body: ApiResponse<HealthStatus> = {
        success: true,
        data: health,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.json(body);
    }),
  );

  router.use("/auth", createAuthRoutes());
  router.use("/users", createUserRoutes());
  router.use("/tasks", createTaskRoutes());

  return router;
}
