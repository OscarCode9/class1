import { prisma } from "../config/prisma";
import type { CreateTaskDto, UpdateTaskDto, Task, TaskStatus, TaskPriority } from "../types";

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

  async findById(id: string): Promise<Task | undefined> {
    const task = await prisma.task.findUnique({
      where: { id },
    });
    return task ? this.toTask(task) : undefined;
  }

  async findAll(filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    tag?: string;
    assigneeId?: string | null;
    dueDateBefore?: string;
    dueDateAfter?: string;
    search?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }): Promise<{ data: Task[]; total: number }> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.assigneeId !== undefined) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.tag) {
      where.tags = {
        has: filters.tag,
      };
    }

    if (filters.dueDateBefore || filters.dueDateAfter) {
      where.dueDate = {};
      if (filters.dueDateBefore) {
        where.dueDate.lte = new Date(filters.dueDateBefore);
      }
      if (filters.dueDateAfter) {
        where.dueDate.gte = new Date(filters.dueDateAfter);
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.task.count({ where });

    const orderBy: any = {};
    orderBy[filters.sortBy] = filters.sortOrder;

    const skip = (filters.page - 1) * filters.limit;

    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      skip,
      take: filters.limit,
    });

    return {
      data: tasks.map((t) => this.toTask(t)),
      total,
    };
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task | undefined> {
    try {
      const data: any = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.tags !== undefined) data.tags = dto.tags;
      if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;

      const task = await prisma.task.update({
        where: { id },
        data,
      });

      return this.toTask(task);
    } catch (error) {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.task.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
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
