import { describe, expect, test as bunTest, beforeAll, afterAll, beforeEach } from "bun:test";
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const hasDocker = (() => {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const test = hasDocker ? bunTest : bunTest.skip;

describe("MCP Server Docker Integration Tests", () => {
  let transport: StdioClientTransport;
  let mcpClient: Client;

  beforeAll(async () => {
    if (!hasDocker) return;
    // Connect to the already running dockerized REST API inside the docker network
    const baseUrl = "http://class1-api:3000/api/v1";

    // Initialize MCP client & transport using docker run
    transport = new StdioClientTransport({
      command: "docker",
      args: [
        "run",
        "-i",
        "--rm",
        "--network",
        "class1_app-network",
        "-e",
        `API_URL=${baseUrl}`,
        "class1-mcp:latest",
      ],
    });

    mcpClient = new Client(
      {
        name: "test-integration-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await mcpClient.connect(transport);
  });

  afterAll(async () => {
    if (!hasDocker) return;
    // Close MCP Client and Transport
    await mcpClient.close();
  });

  beforeEach(async () => {
    if (!hasDocker) return;
    execSync("docker exec class1-api bunx prisma db push --force-reset", { stdio: "ignore" });
  });

  test("should list all available tools", async () => {
    const response = await mcpClient.listTools();
    const toolNames = response.tools.map((t) => t.name);

    expect(toolNames).toContain("get_health");
    expect(toolNames).toContain("list_users");
    expect(toolNames).toContain("get_user");
    expect(toolNames).toContain("create_user");
    expect(toolNames).toContain("update_user");
    expect(toolNames).toContain("delete_user");
    expect(toolNames).toContain("register_user");
    expect(toolNames).toContain("create_task");
  });

  test("should list all available resources", async () => {
    const response = await mcpClient.listResources();
    const resourceUris = response.resources.map((r) => r.uri);

    expect(resourceUris).toContain("health://status");
    expect(resourceUris).toContain("users://list");
  });

  test("should list all available prompts", async () => {
    const response = await mcpClient.listPrompts();
    const promptNames = response.prompts.map((p) => p.name);

    expect(promptNames).toContain("summarize-system");
    expect(promptNames).toContain("create-assigned-task");
    expect(promptNames).toContain("ovents-users-info");
  });

  test("get_health tool returns api system health", async () => {
    const result = await mcpClient.callTool({
      name: "get_health",
      arguments: {},
    }) as any;

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("healthy");
  });

  test("user management flow via MCP tools (register, get, list, update, delete)", async () => {
    // 1. Register a user using register_user tool
    const registerResult = await mcpClient.callTool({
      name: "register_user",
      arguments: {
        name: "Test User",
        email: "testuser@example.com",
        password: "Password123!",
      },
    }) as any;

    expect(registerResult.isError).toBeUndefined();
    expect(registerResult.content[0]?.text).toContain("User registered successfully");

    // Extract user ID from output
    const jsonMatch = registerResult.content[0]?.text.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const registeredData = JSON.parse(jsonMatch![0]);
    const userId = registeredData.user.id;
    expect(userId).toBeString();

    // 2. Get the registered user details using get_user tool
    const getResult = await mcpClient.callTool({
      name: "get_user",
      arguments: { id: userId },
    }) as any;
    expect(getResult.isError).toBeUndefined();
    expect(getResult.content[0]?.text).toContain("testuser@example.com");

    // 3. List all users using list_users tool
    const listResult = await mcpClient.callTool({
      name: "list_users",
      arguments: {},
    }) as any;
    expect(listResult.isError).toBeUndefined();
    expect(listResult.content[0]?.text).toContain("Test User");

    // 4. Update the user using update_user tool
    const updateResult = await mcpClient.callTool({
      name: "update_user",
      arguments: {
        id: userId,
        name: "Updated Test User",
      },
    }) as any;
    expect(updateResult.isError).toBeUndefined();
    expect(updateResult.content[0]?.text).toContain("Updated Test User");

    // 5. Delete the user using delete_user tool
    const deleteResult = await mcpClient.callTool({
      name: "delete_user",
      arguments: { id: userId },
    }) as any;
    expect(deleteResult.isError).toBeUndefined();
    expect(deleteResult.content[0]?.text).toContain("deleted successfully");

    // Verify user is gone
    const checkListResult = await mcpClient.callTool({
      name: "list_users",
      arguments: {},
    }) as any;
    expect(checkListResult.content[0]?.text).toContain("[]");
  });

  test("create_task tool creates a new task", async () => {
    // Create a user first so we can assign the task
    const userResult = await mcpClient.callTool({
      name: "create_user",
      arguments: {
        name: "Task Owner",
        email: "owner@example.com",
      },
    }) as any;
    const jsonMatch = userResult.content[0]?.text.match(/\{[\s\S]*\}/);
    const user = JSON.parse(jsonMatch![0]);
    const ownerId = user.id;

    // Create a task assigned to that user
    const taskResult = await mcpClient.callTool({
      name: "create_task",
      arguments: {
        title: "Integration Task",
        description: "Test task creation via MCP integration tests",
        priority: "high",
        tags: ["test", "mcp"],
        assigneeId: ownerId,
      },
    }) as any;

    expect(taskResult.isError).toBeUndefined();
    expect(taskResult.content[0]?.text).toContain("Task created successfully");
    expect(taskResult.content[0]?.text).toContain("Integration Task");
    expect(taskResult.content[0]?.text).toContain("high");
  });

  test("read resource system-health returns valid json status", async () => {
    const resourceResult = await mcpClient.readResource({
      uri: "health://status",
    });

    expect(resourceResult.contents).toBeDefined();
    expect(resourceResult.contents).toHaveLength(1);
    
    const content = resourceResult.contents[0] as any;
    expect(content.uri).toBe("health://status");
    expect(content.mimeType).toBe("application/json");
    
    const statusData = JSON.parse(content.text);
    expect(statusData.status).toBe("healthy");
  });

  test("read resource users-list returns users array", async () => {
    // Create a user
    await mcpClient.callTool({
      name: "create_user",
      arguments: {
        name: "Resource User",
        email: "resuser@example.com",
      },
    });

    const resourceResult = await mcpClient.readResource({
      uri: "users://list",
    });

    expect(resourceResult.contents).toBeDefined();
    expect(resourceResult.contents).toHaveLength(1);
    
    const content = resourceResult.contents[0] as any;
    const usersData = JSON.parse(content.text);
    expect(usersData).toBeArray();
    expect(usersData[0].name).toBe("Resource User");
  });

  test("resolve prompts returns correct system messages", async () => {
    const promptResult = await mcpClient.getPrompt({
      name: "summarize-system",
      arguments: {},
    }) as any;

    expect(promptResult.messages).toHaveLength(1);
    expect(promptResult.messages[0].role).toBe("user");
    expect(promptResult.messages[0].content.type).toBe("text");
    expect(promptResult.messages[0].content.text).toContain("Please check the API health status");
  });

  test("resolve prompt ovents-users-info returns friendly assistant message with users", async () => {
    // Create a user first so we have someone in the list
    await mcpClient.callTool({
      name: "create_user",
      arguments: {
        name: "Ovents Guest",
        email: "guest@ovents.com",
      },
    });

    const promptResult = await mcpClient.getPrompt({
      name: "ovents-users-info",
      arguments: {},
    }) as any;

    expect(promptResult.messages).toHaveLength(1);
    expect(promptResult.messages[0].role).toBe("user");
    expect(promptResult.messages[0].content.text).toContain("Asistente de IA de la Empresa Ovents");
    expect(promptResult.messages[0].content.text).toContain("Ovents Guest");
  });
});
