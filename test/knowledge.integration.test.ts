import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Database } from "bun:sqlite";
import * as fs from "fs";
import { consolidateSessionMemory } from "../src/mcp/consolidate";

const TEST_DB_PATH = "/tmp/knowledge-test.db";

// Helper: Initialize test database schema
function initTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = new Database(TEST_DB_PATH);

  // Create tables
  db.run(`
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT,
      source_type TEXT CHECK(source_type IN ('article', 'tweet', 'video', 'pdf', 'other')),
      raw_content TEXT,
      word_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tags TEXT
    )
  `);

  db.run(`
    CREATE TABLE chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      embedding BLOB,
      chunk_index INTEGER NOT NULL,
      token_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run("CREATE INDEX idx_documents_url ON documents(url)");
  db.run("CREATE INDEX idx_documents_source_type ON documents(source_type)");
  db.run("CREATE INDEX idx_documents_created_at ON documents(created_at)");
  db.run("CREATE INDEX idx_chunks_doc_id ON chunks(doc_id)");

  // Create virtual FTS5 table and triggers
  db.run("CREATE VIRTUAL TABLE chunks_fts USING fts5(content, content='chunks', content_rowid='id')");

  db.run(`
    CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
      INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
    END
  `);

  db.run(`
    CREATE TRIGGER chunks_ad AFTER DELETE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
    END
  `);

  db.run(`
    CREATE TRIGGER chunks_au AFTER UPDATE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
    END
  `);

  db.close();
}

describe("Knowledge Base MCP Server Integration Tests", () => {
  let transport: StdioClientTransport;
  let mcpClient: Client;

  beforeAll(async () => {
    // 1. Initialize clean test DB schema
    initTestDb();

    // 2. Spawn MCP Server subprocess communicating via stdio
    transport = new StdioClientTransport({
      command: "bun",
      args: ["src/mcp/knowledge.ts"],
      env: {
        ...process.env,
        KNOWLEDGE_DB_PATH: TEST_DB_PATH,
        MOCK_EMBEDDINGS: "true",
      },
    });

    mcpClient = new Client(
      {
        name: "test-kb-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await mcpClient.connect(transport);
  });

  afterAll(async () => {
    // Close MCP Client and Transport
    await mcpClient.close();

    // Clean up test database file
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("should list all available tools on the knowledge base server", async () => {
    const response = await mcpClient.listTools();
    const toolNames = response.tools.map((t) => t.name);

    expect(toolNames).toContain("ingest_knowledge_document");
    expect(toolNames).toContain("delete_knowledge_document");
    expect(toolNames).toContain("update_knowledge_document");
    expect(toolNames).toContain("search_knowledge");
    expect(toolNames).toContain("list_knowledge_documents");
    expect(toolNames).toContain("get_knowledge_stats");
  });

  test("should start with empty statistics", async () => {
    const response = (await mcpClient.callTool({
      name: "get_knowledge_stats",
      arguments: {},
    })) as any;

    expect(response.isError).toBeUndefined();
    const stats = JSON.parse(response.content[0].text);
    expect(stats.totalDocuments).toBe(0);
    expect(stats.totalChunks).toBe(0);
  });

  test("should ingest a document and generate chunks + embeddings", async () => {
    const response = (await mcpClient.callTool({
      name: "ingest_knowledge_document",
      arguments: {
        url: "https://example.com/ai-agents-spec",
        title: "Introduction to AI Agents",
        sourceType: "article",
        tags: ["ai", "agents", "mcp"],
        rawContent: "Artificial intelligence agents are autonomous systems capable of executing complex tasks. These agents can use tools and make decisions based on context. Model Context Protocol allows them to connect to external systems.",
      },
    })) as any;

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.success).toBe(true);
    expect(result.title).toBe("Introduction to AI Agents");
    expect(result.chunksCreated).toBeGreaterThan(0);

    // Verify stats updated
    const statsResponse = (await mcpClient.callTool({
      name: "get_knowledge_stats",
      arguments: {},
    })) as any;
    const stats = JSON.parse(statsResponse.content[0].text);
    expect(stats.totalDocuments).toBe(1);
    expect(stats.totalChunks).toBe(result.chunksCreated);
  });

  test("should list ingested documents", async () => {
    const response = (await mcpClient.callTool({
      name: "list_knowledge_documents",
      arguments: {
        limit: 5,
      },
    })) as any;

    expect(response.isError).toBeUndefined();
    const docs = JSON.parse(response.content[0].text);
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe("Introduction to AI Agents");
    expect(docs[0].url).toBe("https://example.com/ai-agents-spec");
    expect(docs[0].sourceType).toBe("article");
  });

  test("should perform semantic search successfully", async () => {
    const response = (await mcpClient.callTool({
      name: "search_knowledge",
      arguments: {
        query: "What is Model Context Protocol?",
        mode: "semantic",
        limit: 3,
      },
    })) as any;

    expect(response.isError).toBeUndefined();
    const results = JSON.parse(response.content[0].text);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Introduction to AI Agents");
    expect(results[0].similarityScore).toBeGreaterThan(0.2); // Semantic threshold
  });

  test("should perform keyword search via FTS5 successfully", async () => {
    const response = (await mcpClient.callTool({
      name: "search_knowledge",
      arguments: {
        query: "Protocol",
        mode: "keyword",
      },
    })) as any;

    expect(response.isError).toBeUndefined();
    const results = JSON.parse(response.content[0].text);
    expect(results).toHaveLength(1);
    expect(results[0].excerpt).toContain("Protocol");
  });

  test("should perform hybrid search successfully", async () => {
    const response = (await mcpClient.callTool({
      name: "search_knowledge",
      arguments: {
        query: "autonomous agents",
        mode: "hybrid",
      },
    })) as any;

    expect(response.isError).toBeUndefined();
    const results = JSON.parse(response.content[0].text);
    expect(results).toHaveLength(1);
  });

  test("should update document content and regenerate embeddings", async () => {
    // Get document list to find ID
    const listRes = (await mcpClient.callTool({
      name: "list_knowledge_documents",
      arguments: {},
    })) as any;
    const docs = JSON.parse(listRes.content[0].text);
    const docId = docs[0].id;

    // Update document title and change content to Quantum Computing
    const updateRes = (await mcpClient.callTool({
      name: "update_knowledge_document",
      arguments: {
        id: docId,
        title: "Quantum Computing Basics",
        rawContent: "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers.",
      },
    })) as any;

    if (updateRes.isError) {
      console.error("Update Document failed with content:", JSON.stringify(updateRes.content));
    }
    expect(updateRes.isError).toBeUndefined();
    const updateResult = JSON.parse(updateRes.content[0].text);
    expect(updateResult.success).toBe(true);
    expect(updateResult.chunksRegenerated).toBe(true);

    // Verify search matches new content and does NOT match old content
    const searchNew = (await mcpClient.callTool({
      name: "search_knowledge",
      arguments: {
        query: "quantum mechanics",
        mode: "semantic",
      },
    })) as any;
    const resultsNew = JSON.parse(searchNew.content[0].text);
    expect(resultsNew).toHaveLength(1);
    expect(resultsNew[0].title).toBe("Quantum Computing Basics");

    const searchOld = (await mcpClient.callTool({
      name: "search_knowledge",
      arguments: {
        query: "Model Context Protocol",
        mode: "semantic",
      },
    })) as any;
    const resultsOld = JSON.parse(searchOld.content[0].text);
    // Score should be very low or it shouldn't contain the protocol term
    if (resultsOld.length > 0) {
      expect(resultsOld[0].excerpt).not.toContain("Model Context Protocol");
    }
  });

  test("should delete a document and clean up chunks", async () => {
    // Get document list to find ID
    const listRes = (await mcpClient.callTool({
      name: "list_knowledge_documents",
      arguments: {},
    })) as any;
    const docs = JSON.parse(listRes.content[0].text);
    const docId = docs[0].id;

    // Query DB before delete
    const dbCheck = new Database(TEST_DB_PATH);
    const docsBefore = dbCheck.prepare("SELECT * FROM documents").all();
    console.log("DB documents before delete:", JSON.stringify(docsBefore));
    dbCheck.close();

    // Delete
    const deleteRes = (await mcpClient.callTool({
      name: "delete_knowledge_document",
      arguments: {
        id: docId,
      },
    })) as any;

    if (deleteRes.isError) {
      console.error("Delete Document failed with content:", JSON.stringify(deleteRes.content));
    }
    expect(deleteRes.isError).toBeUndefined();
    const deleteResult = JSON.parse(deleteRes.content[0].text);
    console.log("Delete Document response:", JSON.stringify(deleteResult));
    expect(deleteResult.success).toBe(true);

    // Query DB after delete
    const dbCheckAfter = new Database(TEST_DB_PATH);
    const docsAfter = dbCheckAfter.prepare("SELECT * FROM documents").all();
    console.log("DB documents after delete:", JSON.stringify(docsAfter));
    dbCheckAfter.close();

    // Verify stats are empty again
    const statsResponse = (await mcpClient.callTool({
      name: "get_knowledge_stats",
      arguments: {},
    })) as any;
    const stats = JSON.parse(statsResponse.content[0].text);
    expect(stats.totalDocuments).toBe(0);
    expect(stats.totalChunks).toBe(0);
  });

  test("should save a semantic memory fact, search for it, and then delete it", async () => {
    // 1. Save fact
    const saveRes = (await mcpClient.callTool({
      name: "save_memory_fact",
      arguments: {
        category: "preference",
        factText: "User prefers using Bun over Node.js for running typescript code",
        entityAssociated: "user",
      },
    })) as any;

    expect(saveRes.isError).toBeUndefined();
    const saveResult = JSON.parse(saveRes.content[0].text);
    expect(saveResult.success).toBe(true);
    expect(saveResult.category).toBe("preference");
    expect(saveResult.id).toBeNumber();

    const factId = saveResult.id;

    // 2. Search memories (should find the fact we just saved)
    const searchRes = (await mcpClient.callTool({
      name: "search_agent_memories",
      arguments: {
        query: "typescript runtime preferences",
        limit: 3,
      },
    })) as any;

    expect(searchRes.isError).toBeUndefined();
    const searchResults = JSON.parse(searchRes.content[0].text);
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].factText).toBe("User prefers using Bun over Node.js for running typescript code");
    expect(searchResults[0].similarityScore).toBeGreaterThan(0.2); // Since we mock embeddings as constant arrays, similarity is 1.0!

    // 3. Delete fact
    const deleteRes = (await mcpClient.callTool({
      name: "delete_memory_fact",
      arguments: {
        id: factId,
      },
    })) as any;

    expect(deleteRes.isError).toBeUndefined();
    const deleteResult = JSON.parse(deleteRes.content[0].text);
    expect(deleteResult.success).toBe(true);

    // Verify it's gone
    const searchAfterDelete = (await mcpClient.callTool({
      name: "search_agent_memories",
      arguments: {
        query: "typescript runtime preferences",
      },
    })) as any;
    const searchResultsAfter = JSON.parse(searchAfterDelete.content[0].text);
    const found = searchResultsAfter.some((r: any) => r.id === factId);
    expect(found).toBe(false);
  });

  test("should log episodic events and retrieve them from the DB", async () => {
    const sessionUuid = "test-session-12345";

    // Log user message
    const logUserRes = (await mcpClient.callTool({
      name: "log_episodic_event",
      arguments: {
        sessionUuid,
        role: "user",
        content: "Hello agent, please implement the task memory plan.",
      },
    })) as any;

    expect(logUserRes.isError).toBeUndefined();
    const userLogResult = JSON.parse(logUserRes.content[0].text);
    expect(userLogResult.success).toBe(true);
    expect(userLogResult.stepIndex).toBe(0);

    // Log assistant reasoning & response
    const logAssistantRes = (await mcpClient.callTool({
      name: "log_episodic_event",
      arguments: {
        sessionUuid,
        role: "assistant",
        content: "I will implement the memory design plan in knowledge.ts",
        thoughts: "Let's modify the database schema first to support memory tables",
        toolCalls: [{ name: "replace_file_content", args: {} }],
      },
    })) as any;

    expect(logAssistantRes.isError).toBeUndefined();
    const assistantLogResult = JSON.parse(logAssistantRes.content[0].text);
    expect(assistantLogResult.success).toBe(true);
    expect(assistantLogResult.stepIndex).toBe(1);

    // Verify records exist in test DB directly
    const dbCheck = new Database(TEST_DB_PATH);
    const episodes = dbCheck.prepare(`
      SELECT e.* FROM memory_episodes e
      JOIN memory_sessions s ON e.session_id = s.id
      WHERE s.session_uuid = ?
      ORDER BY e.step_index ASC
    `).all(sessionUuid) as any[];

    dbCheck.close();

    expect(episodes).toHaveLength(2);
    expect(episodes[0].role).toBe("user");
    expect(episodes[0].content).toBe("Hello agent, please implement the task memory plan.");
    expect(episodes[1].role).toBe("assistant");
    expect(episodes[1].thoughts).toBe("Let's modify the database schema first to support memory tables");
    expect(JSON.parse(episodes[1].tool_calls)[0].name).toBe("replace_file_content");
  });

  test("should perform background memory consolidation successfully", async () => {
    const sessionUuid = "consolidation-session-56789";

    // 1. Log episodic events containing 'Bun'
    await mcpClient.callTool({
      name: "log_episodic_event",
      arguments: {
        sessionUuid,
        role: "user",
        content: "I want to run my tests with Bun today",
      },
    });

    // 2. Set MOCK_LLM = true so it runs the rule-based consolidation fallback deterministically
    process.env.MOCK_LLM = "true";
    process.env.KNOWLEDGE_DB_PATH = TEST_DB_PATH;

    // 3. Execute memory consolidation
    await consolidateSessionMemory(sessionUuid);

    // 4. Check if the consolidator digested the episodes and inserted the new semantic memory fact
    const dbCheck = new Database(TEST_DB_PATH);
    const memories = dbCheck.prepare("SELECT * FROM memory_semantic WHERE category = 'preference'").all() as any[];
    dbCheck.close();

    expect(memories).toHaveLength(1);
    expect(memories[0].fact_text).toContain("prefers using Bun");
  });
});
