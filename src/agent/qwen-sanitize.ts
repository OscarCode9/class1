import type { IChatMessage } from "./ai-provider";

/** Soft trim for normal Qwen calls */
const SOFT_MAX = 2500;
/** Hard trim after data_inspection_failed */
const HARD_MAX = 600;
const SOFT_TURNS = 16;
const HARD_TURNS = 4;

/**
 * Reduce content that commonly trips DashScope data_inspection_failed
 * (long notes, HTML/scripts, noisy histories).
 */
export function sanitizeMessagesForQwen(
  messages: IChatMessage[],
  aggressive = false
): IChatMessage[] {
  const maxLen = aggressive ? HARD_MAX : SOFT_MAX;
  const maxTurns = aggressive ? HARD_TURNS : SOFT_TURNS;

  const system = messages.filter((m) => m.role === "system");
  let rest = messages.filter((m) => m.role !== "system");
  if (rest.length > maxTurns) {
    rest = rest.slice(-maxTurns);
  }

  return [...system.slice(0, 1), ...rest].map((m) => ({
    ...m,
    content: sanitizeContent(m.content ?? "", maxLen),
  }));
}

export function isQwenInspectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("data_inspection_failed") ||
    msg.includes("inappropriate content") ||
    msg.includes("DataInspectionFailed")
  );
}

function sanitizeContent(content: string, maxLen: number): string {
  let c = content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(password|passwd|api[_-]?key|secret|token)\b/gi, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();

  if (c.length > maxLen) {
    c = `${c.slice(0, maxLen)} …[truncated]`;
  }
  return c;
}
