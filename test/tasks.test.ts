import { describe, expect, test } from "bun:test";
import { validateCreateTaskInput } from "../src/validators/task";

describe("validateCreateTaskInput", () => {
  test("applies defaults and normalizes valid input", () => {
    const dueDate = new Date(Date.now() + 60_000).toISOString();

    expect(
      validateCreateTaskInput({
        title: "  Ship release  ",
        tags: ["  urgent  ", "backend"],
        dueDate,
      }),
    ).toEqual({
      title: "Ship release",
      description: "",
      priority: "medium",
      tags: ["urgent", "backend"],
      dueDate,
      assigneeId: null,
    });
  });

  test("accepts alphanumeric tags with Spanish letters", () => {
    expect(
      validateCreateTaskInput({
        title: "Diseñar flujo",
        tags: ["diseño1", "año2026"],
      }).tags,
    ).toEqual(["diseño1", "año2026"]);
  });

  test("rejects a non-future due date", () => {
    expect(() =>
      validateCreateTaskInput({
        title: "Past due date",
        dueDate: "2020-01-01T00:00:00.000Z",
      }),
    ).toThrow("Due date must be a future date");
  });

  test("rejects an invalid priority", () => {
    expect(() =>
      validateCreateTaskInput({
        title: "Invalid priority",
        priority: "urgent",
      }),
    ).toThrow("Priority must be one of: low, medium, high, critical");
  });
});
