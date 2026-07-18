import { z } from "zod";

// Types/Values from domain schema
export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];

// Regular expression for tags: Unicode alphanumeric characters
const TAG_PATTERN = /^[\p{L}\p{N}]+$/u;

// Zod schemas for reusable sub-types
export const tagSchema = z.string()
  .min(1, "Each tag must contain at least 1 character")
  .max(30, "Each tag must not exceed 30 characters")
  .regex(TAG_PATTERN, "Each tag must be alphanumeric (letters and numbers only)");

export const futureDateTimeSchema = z.string()
  .datetime({ message: "Due date must be a valid ISO 8601 string" })
  .refine(
    (val) => new Date(val).getTime() > Date.now(),
    { message: "Due date must be a future date" }
  );

// Zod Schemas for the six approved tools
export const listTasksSchema = z.object({
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  tag: z.string().max(30).regex(TAG_PATTERN, "Tag must be alphanumeric").optional(),
  dueDateBefore: z.string().datetime({ message: "dueDateBefore must be a valid ISO 8601 string" }).optional(),
  dueDateAfter: z.string().datetime({ message: "dueDateAfter must be a valid ISO 8601 string" }).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority", "title"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const getTaskSchema = z.object({
  id: z.string().uuid("Task ID must be a valid UUID"),
});

export const createTaskSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must not exceed 200 characters"),
  description: z.string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),
  priority: z.enum(TASK_PRIORITIES).default("medium").optional(),
  tags: z.array(tagSchema)
    .max(10, "A task can have at most 10 tags")
    .optional(),
  dueDate: futureDateTimeSchema.nullable().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid("Task ID must be a valid UUID"),
  title: z.string()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters")
    .optional(),
  description: z.string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  tags: z.array(tagSchema)
    .max(10, "A task can have at most 10 tags")
    .optional(),
  dueDate: futureDateTimeSchema.nullable().optional(),
});

export const changeTaskStatusSchema = z.object({
  id: z.string().uuid("Task ID must be a valid UUID"),
  status: z.enum(TASK_STATUSES),
});

export const deleteTaskSchema = z.object({
  id: z.string().uuid("Task ID must be a valid UUID"),
  confirmToken: z.string().optional(),
});

// JSON Schemas generated for the LLM Provider
export const listTasksJsonSchema = {
  type: "object",
  properties: {
    page: {
      type: "integer",
      minimum: 1,
      default: 1,
      description: "Page number for pagination."
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
      description: "Max number of tasks to return per page."
    },
    status: {
      type: "string",
      enum: ["pending", "in_progress", "completed", "cancelled"],
      description: "Filter by task status."
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "Filter by task priority."
    },
    tag: {
      type: "string",
      maxLength: 30,
      pattern: "^[\\p{L}\\p{N}]+$",
      description: "Filter by tag (must be alphanumeric)."
    },
    dueDateBefore: {
      type: "string",
      format: "date-time",
      description: "Filter tasks with due date before or equal to this (ISO 8601)."
    },
    dueDateAfter: {
      type: "string",
      format: "date-time",
      description: "Filter tasks with due date after or equal to this (ISO 8601)."
    },
    search: {
      type: "string",
      description: "Search term matching title or description."
    },
    sortBy: {
      type: "string",
      enum: ["createdAt", "updatedAt", "dueDate", "priority", "title"],
      default: "createdAt",
      description: "Field to sort the tasks by."
    },
    sortOrder: {
      type: "string",
      enum: ["asc", "desc"],
      default: "desc",
      description: "Sorting direction."
    }
  },
  additionalProperties: false
};

export const getTaskJsonSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "The unique UUID identifier of the task."
    }
  },
  required: ["id"],
  additionalProperties: false
};

export const createTaskJsonSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description: "Descriptive title of the task."
    },
    description: {
      type: "string",
      maxLength: 2000,
      description: "Detailed description of the task."
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      description: "Priority level of the task."
    },
    tags: {
      type: "array",
      maxItems: 10,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 30,
        pattern: "^[\\p{L}\\p{N}]+$"
      },
      description: "Optional list of up to 10 alphanumeric tags."
    },
    dueDate: {
      type: ["string", "null"],
      format: "date-time",
      description: "Future due date (ISO 8601 string) or null."
    }
  },
  required: ["title"],
  additionalProperties: false
};

export const updateTaskJsonSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "The unique UUID identifier of the task to update."
    },
    title: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description: "Updated title of the task."
    },
    description: {
      type: "string",
      maxLength: 2000,
      description: "Updated description of the task."
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "Updated priority level of the task."
    },
    tags: {
      type: "array",
      maxItems: 10,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 30,
        pattern: "^[\\p{L}\\p{N}]+$"
      },
      description: "Updated list of up to 10 alphanumeric tags."
    },
    dueDate: {
      type: ["string", "null"],
      format: "date-time",
      description: "Updated future due date (ISO 8601 string) or null to remove."
    }
  },
  required: ["id"],
  additionalProperties: false
};

export const changeTaskStatusJsonSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "The unique UUID identifier of the task."
    },
    status: {
      type: "string",
      enum: ["pending", "in_progress", "completed", "cancelled"],
      description: "The target task status."
    }
  },
  required: ["id", "status"],
  additionalProperties: false
};

export const deleteTaskJsonSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "The unique UUID identifier of the task to delete."
    },
    confirmToken: {
      type: "string",
      description: "Confirmation token required to perform the deletion. Omit to generate a new token."
    }
  },
  required: ["id"],
  additionalProperties: false
};

// Unified tool definitions metadata
export const toolDefinitions = [
  {
    name: "list_tasks",
    description: "List, filter, and paginate tasks assigned to the authenticated user.",
    category: "READ" as const,
    requiresConfirmation: false,
    zodSchema: listTasksSchema,
    jsonSchema: listTasksJsonSchema,
  },
  {
    name: "get_task",
    description: "Get detailed information about a specific task assigned to the authenticated user.",
    category: "READ" as const,
    requiresConfirmation: false,
    zodSchema: getTaskSchema,
    jsonSchema: getTaskJsonSchema,
  },
  {
    name: "create_task",
    description: "Create a new task assigned to the authenticated user.",
    category: "WRITE" as const,
    requiresConfirmation: false,
    zodSchema: createTaskSchema,
    jsonSchema: createTaskJsonSchema,
  },
  {
    name: "update_task",
    description: "Update the details (title, description, priority, tags, dueDate) of an existing task assigned to the authenticated user.",
    category: "WRITE" as const,
    requiresConfirmation: false,
    zodSchema: updateTaskSchema,
    jsonSchema: updateTaskJsonSchema,
  },
  {
    name: "change_task_status",
    description: "Transition the status of a task assigned to the authenticated user, checking transition state machine rules.",
    category: "WRITE" as const,
    requiresConfirmation: false,
    zodSchema: changeTaskStatusSchema,
    jsonSchema: changeTaskStatusJsonSchema,
  },
  {
    name: "delete_task",
    description: "Permanently delete a task assigned to the authenticated user. This is a destructive, irreversible action.",
    category: "DANGER" as const,
    requiresConfirmation: true,
    zodSchema: deleteTaskSchema,
    jsonSchema: deleteTaskJsonSchema,
  },
];
