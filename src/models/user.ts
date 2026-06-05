import { prisma } from "../config/prisma";
import type { User, CreateUserDto, UpdateUserDto, StoredUser } from "../types";

class UserModel {
  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? this.toPublicUser(user) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    return user ? this.toPublicUser(user) : undefined;
  }

  async findRecordByEmail(email: string): Promise<StoredUser | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    return user ? this.toStoredUser(user) : undefined;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.trim().toLowerCase(),
      },
    });
    return this.toPublicUser(user);
  }

  async createWithPasswordHash(dto: CreateUserDto & { passwordHash: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.trim().toLowerCase(),
        passwordHash: dto.passwordHash,
      },
    });
    return this.toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | undefined> {
    try {
      const data: Record<string, any> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();

      const user = await prisma.user.update({
        where: { id },
        data,
      });
      return this.toPublicUser(user);
    } catch (error) {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    // Delete dependencies (tasks) first due to foreign keys
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toStoredUser(user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): StoredUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const userModel = new UserModel();
