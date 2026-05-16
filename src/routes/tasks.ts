import { Router, type Request, type Response, type NextFunction } from "express";
import { taskModel } from "../models/task";
import { userModel } from "../models/user";
import { AppError } from "../middleware/errorHandler";
import type { ApiResponse, Task } from "../types";
import { validateCreateTaskInput } from "../validators/task";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createTaskRoutes(): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const dto = validateCreateTaskInput(req.body);

      if (dto.assigneeId) {
        const assignee = userModel.findById(dto.assigneeId);
        if (!assignee) {
          throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }
      }

      const task = taskModel.create(dto);

      const body: ApiResponse<Task> = {
        success: true,
        data: task,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.status(201).json(body);
    }),
  );

  return router;
}
