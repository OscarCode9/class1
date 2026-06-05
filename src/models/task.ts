import { prisma } from "../config/prisma";
import type { CreateTaskDto, Task, TaskStatus, TaskPriority } from "../types";

class TaskModel {
  async create(dto: CreateTaskDto): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: "pending",
        priority: dto.priority,
        tags: dto.tags,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
      },
    });

    return this.toTask(task);
  }

  private toTask(task: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    tags: string[];
    dueDate: Date | null;
    assigneeId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      tags: task.tags,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      assigneeId: task.assigneeId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}

export const taskModel = new TaskModel();
