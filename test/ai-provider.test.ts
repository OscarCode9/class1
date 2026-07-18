import { describe, expect, test, mock, beforeAll } from "bun:test";
import { QwenProvider } from "../src/agent/ai-provider";

describe("QwenProvider Unit Tests with Mocking", () => {
  beforeAll(() => {
    // Set a dummy API Key for tests to prevent constructor validation failure
    process.env.QWEN_API_KEY = "test-api-key";
  });

  test("1. Successfully parse standard response", async () => {
    const provider = new QwenProvider();
    
    // Mock the global fetch
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        text: async () => "{}",
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: "Hello! How can I help you today?",
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
          },
        }),
      } as Response;
    });

    try {
      const response = await provider.sendMessage([{ role: "user", content: "Hi" }]);
      expect(response.text).toBe("Hello! How can I help you today?");
      expect(response.toolCalls).toBeUndefined();
      expect(response.usage?.inputTokens).toBe(10);
      expect(response.usage?.outputTokens).toBe(15);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("2. Successfully parse response with tool calls", async () => {
    const provider = new QwenProvider();
    
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        text: async () => "{}",
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_abc123",
                    type: "function",
                    function: {
                      name: "list_tasks",
                      arguments: '{"status":"pending"}',
                    },
                  },
                ],
              },
            },
          ],
        }),
      } as Response;
    });

    try {
      const response = await provider.sendMessage([{ role: "user", content: "Show tasks" }]);
      expect(response.text).toBeNull();
      expect(response.toolCalls).toBeDefined();
      const toolCalls = response.toolCalls!;
      expect(toolCalls[0]!.id).toBe("call_abc123");
      expect(toolCalls[0]!.function.name).toBe("list_tasks");
      expect(toolCalls[0]!.function.arguments).toBe('{"status":"pending"}');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("3. Handle HTTP non-ok status error", async () => {
    const provider = new QwenProvider();
    
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: false,
        status: 400,
        text: async () => "Bad Request parameters",
      } as Response;
    });

    try {
      expect(provider.sendMessage([{ role: "user", content: "Hi" }])).rejects.toThrow("Qwen API error (400)");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
