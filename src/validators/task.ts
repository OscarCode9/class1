import { AppError } from "../middleware/errorHandler";
import { TASK_PRIORITIES, type CreateTaskDto, type TaskPriority } from "../types";

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
