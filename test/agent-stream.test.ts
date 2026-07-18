import { describe, expect, test, beforeAll, afterAll, mock } from "bun:test";
import type { Server } from "node:http";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";

describe("POST /api/v1/agent/chat - Streaming SSE Integration Tests", () => {
  let server: Server;
  let baseUrl = "";
  let accessToken = "";
  let originalFetch: typeof fetch;

  beforeAll(async () => {
    // Clean database state
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});

    // Start Express application on random port
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

    // 1. Create a user to get authentication token
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Stream User",
        email: "alice-stream@test.local",
        password: "Password123!",
      }),
    });

    const body = (await registerResponse.json()) as any;
    accessToken = body.data.accessToken;

    // Set up dummy Qwen credentials in environment so QwenProvider doesn't crash on start
    process.env.QWEN_API_KEY = "test-qwen-key";

    // 2. Intercept outgoing Qwen API calls but forward local server requests
    originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as any).url || "";
      if (url.startsWith(baseUrl)) {
        return originalFetch(input, init);
      }

      // Mocked Qwen Streaming response chunks
      const sseChunks = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "¡Qué " } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: "onda compa!" } }] })}\n\n`,
        "data: [DONE]\n\n",
      ];

      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of sseChunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            // Add a tiny delay to simulate network streaming
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          controller.close();
        },
      });

      return {
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers({ "Content-Type": "text/event-stream" }),
      } as any;
    });
  });

  afterAll(async () => {
    // Restore fetch mock
    (globalThis as any).fetch = originalFetch;

    // Clean DB
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});

    // Close server
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

  test("1. Unauthorized Request -> Should return 401 when no token is provided", async () => {
    const response = await fetch(`${baseUrl}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hola" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("2. Invalid Inputs -> Should return 400 when message is empty", async () => {
    const response = await fetch(`${baseUrl}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message: "" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("3. Valid SSE Stream -> Should output thinking, delta, and done events successfully", async () => {
    const response = await fetch(`${baseUrl}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message: "Hola" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let accumulatedText = "";
    const receivedEvents: string[] = [];

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        try {
          const event = JSON.parse(jsonStr);
          receivedEvents.push(event.type);
          if (event.type === "delta" && event.content) {
            accumulatedText += event.content;
          }
        } catch {
          // ignore parsing error for malformed lines
        }
      }
    }

    // Verify correct order and presence of events
    expect(receivedEvents).toContain("thinking");
    expect(receivedEvents).toContain("delta");
    expect(receivedEvents).toContain("done");
    
    // Check accumulated text
    expect(accumulatedText).toBe("¡Qué onda compa!");
  });
});
