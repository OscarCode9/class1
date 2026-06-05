import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import type { Server } from "node:http";
import { createApp } from "../src/app";
import { userModel } from "../src/models/user";
import type { ApiResponse, RegisterResponse } from "../src/types";

describe("POST /api/v1/auth/register", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    const app = createApp();

    server = await new Promise<Server>((resolve) => {
      const startedServer = app.listen(0, "127.0.0.1", () => {
        resolve(startedServer);
      });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve test server address");
    }

    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  beforeEach(async () => {
    await userModel.reset();
  });

  test("creates a user, stores only passwordHash, and returns an access token", async () => {
    const response = await register({
      name: "  Alice Example  ",
      email: "  Alice@Example.com  ",
      password: "Strong!123",
    });

    expect(response.status).toBe(201);

    const body = await response.json() as ApiResponse<RegisterResponse>;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    if (!body.data) {
      throw new Error("Expected response data");
    }

    expect(body.data.user.name).toBe("Alice Example");
    expect(body.data.user.email).toBe("alice@example.com");
    expect(body.data.user.id).toBeString();
    expect(body.data.accessToken).toBeString();
    expect("password" in body.data.user).toBe(false);
    expect("passwordHash" in body.data.user).toBe(false);

    const storedUser = await userModel.findRecordByEmail("alice@example.com");
    expect(storedUser).toBeDefined();
    expect(storedUser?.passwordHash).toBeString();
    expect(storedUser?.passwordHash).not.toBe("Strong!123");
    expect(await Bun.password.verify("Strong!123", storedUser?.passwordHash ?? "")).toBe(true);
  });

  test("returns 400 when name is empty", async () => {
    const response = await register({
      name: "   ",
      email: "alice@example.com",
      password: "Strong!123",
    });

    expect(response.status).toBe(400);

    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Name is required",
    });
  });

  test("returns 400 when email format is invalid", async () => {
    const response = await register({
      name: "Alice Example",
      email: "alice-at-example.com",
      password: "Strong!123",
    });

    expect(response.status).toBe(400);

    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "A valid email is required",
    });
  });

  test("returns 400 when name exceeds 100 characters", async () => {
    const response = await register({
      name: "A".repeat(101),
      email: "alice@example.com",
      password: "Strong!123",
    });

    expect(response.status).toBe(400);

    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Name must not exceed 100 characters",
    });
  });

  test("returns 400 when password does not satisfy the policy", async () => {
    const response = await register({
      name: "Alice Example",
      email: "alice@example.com",
      password: "weakpass",
    });

    expect(response.status).toBe(400);

    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "VALIDATION_ERROR",
      message:
        "Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol",
    });
  });

  test("returns 409 when the email already exists", async () => {
    const firstResponse = await register({
      name: "Alice Example",
      email: "alice@example.com",
      password: "Strong!123",
    });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await register({
      name: "Another Alice",
      email: "ALICE@example.com",
      password: "Strong!123",
    });

    expect(secondResponse.status).toBe(409);

    const body = await secondResponse.json() as ApiResponse;
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "EMAIL_EXISTS",
      message: "A user with this email already exists",
    });
  });

  async function register(payload: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
});
