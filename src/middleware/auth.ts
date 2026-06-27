import { createHmac } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { AppError } from "./errorHandler";
import { userModel } from "../models/user";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  const token = authHeader.substring(7);
  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  // Verify signature
  const expectedSignature = createHmac("sha256", config.accessTokenSecret)
    .update(payloadBase64)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  // Decode and parse payload
  let payload: any;
  try {
    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    payload = JSON.parse(jsonStr);
  } catch {
    return next(new AppError(401, "UNAUTHORIZED", "Token missing or invalid"));
  }

  // Check expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    return next(new AppError(401, "UNAUTHORIZED", "Token expired"));
  }

  // Verify user still exists in DB (bypass for system tokens)
  let user: { id: string; email: string } | undefined;
  if (typeof payload.sub === "string" && payload.sub.startsWith("system")) {
    user = { id: payload.sub, email: payload.email || "system@mcp.local" };
  } else {
    const dbUser = await userModel.findById(payload.sub);
    if (dbUser) {
      user = { id: dbUser.id, email: dbUser.email };
    }
  }

  if (!user) {
    return next(new AppError(401, "UNAUTHORIZED", "User not found"));
  }

  // Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
  };

  next();
}
