import { Router, type Request, type Response, type NextFunction } from "express";
import { taskModel } from "../models/task";
import { userModel } from "../models/user";
import { AppError } from "../middleware/errorHandler";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth";
import type { ApiResponse, Task, TaskStatus, TaskPriority } from "../types";
import { validateCreateTaskInput, validateUpdateTaskInput } from "../validators/task";

const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const TASK_PRIORITIES = ["low", "medium", "high", "critical"];

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  if (from === "pending") {
    return to === "in_progress" || to === "cancelled";
  }
  if (from === "in_progress") {
    return to === "completed" || to === "cancelled";
  }
  if (from === "completed") {
    return to === "cancelled";
  }
  return false;
}

export function createTaskRoutes(): Router {
  const router = Router();

  // Apply Auth Middleware to all Task routes
  router.use(authMiddleware as any);

  // POST / - Create Task
  router.post(
    "/",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const dto = validateCreateTaskInput(req.body);

      if (dto.assigneeId) {
        const assignee = await userModel.findById(dto.assigneeId);
        if (!assignee) {
          throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }
      }

      const task = await taskModel.create(dto);

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

  // GET / - List Tasks (with filtering, search, pagination, order)
  router.get(
    "/",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // 1. Parsing Pagination parameters
      const pageQuery = parseInt(req.query.page as string, 10);
      const limitQuery = parseInt(req.query.limit as string, 10);
      const page = !isNaN(pageQuery) && pageQuery >= 1 ? pageQuery : 1;
      const limit = !isNaN(limitQuery) && limitQuery >= 1 && limitQuery <= 100 ? limitQuery : 20;

      // 2. Filters
      const status = typeof req.query.status === "string" && TASK_STATUSES.includes(req.query.status)
        ? (req.query.status as TaskStatus)
        : undefined;

      const priority = typeof req.query.priority === "string" && TASK_PRIORITIES.includes(req.query.priority)
        ? (req.query.priority as TaskPriority)
        : undefined;

      const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
      const assigneeId = typeof req.query.assigneeId === "string" ? req.query.assigneeId : undefined;
      const dueDateBefore = typeof req.query.dueDateBefore === "string" ? req.query.dueDateBefore : undefined;
      const dueDateAfter = typeof req.query.dueDateAfter === "string" ? req.query.dueDateAfter : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      // 3. Sorting
      const allowedSortFields = ["createdAt", "updatedAt", "dueDate", "priority", "title"];
      const sortBy = typeof req.query.sortBy === "string" && allowedSortFields.includes(req.query.sortBy)
        ? req.query.sortBy
        : "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

      const { data: tasks, total } = await taskModel.findAll({
        status,
        priority,
        tag,
        assigneeId,
        dueDateBefore,
        dueDateAfter,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const totalPages = Math.ceil(total / limit);

      const body = {
        success: true,
        data: tasks,
        meta: {
          page,
          limit,
          total,
          totalPages,
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.status(200).json(body);
    }),
  );

  // GET /:id - Get Task by ID
  router.get(
    "/:id",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (typeof id !== "string") {
        throw new AppError(400, "VALIDATION_ERROR", "Task ID must be a string");
      }

      const task = await taskModel.findById(id);
      if (!task) {
        throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      }

      const body = {
        success: true,
        data: task,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      } satisfies ApiResponse<Task>;

      res.status(200).json(body);
    }),
  );

  // PUT /:id - Update Task
  router.put(
    "/:id",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (typeof id !== "string") {
        throw new AppError(400, "VALIDATION_ERROR", "Task ID must be a string");
      }

      const dto = validateUpdateTaskInput(req.body);

      const existingTask = await taskModel.findById(id);
      if (!existingTask) {
        throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      }

      // Check transition of state
      if (dto.status && dto.status !== existingTask.status) {
        if (!isValidTransition(existingTask.status, dto.status)) {
          throw new AppError(400, "INVALID_STATUS_TRANSITION", "Invalid status transition");
        }
      }

      // Check assignee if updated
      if (dto.assigneeId) {
        const assignee = await userModel.findById(dto.assigneeId);
        if (!assignee) {
          throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }
      }

      const updatedTask = await taskModel.update(id, dto);
      if (!updatedTask) {
        throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      }

      const body = {
        success: true,
        data: updatedTask,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      } satisfies ApiResponse<Task>;

      res.status(200).json(body);
    }),
  );

  // DELETE /:id - Delete Task
  router.delete(
    "/:id",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (typeof id !== "string") {
        throw new AppError(400, "VALIDATION_ERROR", "Task ID must be a string");
      }

      const existingTask = await taskModel.findById(id);
      if (!existingTask) {
        throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      }

      await taskModel.delete(id);

      const body = {
        success: true,
        data: { success: true },
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      } satisfies ApiResponse<{ success: boolean }>;

      res.status(200).json(body);
    }),
  );

  return router;
}
