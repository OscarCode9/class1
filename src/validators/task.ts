import { AppError } from "../middleware/errorHandler";
import { TASK_PRIORITIES, TASK_STATUSES, type CreateTaskDto, type TaskPriority, type TaskStatus, type UpdateTaskDto } from "../types";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;
const TAG_PATTERN = /^[a-zA-Z0-9]+$/;

export function validateCreateTaskInput(input: unknown): CreateTaskDto {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be an object");
  }

  const {
    title,
    description,
    priority = "medium",
    tags = [],
    dueDate,
    assigneeId,
  } = input as Record<string, unknown>;

  if (typeof title !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Title is required");
  }

  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Title is required");
  }

  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    throw new AppError(400, "VALIDATION_ERROR", "Title must not exceed 200 characters");
  }

  if (description !== undefined && typeof description !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Description must be a string");
  }

  const normalizedDescription = description ?? "";
  if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw new AppError(400, "VALIDATION_ERROR", "Description must not exceed 2000 characters");
  }

  if (typeof priority !== "string" || !isTaskPriority(priority)) {
    throw new AppError(400, "VALIDATION_ERROR", "Priority must be one of: low, medium, high, critical");
  }

  if (!Array.isArray(tags)) {
    throw new AppError(400, "VALIDATION_ERROR", "Tags must be an array");
  }

  if (tags.length > MAX_TAGS) {
    throw new AppError(400, "VALIDATION_ERROR", "A task can have at most 10 tags");
  }

  const normalizedTags = tags.map((tag) => normalizeTag(tag));

  let normalizedDueDate: string | null = null;
  if (dueDate !== undefined && dueDate !== null) {
    if (typeof dueDate !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a valid ISO 8601 string");
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a valid ISO 8601 string");
    }

    if (parsedDueDate.getTime() <= Date.now()) {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a future date");
    }

    normalizedDueDate = parsedDueDate.toISOString();
  }

  let normalizedAssigneeId: string | null = null;
  if (assigneeId !== undefined && assigneeId !== null) {
    if (typeof assigneeId !== "string" || assigneeId.trim().length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Assignee ID must be a non-empty string");
    }

    normalizedAssigneeId = assigneeId.trim();
  }

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    priority,
    tags: normalizedTags,
    dueDate: normalizedDueDate,
    assigneeId: normalizedAssigneeId,
  };
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

function normalizeTag(tag: unknown): string {
  if (typeof tag !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Each tag must be a string");
  }

  const normalizedTag = tag.trim();

  if (normalizedTag.length === 0 || normalizedTag.length > MAX_TAG_LENGTH) {
    throw new AppError(400, "VALIDATION_ERROR", "Each tag must contain between 1 and 30 characters");
  }

  if (!TAG_PATTERN.test(normalizedTag)) {
    throw new AppError(400, "VALIDATION_ERROR", "Each tag must be alphanumeric");
  }

  return normalizedTag;
}

export function validateUpdateTaskInput(input: unknown): UpdateTaskDto {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be an object");
  }

  const result: UpdateTaskDto = {};
  const data = input as Record<string, unknown>;

  if (data.title !== undefined) {
    if (typeof data.title !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Title must be a string");
    }
    const normalizedTitle = data.title.trim();
    if (normalizedTitle.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Title cannot be empty");
    }
    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      throw new AppError(400, "VALIDATION_ERROR", "Title must not exceed 200 characters");
    }
    result.title = normalizedTitle;
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Description must be a string");
    }
    const normalizedDescription = data.description;
    if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      throw new AppError(400, "VALIDATION_ERROR", "Description must not exceed 2000 characters");
    }
    result.description = normalizedDescription;
  }

  if (data.status !== undefined) {
    if (typeof data.status !== "string" || !isTaskStatus(data.status)) {
      throw new AppError(400, "VALIDATION_ERROR", "Status must be one of: pending, in_progress, completed, cancelled");
    }
    result.status = data.status;
  }

  if (data.priority !== undefined) {
    if (typeof data.priority !== "string" || !isTaskPriority(data.priority)) {
      throw new AppError(400, "VALIDATION_ERROR", "Priority must be one of: low, medium, high, critical");
    }
    result.priority = data.priority;
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      throw new AppError(400, "VALIDATION_ERROR", "Tags must be an array");
    }
    if (data.tags.length > MAX_TAGS) {
      throw new AppError(400, "VALIDATION_ERROR", "A task can have at most 10 tags");
    }
    result.tags = data.tags.map((tag) => normalizeTag(tag));
  }

  if (data.dueDate !== undefined && data.dueDate !== null) {
    if (typeof data.dueDate !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a valid ISO 8601 string");
    }
    const parsedDueDate = new Date(data.dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a valid ISO 8601 string");
    }
    if (parsedDueDate.getTime() <= Date.now()) {
      throw new AppError(400, "VALIDATION_ERROR", "Due date must be a future date");
    }
    result.dueDate = parsedDueDate.toISOString();
  } else if (data.dueDate === null) {
    result.dueDate = null;
  }

  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    if (typeof data.assigneeId !== "string" || data.assigneeId.trim().length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Assignee ID must be a non-empty string");
    }
    result.assigneeId = data.assigneeId.trim();
  } else if (data.assigneeId === null) {
    result.assigneeId = null;
  }

  return result;
}

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

