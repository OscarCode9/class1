import type { TaskStatus } from "../types";

/**
 * Validates if a transition from one task status to another is permitted.
 * Rules:
 * - Same status: always allowed.
 * - pending -> in_progress or cancelled.
 * - in_progress -> completed or cancelled.
 * - completed -> cancelled.
 * - cancelled -> none.
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  if (from === "pending") {
    return to === "in_progress" || to === "cancelled";
  }
  if (from === "in_progress") {
    return to === "completed" || to === "cancelled";
  }
  if (from === "completed") {
    return to === "cancelled";
  }
  return false;
}
