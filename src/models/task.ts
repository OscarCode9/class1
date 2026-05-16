import { randomUUID } from "node:crypto";
import type { CreateTaskDto, Task } from "../types";

class TaskModel {
  private tasks: Map<string, Task> = new Map();

  create(dto: CreateTaskDto): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      status: "pending",
      priority: dto.priority,
      tags: dto.tags,
      dueDate: dto.dueDate,
      assigneeId: dto.assigneeId,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);

    return task;
  }
}

export const taskModel = new TaskModel();
