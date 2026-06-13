import { test, expect } from "@playwright/test";

test.describe("Task Manager - End to End User Flow", () => {
  const uniqueId = Date.now();
  const testName = `User ${uniqueId}`;
  const testEmail = `e2e-${uniqueId}@example.com`;
  const testPassword = "Password123!"; // satisfying policy: 8+ chars, upper, lower, digit, symbol

  test("should register, login, create, update, transition, delete a task, and logout", async ({ page }) => {
    // 1. Visit Login Page and navigate to Register Page
    await page.goto("/");
    await expect(page).toHaveTitle(/Task Manager/i);
    await expect(page.getByRole("heading", { name: "Inicia Sesión", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Registrarse" }).click();
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();

    // 2. Register new user
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    
    // Click register button
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // The frontend should auto-login and redirect to Dashboard
    await expect(page.getByText("Task Manager")).toBeVisible();
    await expect(page.getByText(`Conectado como:`)).toBeVisible();
    await expect(page.getByText(testName)).toBeVisible();

    // 3. Create a new task
    await page.getByRole("button", { name: "Nueva Tarea" }).click();
    await expect(page.getByRole("heading", { name: "Crear Nueva Tarea" })).toBeVisible();

    const taskTitle = `Task E2E Test - ${uniqueId}`;
    const taskDescription = "This task was created by the Playwright E2E automation script.";
    const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16); // 1 day in the future

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill(taskTitle);
    await dialog.getByLabel("Descripción").fill(taskDescription);
    
    // Choose priority
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Alta" }).click();

    // Fill due date
    await dialog.getByLabel("Fecha límite").fill(taskDueDate);

    // Fill tags
    await dialog.getByLabel("Etiquetas (separadas por comas)").fill("e2e, testing, mcp");

    // Save
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog).not.toBeVisible();

    // Verify task card appears
    const taskCard = page.locator(".MuiCard-root", { hasText: taskTitle });
    await expect(taskCard).toBeVisible();
    await expect(taskCard.getByText("En Progreso")).not.toBeVisible();
    await expect(taskCard.getByText("Completada")).not.toBeVisible();

    // 4. Transition task: Pending -> In Progress
    // We target the play icon button inside the task card.
    await taskCard.locator('button[aria-label="Mover a En Progreso"]').click();

    // Verify task is now "En Progreso"
    await expect(taskCard.getByText("En Progreso")).toBeVisible();

    // 5. Transition task: In Progress -> Completed
    await taskCard.locator('button[aria-label="Mover a Completada"]').click();

    // Verify status is completed
    await expect(taskCard.getByText("Completada")).toBeVisible();

    // 6. Edit task details
    await taskCard.locator('button[aria-label="Editar tarea"]').click();
    await expect(page.getByRole("heading", { name: "Editar Tarea" })).toBeVisible();

    const editDialog = page.getByRole("dialog");
    const updatedDescription = "This task has been updated by the E2E script.";
    await editDialog.getByLabel("Descripción").fill(updatedDescription);
    await editDialog.getByRole("button", { name: "Guardar" }).click();
    await expect(editDialog).not.toBeVisible();

    // Verify updated description is visible
    await expect(taskCard.getByText(updatedDescription)).toBeVisible();

    // 7. Delete task
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("deseas eliminar esta tarea");
      await dialog.accept();
    });
    await taskCard.locator('button[aria-label="Eliminar tarea"]').click();

    // Verify task is removed
    await expect(page.getByText(taskTitle)).not.toBeVisible();

    // 8. Logout
    await page.getByRole("button", { name: "Cerrar Sesión" }).click();

    // Verify user is redirected back to Login screen
    await expect(page.getByRole("heading", { name: "Inicia Sesión", exact: true })).toBeVisible();
  });
});
