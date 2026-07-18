import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import { ApiClient } from "./client.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Initialize the API client
const apiClient = new ApiClient();

// Create the MCP server
const server = new McpServer({
  name: "task-manager-mcp-server",
  version: "1.0.0",
});

// ==========================================
// 1. RESOURCES
// ==========================================

// System Health Resource
server.registerResource(
  "system-health",
  "health://status",
  { title: "System Health" },
  async (uri) => {
    try {
      const health = await apiClient.getHealth();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(health, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to load health status resource: ${error.message}`);
    }
  }
);

// Users List Resource
server.registerResource(
  "users-list",
  "users://list",
  { title: "Users List" },
  async (uri) => {
    try {
      const users = await apiClient.listUsers();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(users, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to load users resource: ${error.message}`);
    }
  }
);

// Individual User Details Resource
server.registerResource(
  "user-details",
  new ResourceTemplate("users://{id}", { list: undefined }),
  { title: "User Details" },
  async (uri, variables) => {
    try {
      const id = variables.id;
      if (!id || id === "list") {
        throw new Error("Invalid user ID");
      }
      const user = await apiClient.getUser(id as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to load details for user: ${error.message}`);
    }
  }
);

// ==========================================
// 2. TOOLS
// ==========================================

// Get Health Tool
server.registerTool(
  "get_health",
  {
    description: "Get the system health status",
  },
  async () => {
    try {
      const health = await apiClient.getHealth();
      return {
        content: [
          {
            type: "text",
            text: `System Health Status: ${JSON.stringify(health, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching health: ${error.message}` }],
      };
    }
  }
);

// List Users Tool
server.registerTool(
  "list_users",
  {
    description: "List all registered users",
  },
  async () => {
    try {
      const users = await apiClient.listUsers();
      return {
        content: [
          {
            type: "text",
            text: `Registered Users:\n${JSON.stringify(users, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing users: ${error.message}` }],
      };
    }
  }
);

// Get User Tool
server.registerTool(
  "get_user",
  {
    description: "Retrieve details of a user by their UUID",
    inputSchema: { id: z.string().describe("UUID of the user to retrieve") },
  },
  async ({ id }) => {
    try {
      const user = await apiClient.getUser(id);
      return {
        content: [
          {
            type: "text",
            text: `User details:\n${JSON.stringify(user, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching user details: ${error.message}` }],
      };
    }
  }
);

// Create User Tool
server.registerTool(
  "create_user",
  {
    description: "Create a new user with a name and unique email",
    inputSchema: {
      name: z.string().min(1).max(100).describe("Name of the user"),
      email: z.string().email().describe("Valid email address of the user"),
    },
  },
  async ({ name, email }) => {
    try {
      const user = await apiClient.createUser({ name, email });
      return {
        content: [
          {
            type: "text",
            text: `User created successfully:\n${JSON.stringify(user, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating user: ${error.message}` }],
      };
    }
  }
);

// Update User Tool
server.registerTool(
  "update_user",
  {
    description: "Update details of an existing user",
    inputSchema: {
      id: z.string().describe("UUID of the user to update"),
      name: z.string().min(1).max(100).optional().describe("New name for the user"),
      email: z.string().email().optional().describe("New email address for the user"),
    },
  },
  async ({ id, name, email }) => {
    try {
      const user = await apiClient.updateUser(id, { name, email });
      return {
        content: [
          {
            type: "text",
            text: `User updated successfully:\n${JSON.stringify(user, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating user: ${error.message}` }],
      };
    }
  }
);

// Delete User Tool
server.registerTool(
  "delete_user",
  {
    description: "Delete an existing user by their UUID",
    inputSchema: { id: z.string().describe("UUID of the user to delete") },
  },
  async ({ id }) => {
    try {
      await apiClient.deleteUser(id);
      return {
        content: [
          {
            type: "text",
            text: `User with ID ${id} deleted successfully.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting user: ${error.message}` }],
      };
    }
  }
);

// Register User Tool
server.registerTool(
  "register_user",
  {
    description: "Register a new user with a password, complying with security policies",
    inputSchema: {
      name: z.string().min(1).max(100).describe("Name of the user"),
      email: z.string().email().describe("Valid email address"),
      password: z
        .string()
        .min(8)
        .describe(
          "Secure password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol)"
        ),
    },
  },
  async ({ name, email, password }) => {
    try {
      const response = await apiClient.registerUser({ name, email, password });
      return {
        content: [
          {
            type: "text",
            text: `User registered successfully:\n${JSON.stringify(response, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error registering user: ${error.message}` }],
      };
    }
  }
);

// Create Task Tool
server.registerTool(
  "create_task",
  {
    description: "Create a new task with status, priority, tags, due date, and assignee",
    inputSchema: {
      title: z.string().min(1).max(200).describe("Title of the task"),
      description: z.string().max(2000).optional().describe("Detailed description of the task"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .default("medium")
        .describe("Task urgency level"),
      tags: z
        .array(z.string().min(1).max(30).regex(/^[a-zA-Z0-9]+$/))
        .max(10)
        .optional()
        .describe("Alphanumeric tags for grouping (max 10, max 30 chars each)"),
      dueDate: z
        .string()
        .optional()
        .describe("ISO 8601 future date string (e.g., '2026-12-31T23:59:59Z')"),
      assigneeId: z
        .string()
        .optional()
        .describe("UUID of the user assigned to this task"),
    },
  },
  async ({ title, description, priority, tags, dueDate, assigneeId }) => {
    try {
      const task = await apiClient.createTask({
        title,
        description: description ?? "",
        priority: priority ?? "medium",
        tags: tags ?? [],
        dueDate: dueDate ?? null,
        assigneeId: assigneeId ?? null,
      });
      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating task: ${error.message}` }],
      };
    }
  }
);

// ==========================================
// 3. PROMPTS
// ==========================================

// Summarize System Prompt
server.registerPrompt(
  "summarize-system",
  {
    description: "Summarize the system status and registered users",
  },
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Please check the API health status and load the user list using the available tools/resources. Then, provide a concise summary of the system state, uptime, and the total number of registered users.",
        },
      },
    ],
  })
);

// Create Assigned Task Prompt
server.registerPrompt(
  "create-assigned-task",
  {
    description: "Prompt guide to register a new user and assign a new task to them in one flow",
    argsSchema: {
      name: z.string().describe("The name of the user to create"),
      email: z.string().describe("The email address of the user to create"),
      taskTitle: z.string().describe("The title of the task to assign"),
      taskPriority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .default("medium")
        .describe("Task priority level"),
    },
  },
  ({ name, email, taskTitle, taskPriority }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I want to create a new user named "${name}" with the email "${email}". Then, I want to create a task titled "${taskTitle}" with priority "${taskPriority}" and assign it directly to the new user. Please assist me step-by-step using the tools at your disposal.`,
        },
      },
    ],
  })
);

// Ovents AI Assistant Prompt
server.registerPrompt(
  "ovents-users-info",
  {
    description: "Retrieve user information with a friendly welcome from the Ovents AI assistant",
  },
  async () => {
    try {
      const users = await apiClient.listUsers();
      const usersText = JSON.stringify(users, null, 2);
      
      const dirname = fileURLToPath(new URL(".", import.meta.url));
      const skillPath = join(dirname, "ovents-skill.md");
      const skillInstructions = readFileSync(skillPath, "utf-8");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${skillInstructions}\n\n### Datos de Usuarios en Tiempo Real:\n${usersText}`,
            },
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to load users for Ovents AI assistant prompt: ${error.message}`);
    }
  }
);

// ==========================================
// 4. TRANSPORT AND SERVER BOOT
// ==========================================

async function run() {
  const useSse = process.argv.includes("--sse") || process.env.USE_SSE === "true";

  if (useSse) {
    const app = express();
    app.use(express.json());

    const transports: Record<string, SSEServerTransport> = {};

    // Health check endpoint for ALB target group
    app.get("/health", (_req, res) => {
      res.status(200).send("OK");
    });

    app.get("/sse", async (_req, res) => {
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;

      res.on("close", () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];

      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("No transport found for this session");
      }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.error(`Task Manager MCP Server running on SSE at http://localhost:${PORT}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Task Manager MCP Server running on stdio transport");
  }
}

run().catch((error) => {
  console.error("Fatal error running MCP Server:", error);
  process.exit(1);
});
