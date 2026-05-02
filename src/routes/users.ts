import { Router, type Request, type Response, type NextFunction } from "express";
import type { ApiResponse, CreateUserDto, UpdateUserDto, User } from "../types";
import { userModel } from "../models/user";
import { AppError } from "../middleware/errorHandler";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createUserRoutes(): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response) => {
      const users = userModel.findAll();

      const body: ApiResponse<User[]> = {
        success: true,
        data: users,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.json(body);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const user = userModel.findById(id);

      if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
      }

      const body: ApiResponse<User> = {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.json(body);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const { name, email } = req.body as CreateUserDto;

      if (!name || typeof name !== "string") {
        throw new AppError(400, "VALIDATION_ERROR", "Name is required");
      }

      if (!email || typeof email !== "string" || !email.includes("@")) {
        throw new AppError(400, "VALIDATION_ERROR", "A valid email is required");
      }

      const existing = userModel.findByEmail(email);
      if (existing) {
        throw new AppError(409, "EMAIL_EXISTS", "A user with this email already exists");
      }

      const user = userModel.create({ name, email });

      const body: ApiResponse<User> = {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.status(201).json(body);
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const dto = req.body as UpdateUserDto;

      if (dto.email !== undefined && (!dto.email || !dto.email.includes("@"))) {
        throw new AppError(400, "VALIDATION_ERROR", "A valid email is required");
      }

      const id = req.params.id as string;
      const user = userModel.update(id, dto);

      if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
      }

      const body: ApiResponse<User> = {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.json(body);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const deleted = userModel.delete(id);

      if (!deleted) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
      }

      const body: ApiResponse = {
        success: true,
        data: undefined,
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.json(body);
    }),
  );

  return router;
}
