import { createHmac } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import { userModel } from "../models/user";
import type { ApiResponse, RegisterResponse, User } from "../types";
import { validateRegisterInput, validateLoginInput } from "../validators/auth";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createAuthRoutes(): Router {
  const router = Router();

  router.post(
    "/register",
    asyncHandler(async (req: Request, res: Response) => {
      const dto = validateRegisterInput(req.body);

      const existingUser = await userModel.findRecordByEmail(dto.email);
      if (existingUser) {
        throw new AppError(409, "EMAIL_EXISTS", "A user with this email already exists");
      }

      const passwordHash = await Bun.password.hash(dto.password);
      const user = await userModel.createWithPasswordHash({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });

      const body: ApiResponse<RegisterResponse> = {
        success: true,
        data: {
          user,
          accessToken: createAccessToken(user),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.status(201).json(body);
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (req: Request, res: Response) => {
      const dto = validateLoginInput(req.body);

      const existingUser = await userModel.findRecordByEmail(dto.email);
      if (!existingUser || !existingUser.passwordHash) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const passwordMatches = await Bun.password.verify(dto.password, existingUser.passwordHash);
      if (!passwordMatches) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const publicUser = await userModel.findById(existingUser.id);
      if (!publicUser) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
      }

      const body: ApiResponse<RegisterResponse> = {
        success: true,
        data: {
          user: publicUser,
          accessToken: createAccessToken(publicUser),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
        },
      };

      res.status(200).json(body);
    }),
  );

  return router;
}

function createAccessToken(user: User): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 15 * 60; // 15 minutes expiration
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      iat,
      exp,
    }),
  ).toString("base64url");

  const signature = createHmac("sha256", config.accessTokenSecret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}
