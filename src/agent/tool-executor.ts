import { taskModel } from "../models/task";
import { isValidTransition } from "../domain/task-status";
import { confirmationStore } from "./confirmation-store";
import {
  listTasksSchema,
  getTaskSchema,
  createTaskSchema,
  updateTaskSchema,
  changeTaskStatusSchema,
  deleteTaskSchema,
} from "./tool-definitions";

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Executes a tool on behalf of an authenticated user.
 * Limits all queries, creations, updates, status changes, and deletions to the user's tasks.
 */
export async function executeAgentTool(
  toolName: string,
  args: unknown,
  userId: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case "list_tasks": {
        const parsed = listTasksSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for list_tasks",
              details: parsed.error.format(),
            },
          };
        }

        const filters = parsed.data;

        // Force assigneeId to be the authenticated user
        const result = await taskModel.findAll({
          ...filters,
          assigneeId: userId,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
          sortBy: filters.sortBy ?? "createdAt",
          sortOrder: filters.sortOrder ?? "desc",
        });

        return { success: true, data: result };
      }

      case "get_task": {
        const parsed = getTaskSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for get_task",
              details: parsed.error.format(),
            },
          };
        }

        const { id } = parsed.data;
        const task = await taskModel.findById(id);

        // Security check: must exist and assigneeId must match userId
        if (!task || task.assigneeId !== userId) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        return { success: true, data: task };
      }

      case "create_task": {
        const parsed = createTaskSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for create_task",
              details: parsed.error.format(),
            },
          };
        }

        const data = parsed.data;

        // Force assigneeId to be the authenticated user
        const task = await taskModel.create({
          title: data.title,
          description: data.description ?? "",
          priority: data.priority ?? "medium",
          tags: data.tags ?? [],
          dueDate: data.dueDate ?? null,
          assigneeId: userId,
        });

        return { success: true, data: task };
      }

      case "update_task": {
        const parsed = updateTaskSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for update_task",
              details: parsed.error.format(),
            },
          };
        }

        const { id, ...dto } = parsed.data;
        const existingTask = await taskModel.findById(id);

        // Security check: must exist and belong to the user
        if (!existingTask || existingTask.assigneeId !== userId) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        const updated = await taskModel.update(id, {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          tags: dto.tags,
          dueDate: dto.dueDate,
          // Do not allow changing assigneeId
        });

        if (!updated) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        return { success: true, data: updated };
      }

      case "change_task_status": {
        const parsed = changeTaskStatusSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for change_task_status",
              details: parsed.error.format(),
            },
          };
        }

        const { id, status } = parsed.data;
        const existingTask = await taskModel.findById(id);

        // Security check: must exist and belong to the user
        if (!existingTask || existingTask.assigneeId !== userId) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        // Validate state transition using shared domain function
        if (!isValidTransition(existingTask.status, status)) {
          return {
            success: false,
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: `Invalid status transition from ${existingTask.status} to ${status}`,
            },
          };
        }

        const updated = await taskModel.update(id, { status });
        if (!updated) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        return { success: true, data: updated };
      }

      case "delete_task": {
        const parsed = deleteTaskSchema.safeParse(args);
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid arguments for delete_task",
              details: parsed.error.format(),
            },
          };
        }

        const { id, confirmToken } = parsed.data;
        const existingTask = await taskModel.findById(id);

        // Security check: must exist and belong to the user
        if (!existingTask || existingTask.assigneeId !== userId) {
          return {
            success: false,
            error: {
              code: "TASK_NOT_FOUND",
              message: "Task not found",
            },
          };
        }

        // 1. If confirmToken is not passed, generate one and ask for confirmation
        if (!confirmToken) {
          const generatedToken = confirmationStore.createConfirmation(
            userId,
            id,
            "delete_task"
          );
          return {
            success: true,
            data: {
              status: "requires_confirmation",
              confirmToken: generatedToken,
              message: "This is a destructive action. Please confirm deletion using the provided token.",
            },
          };
        }

        // 2. If confirmToken is passed, validate and consume it
        const isConfirmed = confirmationStore.consumeConfirmation(
          confirmToken,
          userId,
          id,
          "delete_task"
        );

        if (!isConfirmed) {
          return {
            success: false,
            error: {
              code: "INVALID_CONFIRMATION_TOKEN",
              message: "The confirmation token is invalid, expired, or has already been used.",
            },
          };
        }

        const deleted = await taskModel.delete(id);
        if (!deleted) {
          return {
            success: false,
            error: {
              code: "DELETE_FAILED",
              message: "Failed to delete task",
            },
          };
        }

        return { success: true, data: { success: true, deletedId: id } };
      }

      default: {
        return {
          success: false,
          error: {
            code: "UNKNOWN_TOOL",
            message: `Tool ${toolName} is not recognized`,
          },
        };
      }
    }
  } catch (error: any) {
    // Prevent leak of internal DB or system details
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred while executing the tool",
      },
    };
  }
}
