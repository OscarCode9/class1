import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error("Unhandled error:", err);

  const body: ApiResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
  res.status(500).json(body);
}

export function notFoundHandler(
  _req: Request,
  res: Response,
): void {
  const body: ApiResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  };
  res.status(404).json(body);
}
