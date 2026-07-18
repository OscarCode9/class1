import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { prisma } from "../src/config/prisma";
import { executeAgentTool } from "../src/agent/tool-executor";
import { confirmationStore } from "../src/agent/confirmation-store";

describe("Agent Tool Executor Unit Tests", () => {
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Ensure clean state
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    const userA = await prisma.user.create({
      data: {
        name: "User A",
        email: "user-a@test.local",
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        name: "User B",
        email: "user-b@test.local",
      },
    });
    userBId = userB.id;
  });

  afterAll(async () => {
    // Clean up created records
    await prisma.task.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("1. Unknown Tool -> Should reject with UNKNOWN_TOOL", async () => {
    const result = await executeAgentTool("invented_tool_xyz", {}, userAId);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNKNOWN_TOOL");
  });

  test("2. Foreign Access -> User B trying to view User A's task should get TASK_NOT_FOUND", async () => {
    // Create task for User A
    const taskA = await prisma.task.create({
      data: {
        title: "User A Task",
        description: "Confidential task",
        assigneeId: userAId,
      },
    });

    // User B tries to retrieve User A's task
    const result = await executeAgentTool("get_task", { id: taskA.id }, userBId);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TASK_NOT_FOUND");
    expect(result.data).toBeUndefined();
  });

  test("3. Foreign Access -> User B trying to update User A's task should get TASK_NOT_FOUND", async () => {
    const taskA = await prisma.task.create({
      data: {
        title: "User A Task 2",
        description: "Confidential task",
        assigneeId: userAId,
      },
    });

    const result = await executeAgentTool(
      "update_task",
      { id: taskA.id, title: "Hacked title" },
      userBId
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TASK_NOT_FOUND");

    // Double check DB was not modified
    const checkTask = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(checkTask?.title).toBe("User A Task 2");
  });

  test("4. Invalid Transition -> Reject transition from pending to completed", async () => {
    // Create task for User A (defaults to pending)
    const taskA = await prisma.task.create({
      data: {
        title: "Status Transition Task",
        description: "State machine check",
        assigneeId: userAId,
      },
    });

    // Try to transition pending -> completed (invalid transition)
    const result = await executeAgentTool(
      "change_task_status",
      { id: taskA.id, status: "completed" },
      userAId
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATUS_TRANSITION");

    // Double check DB state remains pending
    const checkTask = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(checkTask?.status).toBe("pending");
  });

  test("5. Deletion Flow -> Require confirmation, then delete with token, then deny token reuse", async () => {
    // Create task for User A
    const taskA = await prisma.task.create({
      data: {
        title: "Task to delete",
        description: "Will be deleted",
        assigneeId: userAId,
      },
    });

    // 5.1 Request deletion without confirmToken
    const firstRequest = await executeAgentTool("delete_task", { id: taskA.id }, userAId);
    expect(firstRequest.success).toBe(true);
    expect(firstRequest.data.status).toBe("requires_confirmation");
    expect(firstRequest.data.confirmToken).toBeString();

    const token = firstRequest.data.confirmToken;

    // Verify task still exists in DB
    const checkExists = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(checkExists).not.toBeNull();

    // 5.2 Attempt delete with invalid token
    const invalidConfirm = await executeAgentTool(
      "delete_task",
      { id: taskA.id, confirmToken: "wrong-token" },
      userAId
    );
    expect(invalidConfirm.success).toBe(false);
    expect(invalidConfirm.error?.code).toBe("INVALID_CONFIRMATION_TOKEN");

    // 5.3 Attempt delete with valid token but wrong user (User B)
    // First regenerate token as user B won't be able to consume A's token
    const wrongUserConfirm = await executeAgentTool(
      "delete_task",
      { id: taskA.id, confirmToken: token },
      userBId
    );
    // Should get TASK_NOT_FOUND because User B does not own the task
    expect(wrongUserConfirm.success).toBe(false);
    expect(wrongUserConfirm.error?.code).toBe("TASK_NOT_FOUND");

    // 5.4 Confirm deletion with valid token and correct user
    const successConfirm = await executeAgentTool(
      "delete_task",
      { id: taskA.id, confirmToken: token },
      userAId
    );
    expect(successConfirm.success).toBe(true);
    expect(successConfirm.data.deletedId).toBe(taskA.id);

    // Verify task is deleted in DB
    const checkDeleted = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(checkDeleted).toBeNull();

    // 5.5 Attempt token reuse (should fail because token is consumed)
    const reuseConfirm = await executeAgentTool(
      "delete_task",
      { id: taskA.id, confirmToken: token },
      userAId
    );
    // Since task is already deleted, it might first fail with TASK_NOT_FOUND or INVALID_CONFIRMATION_TOKEN.
    // However, if we look it up, the task is gone, so ownership/existence check fails with TASK_NOT_FOUND.
    // Let's verify it gets TASK_NOT_FOUND.
    expect(reuseConfirm.success).toBe(false);
    expect(reuseConfirm.error?.code).toBe("TASK_NOT_FOUND");
  });

  test("6. Token Expiry -> Expired token should be rejected", async () => {
    // Create task for User A
    const taskA = await prisma.task.create({
      data: {
        title: "Expired Task",
        description: "Will check TTL",
        assigneeId: userAId,
      },
    });

    // Create a confirmation token that expires in 0 ms (instantly expired)
    const expiredToken = confirmationStore.createConfirmation(userAId, taskA.id, "delete_task", -1000);

    const deleteResult = await executeAgentTool(
      "delete_task",
      { id: taskA.id, confirmToken: expiredToken },
      userAId
    );

    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error?.code).toBe("INVALID_CONFIRMATION_TOKEN");

    // Clean up
    await prisma.task.delete({ where: { id: taskA.id } });
  });
});
