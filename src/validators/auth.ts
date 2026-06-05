import { AppError } from "../middleware/errorHandler";
import type { RegisterUserDto } from "../types";

const MAX_NAME_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol";

export function validateRegisterInput(input: unknown): RegisterUserDto {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be an object");
  }

  const { name, email, password } = input as Record<string, unknown>;

  if (typeof name !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Name is required");
  }

  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Name is required");
  }

  if (normalizedName.length > MAX_NAME_LENGTH) {
    throw new AppError(400, "VALIDATION_ERROR", "Name must not exceed 100 characters");
  }

  if (typeof email !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "A valid email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError(400, "VALIDATION_ERROR", "A valid email is required");
  }

  if (typeof password !== "string" || !isValidPassword(password)) {
    throw new AppError(400, "VALIDATION_ERROR", PASSWORD_POLICY_MESSAGE);
  }

  return {
    name: normalizedName,
    email: normalizedEmail,
    password,
  };
}

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
