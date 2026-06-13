import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../app";
import type { Server } from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DiagnosticResult {
  serverName: string;
  serverScript: string;
  status: "PASSED" | "FAILED";
  errors: string[];
  latencyStats: {
    action: string;
    durationMs: number;
    status: "OK" | "ERROR";
  }[];
  discoveredTools: string[];
  discoveredResources: string[];
  discoveredPrompts: string[];
}

// Helper: Measure execution duration
async function measure<T>(actionName: string, promise: Promise<T>, stats: DiagnosticResult["latencyStats"]): Promise<T> {
  const start = performance.now();
  try {
    const result = await promise;
    const duration = performance.now() - start;
    stats.push({ action: actionName, durationMs: Math.round(duration), status: "OK" });
    return result;
  } catch (err: any) {
    const duration = performance.now() - start;
    const isUnsupported = err.code === -32601 || err.message?.includes("Method not found");
    stats.push({
      action: actionName,
      durationMs: Math.round(duration),
      status: isUnsupported ? ("UNSUPPORTED" as any) : "ERROR",
    });
    throw err;
  }
}

async function runDiagnosticsForServer(
  serverName: string,
  serverScript: string,
  envVars: Record<string, string>,
  sampleCalls: {
    tools: { name: string; args: any }[];
    resources: string[];
    prompts: { name: string; args: any }[];
  }
): Promise<DiagnosticResult> {
  console.log(`\n==================================================`);
  console.log(`Running diagnostics for: ${serverName} (${serverScript})`);
  console.log(`==================================================`);

  const result: DiagnosticResult = {
    serverName,
    serverScript,
    status: "PASSED",
    errors: [],
    latencyStats: [],
    discoveredTools: [],
    discoveredResources: [],
    discoveredPrompts: [],
  };

  let transport: StdioClientTransport | null = null;
  let client: Client | null = null;

  try {
    // 1. Establish Stdio connection
    transport = new StdioClientTransport({
      command: "bun",
      args: [path.resolve(__dirname, "../../", serverScript)],
      env: {
        ...process.env,
        ...envVars,
      },
    });

    client = new Client(
      {
        name: `observability-client-${serverName}`,
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    console.log(`Connecting to server...`);
    await measure("connect", client.connect(transport), result.latencyStats);
    console.log(`[PASS] Connected successfully.`);

    // 2. Discover Tools
    console.log(`Listing tools...`);
    try {
      const toolsRes = await measure("listTools", client.listTools(), result.latencyStats);
      result.discoveredTools = toolsRes.tools.map((t) => t.name);
      console.log(`[PASS] Found ${result.discoveredTools.length} tools: ${result.discoveredTools.join(", ")}`);
    } catch (err: any) {
      if (err.code === -32601 || err.message?.includes("Method not found")) {
        console.log(`[INFO] Server does not implement/register tools capability.`);
      } else {
        console.error(`[FAIL] List tools failed: ${err.message}`);
        result.errors.push(`List tools error: ${err.message}`);
        result.status = "FAILED";
      }
    }

    // 3. Test Call Tools
    for (const toolCall of sampleCalls.tools) {
      if (result.discoveredTools.includes(toolCall.name)) {
        console.log(`Calling tool "${toolCall.name}" with args:`, JSON.stringify(toolCall.args));
        try {
          const res = await measure(
            `callTool:${toolCall.name}`,
            client.callTool({ name: toolCall.name, arguments: toolCall.args }),
            result.latencyStats
          );
          if (res.isError) {
            throw new Error(`Tool returned error: ${JSON.stringify(res.content)}`);
          }
          console.log(`[PASS] Tool "${toolCall.name}" call succeeded.`);
        } catch (err: any) {
          console.error(`[FAIL] Tool "${toolCall.name}" failed: ${err.message}`);
          result.errors.push(`Tool "${toolCall.name}" error: ${err.message}`);
          result.status = "FAILED";
        }
      } else {
        console.log(`[INFO] Skipping tool "${toolCall.name}" (not registered by server).`);
      }
    }

    // 4. Discover Resources
    console.log(`Listing resources...`);
    try {
      const resourcesRes = await measure("listResources", client.listResources(), result.latencyStats);
      result.discoveredResources = resourcesRes.resources.map((r) => r.uri);
      console.log(`[PASS] Found ${result.discoveredResources.length} resources: ${result.discoveredResources.join(", ")}`);
    } catch (err: any) {
      if (err.code === -32601 || err.message?.includes("Method not found")) {
        console.log(`[INFO] Server does not implement/register resources capability.`);
      } else {
        console.error(`[FAIL] List resources failed: ${err.message}`);
        result.errors.push(`List resources error: ${err.message}`);
        result.status = "FAILED";
      }
    }

    // 5. Test Read Resources
    for (const resourceUri of sampleCalls.resources) {
      if (result.discoveredResources.includes(resourceUri)) {
        console.log(`Reading resource "${resourceUri}"...`);
        try {
          const res = await measure(
            `readResource:${resourceUri}`,
            client.readResource({ uri: resourceUri }),
            result.latencyStats
          );
          if (!res.contents || res.contents.length === 0) {
            throw new Error(`Resource returned empty contents`);
          }
          console.log(`[PASS] Resource "${resourceUri}" read succeeded.`);
        } catch (err: any) {
          console.error(`[FAIL] Resource "${resourceUri}" failed: ${err.message}`);
          result.errors.push(`Resource "${resourceUri}" error: ${err.message}`);
          result.status = "FAILED";
        }
      } else {
        console.log(`[INFO] Skipping resource "${resourceUri}" (not registered by server).`);
      }
    }

    // 6. Discover Prompts
    console.log(`Listing prompts...`);
    try {
      const promptsRes = await measure("listPrompts", client.listPrompts(), result.latencyStats);
      result.discoveredPrompts = promptsRes.prompts.map((p) => p.name);
      console.log(`[PASS] Found ${result.discoveredPrompts.length} prompts: ${result.discoveredPrompts.join(", ")}`);
    } catch (err: any) {
      if (err.code === -32601 || err.message?.includes("Method not found")) {
        console.log(`[INFO] Server does not implement/register prompts capability.`);
      } else {
        console.error(`[FAIL] List prompts failed: ${err.message}`);
        result.errors.push(`List prompts error: ${err.message}`);
        result.status = "FAILED";
      }
    }

    // 7. Test Get Prompts
    for (const promptVal of sampleCalls.prompts) {
      if (result.discoveredPrompts.includes(promptVal.name)) {
        console.log(`Getting prompt "${promptVal.name}"...`);
        try {
          const res = await measure(
            `getPrompt:${promptVal.name}`,
            client.getPrompt({ name: promptVal.name, arguments: promptVal.args }),
            result.latencyStats
          );
          if (!res.messages || res.messages.length === 0) {
            throw new Error(`Prompt returned empty messages`);
          }
          console.log(`[PASS] Prompt "${promptVal.name}" retrieval succeeded.`);
        } catch (err: any) {
          console.error(`[FAIL] Prompt "${promptVal.name}" failed: ${err.message}`);
          result.errors.push(`Prompt "${promptVal.name}" error: ${err.message}`);
          result.status = "FAILED";
        }
      } else {
        console.log(`[INFO] Skipping prompt "${promptVal.name}" (not registered by server).`);
      }
    }

  } catch (err: any) {
    console.error(`[CRITICAL] Server execution error:`, err.message);
    result.errors.push(`Critical connection error: ${err.message}`);
    result.status = "FAILED";
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {}
    }
  }

  return result;
}

function generateMarkdownReport(results: DiagnosticResult[]): string {
  let md = `# MCP Server Self-Verification & Observability Report\n\n`;
  md += `This report was automatically generated by the MCP Observability Client to verify server health, capability discovery, and performance characteristics.\n\n`;
  md += `**Execution Time:** ${new Date().toISOString()}\n\n`;

  // 1. Overall Status Summary Card
  const allPassed = results.every((r) => r.status === "PASSED");
  md += `## Overall Verification Status\n\n`;
  if (allPassed) {
    md += `> [!NOTE]\n`;
    md += `> **STATUS: PASSED**\n`;
    md += `> All MCP Servers are fully functional, responsive, and all registered tools, resources, and prompts are operating correctly.\n\n`;
  } else {
    md += `> [!CAUTION]\n`;
    md += `> **STATUS: FAILED**\n`;
    md += `> Some MCP diagnostic checks failed or timed out. Please review the details below.\n\n`;
  }

  // 2. Summary Table
  md += `### Summary of Servers Checked\n\n`;
  md += `| Server Name | Script Path | Status | Tools | Resources | Prompts | Latency (Connect) |\n`;
  md += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;
  for (const r of results) {
    const connectStat = r.latencyStats.find((s) => s.action === "connect");
    const connectLatency = connectStat ? `${connectStat.durationMs}ms` : "N/A";
    const statusBadge = r.status === "PASSED" ? "🟢 PASSED" : "🔴 FAILED";
    md += `| **${r.serverName}** | \`${r.serverScript}\` | ${statusBadge} | ${r.discoveredTools.length} | ${r.discoveredResources.length} | ${r.discoveredPrompts.length} | ${connectLatency} |\n`;
  }
  md += `\n`;

  // 3. Detailed Results
  for (const r of results) {
    md += `## Detailed Diagnostics: ${r.serverName}\n\n`;
    md += `- **Script Path:** \`${r.serverScript}\`\n`;
    md += `- **Status:** ${r.status === "PASSED" ? "🟢 PASSED" : "🔴 FAILED"}\n\n`;

    if (r.errors.length > 0) {
      md += `### ❌ Errors Detected\n\n`;
      for (const err of r.errors) {
        md += `- ${err}\n`;
      }
      md += `\n`;
    }

    md += `### ⏱️ Latency & Execution Stats\n\n`;
    md += `| Action / Operation | Duration (ms) | Status |\n`;
    md += `| :--- | :---: | :--- |\n`;
    for (const stat of r.latencyStats) {
      const statusIcon = stat.status === "OK"
        ? "✅ OK"
        : stat.status === ("UNSUPPORTED" as any)
          ? "⚠️ UNSUPPORTED"
          : "❌ ERROR";
      md += `| \`${stat.action}\` | ${stat.durationMs}ms | ${statusIcon} |\n`;
    }
    md += `\n`;

    md += `### 🛠️ Discovered Capabilities\n\n`;
    md += `- **Discovered Tools:** ${r.discoveredTools.length > 0 ? r.discoveredTools.map((t) => `\`${t}\``).join(", ") : "_None_"}\n`;
    md += `- **Discovered Resources:** ${r.discoveredResources.length > 0 ? r.discoveredResources.map((res) => `\`${res}\``).join(", ") : "_None_"}\n`;
    md += `- **Discovered Prompts:** ${r.discoveredPrompts.length > 0 ? r.discoveredPrompts.map((p) => `\`${p}\``).join(", ") : "_None_"}\n`;
    md += `\n---\n\n`;
  }

  return md;
}

async function main() {
  const results: DiagnosticResult[] = [];

  // Spin up temporary Express API server to enable task manager tools/resources to resolve successfully
  console.log("Starting temporary Express API server...");
  const app = createApp();
  const apiServer = await new Promise<Server>((resolve) => {
    const startedServer = app.listen(0, "127.0.0.1", () => {
      resolve(startedServer);
    });
  });

  const address = apiServer.address();
  if (!address || typeof address === "string") {
    apiServer.close();
    throw new Error("Failed to resolve temporary API server address");
  }

  const tempApiUrl = `http://127.0.0.1:${address.port}/api/v1`;
  console.log(`Temporary API running at: ${tempApiUrl}`);

  try {
    // Run Task Manager MCP Server diagnostics
    const taskManagerResult = await runDiagnosticsForServer(
      "Task Manager Server",
      "src/mcp/index.ts",
      {
        API_URL: tempApiUrl,
      },
      {
        tools: [
          { name: "get_health", args: {} },
          { name: "list_users", args: {} },
        ],
        resources: ["health://status", "users://list"],
        prompts: [
          { name: "summarize-system", args: {} },
          { name: "ovents-users-info", args: {} },
        ],
      }
    );
    results.push(taskManagerResult);

    // Run Knowledge Base MCP Server diagnostics
    const testDbPath = "/tmp/observability-knowledge-test.db";
    // Pre-seed mock schema to ensure get_knowledge_stats works
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const db = new (await import("bun:sqlite")).Database(testDbPath);
    db.run("CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY, url TEXT UNIQUE, title TEXT, source_type TEXT, raw_content TEXT, word_count INTEGER, created_at DATETIME, updated_at DATETIME, tags TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS chunks (id INTEGER PRIMARY KEY, doc_id INTEGER, content TEXT, embedding BLOB, chunk_index INTEGER, token_count INTEGER, created_at DATETIME)");
    db.close();

    const knowledgeResult = await runDiagnosticsForServer(
      "Knowledge Base Server",
      "src/mcp/knowledge.ts",
      {
        KNOWLEDGE_DB_PATH: testDbPath,
        MOCK_EMBEDDINGS: "true",
      },
      {
        tools: [
          { name: "get_knowledge_stats", args: {} },
          { name: "list_knowledge_documents", args: {} },
        ],
        resources: [],
        prompts: [],
      }
    );
    results.push(knowledgeResult);

    // Clean up database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } finally {
    // Shutdown the temporary API server
    console.log("Shutting down temporary Express API server...");
    await new Promise<void>((resolve) => {
      apiServer.close(() => {
        resolve();
      });
    });
  }

  // Generate Report
  const mdReport = generateMarkdownReport(results);
  const reportPath = path.resolve(__dirname, "../../docs/mcp_observability.md");
  fs.writeFileSync(reportPath, mdReport, "utf-8");

  console.log(`\n==================================================`);
  console.log(`Observability diagnostics completed.`);
  console.log(`Report saved to: file://${reportPath}`);
  console.log(`==================================================\n`);

  const allPassed = results.every((r) => r.status === "PASSED");
  if (allPassed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Critical orchestrator failure:", err);
  process.exit(1);
});
