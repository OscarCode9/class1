import { describe, expect, test, afterEach } from "bun:test";
import { ApiClient } from "../src/mcp/client";

describe("ApiClient", () => {
  const mockBaseUrl = "http://localhost:3000/api/v1";
  const client = new ApiClient(mockBaseUrl);

  afterEach(() => {
    // Restore the original global fetch
    globalThis.fetch = originalFetch;
  });

  const originalFetch = globalThis.fetch;

  test("getHealth returns health status on success", async () => {
    const mockHealthResponse = {
      success: true,
      data: {
        status: "healthy",
        uptime: 120,
        timestamp: "2026-06-05T12:00:00.000Z",
        version: "1.0.0",
      },
    };

    globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
      expect(input.toString()).toBe(`${mockBaseUrl}/health`);
      return new Response(JSON.stringify(mockHealthResponse), { status: 200 });
    }) as any;

    const health = await client.getHealth();
    expect(health.status).toBe("healthy");
    expect(health.uptime).toBe(120);
    expect(health.version).toBe("1.0.0");
  });

  test("listUsers returns users list on success", async () => {
    const mockUsersResponse = {
      success: true,
      data: [
        { id: "1", name: "Alice", email: "alice@example.com", createdAt: "", updatedAt: "" },
        { id: "2", name: "Bob", email: "bob@example.com", createdAt: "", updatedAt: "" },
      ],
    };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      expect(input.toString()).toBe(`${mockBaseUrl}/users`);
      return new Response(JSON.stringify(mockUsersResponse), { status: 200 });
    }) as any;

    const users = await client.listUsers();
    expect(users).toHaveLength(2);
    expect(users[0]?.name).toBe("Alice");
    expect(users[1]?.email).toBe("bob@example.com");
  });

  test("createUser sends correct payload and returns new user", async () => {
    const payload = { name: "Charlie", email: "charlie@example.com" };
    const mockCreateResponse = {
      success: true,
      data: { id: "3", ...payload, createdAt: "", updatedAt: "" },
    };

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input.toString()).toBe(`${mockBaseUrl}/users`);
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      return new Response(JSON.stringify(mockCreateResponse), { status: 201 });
    }) as any;

    const newUser = await client.createUser(payload);
    expect(newUser.id).toBe("3");
    expect(newUser.name).toBe("Charlie");
  });

  test("createTask sends correct payload and returns new task", async () => {
    const payload = {
      title: "Write MCP tests",
      description: "Ensure tests are robust",
      priority: "high" as const,
      tags: ["mcp", "testing"],
      dueDate: null,
      assigneeId: "3",
    };

    const mockTaskResponse = {
      success: true,
      data: {
        id: "task-100",
        ...payload,
        status: "pending",
        createdAt: "",
        updatedAt: "",
      },
    };

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input.toString()).toBe(`${mockBaseUrl}/tasks`);
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      return new Response(JSON.stringify(mockTaskResponse), { status: 201 });
    }) as any;

    const task = await client.createTask(payload);
    expect(task.id).toBe("task-100");
    expect(task.title).toBe("Write MCP tests");
    expect(task.priority).toBe("high");
    expect(task.assigneeId).toBe("3");
  });

  test("request failure throws AppError or standard Error", async () => {
    const mockErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Email is already taken",
      },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockErrorResponse), { status: 400 });
    }) as any;

    expect(client.listUsers()).rejects.toThrow("Email is already taken");
  });
});
