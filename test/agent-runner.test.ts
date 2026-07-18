import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { prisma } from "../src/config/prisma";
import { runAgent } from "../src/agent/agent-runner";
import type { IAIProvider, IChatMessage, IAIResponse } from "../src/agent/ai-provider";

// A mock provider that returns a pre-configured sequence of responses
class FakeProvider implements IAIProvider {
  private responses: IAIResponse[];
  private currentIndex = 0;

  constructor(responses: IAIResponse[]) {
    this.responses = responses;
  }

  async sendMessage(_messages: IChatMessage[], _tools?: any[]): Promise<IAIResponse> {
    const resp = this.responses[this.currentIndex];
    if (resp) {
      this.currentIndex++;
      return resp;
    }
    return { text: "Respuesta final del mock provider por defecto.", toolCalls: [] };
  }
}

describe("ReAct Agent Loop runner Unit Tests", () => {
  let testUser: any;
  let testTask: any;

  beforeAll(async () => {
    // Clean database state
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: "Test Agent User",
        email: "agent-user@test.local",
      },
    });

    // Create test task
    testTask = await prisma.task.create({
      data: {
        title: "Test Task Runner",
        description: "Task for checking runner ReAct loop",
        assigneeId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    // Clean database records
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("1. Direct Response -> Should stop loop immediately and return text", async () => {
    const fakeProvider = new FakeProvider([
      { text: "Hola, soy tu asistente de tareas.", toolCalls: [] },
    ]);

    const result = await runAgent("Hola bot", testUser.id, undefined, fakeProvider);

    expect(result.text).toBe("Hola, soy tu asistente de tareas.");
    expect(result.pendingConfirmation).toBeUndefined();
    expect(result.events.map((e) => e.type)).toEqual([
      "agent.started",
      "llm.completed",
      "agent.completed",
    ]);
  });

  test("2. One Tool Call -> Should request tool, observe results and return text", async () => {
    const fakeProvider = new FakeProvider([
      {
        text: null,
        toolCalls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "list_tasks",
              arguments: "{}",
            },
          },
        ],
      },
      {
        text: "Tienes una tarea llamada Test Task Runner.",
        toolCalls: [],
      },
    ]);

    const result = await runAgent("Muestra mis tareas", testUser.id, undefined, fakeProvider);

    expect(result.text).toContain("Test Task Runner");
    expect(result.pendingConfirmation).toBeUndefined();
    expect(result.events.map((e) => e.type)).toEqual([
      "agent.started",
      "llm.completed", // Step 1 call
      "tool.requested",
      "tool.executed",
      "llm.completed", // Step 2 call
      "agent.completed",
    ]);
  });

  test("3. Deletion Flow (Requires Confirmation) -> Should halt loop and return pendingConfirmation details", async () => {
    const fakeProvider = new FakeProvider([
      {
        text: null,
        toolCalls: [
          {
            id: "call_delete",
            type: "function",
            function: {
              name: "delete_task",
              arguments: JSON.stringify({ id: testTask.id }),
            },
          },
        ],
      },
    ]);

    const result = await runAgent("Elimina la tarea de prueba", testUser.id, undefined, fakeProvider);

    expect(result.pendingConfirmation).toBeDefined();
    expect(result.pendingConfirmation?.taskId).toBe(testTask.id);
    expect(result.pendingConfirmation?.confirmToken).toBeString();
    expect(result.text).toContain("confirm deletion");
    expect(result.events.map((e) => e.type)).toEqual([
      "agent.started",
      "llm.completed",
      "tool.requested",
      "tool.executed",
      "agent.completed",
    ]);

    // Double check that task is NOT deleted from DB yet
    const checkTask = await prisma.task.findUnique({ where: { id: testTask.id } });
    expect(checkTask).not.toBeNull();
  });

  test("4. Deletion Flow (Confirmed with token) -> Injects confirmToken and deletes task", async () => {
    // Generate a valid confirmation token first
    const setupProvider = new FakeProvider([
      {
        text: null,
        toolCalls: [
          {
            id: "call_delete_setup",
            type: "function",
            function: {
              name: "delete_task",
              arguments: JSON.stringify({ id: testTask.id }),
            },
          },
        ],
      },
    ]);

    const setupResult = await runAgent("Eliminar", testUser.id, undefined, setupProvider);
    const token = setupResult.pendingConfirmation!.confirmToken;

    // Send confirmation token in second agent runner invocation
    const confirmProvider = new FakeProvider([
      {
        text: null,
        toolCalls: [
          {
            id: "call_delete_confirmed",
            type: "function",
            function: {
              name: "delete_task",
              arguments: JSON.stringify({ id: testTask.id }),
            },
          },
        ],
      },
      {
        text: "La tarea ha sido eliminada con éxito.",
        toolCalls: [],
      },
    ]);

    const finalResult = await runAgent("Sí, confirmo", testUser.id, token, confirmProvider);

    expect(finalResult.text).toBe("La tarea ha sido eliminada con éxito.");
    expect(finalResult.pendingConfirmation).toBeUndefined();

    // Verify task is deleted in DB
    const checkDeleted = await prisma.task.findUnique({ where: { id: testTask.id } });
    expect(checkDeleted).toBeNull();
  });

  test("5. Step Limit reached -> Halt loop at max iteration", async () => {
    // A provider that always asks to list tasks indefinitely (infinite loop)
    const infiniteProvider = new FakeProvider([
      {
        text: null,
        toolCalls: [
          {
            id: "call_loop",
            type: "function",
            function: { name: "list_tasks", arguments: "{}" },
          },
        ],
      },
      {
        text: null,
        toolCalls: [
          {
            id: "call_loop",
            type: "function",
            function: { name: "list_tasks", arguments: "{}" },
          },
        ],
      },
      {
        text: null,
        toolCalls: [
          {
            id: "call_loop",
            type: "function",
            function: { name: "list_tasks", arguments: "{}" },
          },
        ],
      },
      {
        text: null,
        toolCalls: [
          {
            id: "call_loop",
            type: "function",
            function: { name: "list_tasks", arguments: "{}" },
          },
        ],
      },
      {
        text: null,
        toolCalls: [
          {
            id: "call_loop",
            type: "function",
            function: { name: "list_tasks", arguments: "{}" },
          },
        ],
      },
    ]);

    const result = await runAgent("Bucle infinito", testUser.id, undefined, infiniteProvider);

    expect(result.text).toContain("límite");
    expect(result.events.filter((e) => e.type === "llm.completed").length).toBe(5);
  });
});
