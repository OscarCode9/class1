import { randomUUID } from "node:crypto";

export interface Confirmation {
  token: string;
  userId: string;
  taskId: string;
  action: string;
  expiresAt: number;
}

export class ConfirmationStore {
  private store = new Map<string, Confirmation>();

  /**
   * Creates a confirmation token linked to a userId, taskId, and action, with an expiration.
   * Default TTL: 5 minutes (300,000 ms).
   */
  createConfirmation(
    userId: string,
    taskId: string,
    action: string,
    ttlMs: number = 300000
  ): string {
    const token = randomUUID();
    const expiresAt = Date.now() + ttlMs;

    this.store.set(token, {
      token,
      userId,
      taskId,
      action,
      expiresAt,
    });

    return token;
  }

  /**
   * Validates and consumes the token.
   * It is one-use: once verified (whether valid or invalid), it is removed from the store.
   */
  consumeConfirmation(
    token: string,
    userId: string,
    taskId: string,
    action: string
  ): boolean {
    const confirmation = this.store.get(token);
    if (!confirmation) {
      return false;
    }

    // Always remove from store to guarantee single-use, even if validation fails
    this.store.delete(token);

    // Validate links and expiration
    const isExpired = Date.now() > confirmation.expiresAt;
    const isUserMatch = confirmation.userId === userId;
    const isTaskMatch = confirmation.taskId === taskId;
    const isActionMatch = confirmation.action === action;

    return !isExpired && isUserMatch && isTaskMatch && isActionMatch;
  }

  /**
   * Helper to clean up all expired tokens.
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [token, confirmation] of this.store.entries()) {
      if (now > confirmation.expiresAt) {
        this.store.delete(token);
      }
    }
  }

  /**
   * Helper to check store size (mainly for testing).
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Helper to clear the store (mainly for testing).
   */
  clear(): void {
    this.store.clear();
  }
}

export const confirmationStore = new ConfirmationStore();
