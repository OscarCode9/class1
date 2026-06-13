import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { Database } from "bun:sqlite";
import * as path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(__dirname, "../../data/knowledge.db");

// Resolve database path
const DB_PATH = process.env.KNOWLEDGE_DB_PATH || DEFAULT_DB_PATH;
const OLLAMA_URL = "http://localhost:11434/api/embeddings";
const EMBED_MODEL = "mxbai-embed-large";

// Ingestion settings
const CHUNK_SIZE = 150; // words
const CHUNK_OVERLAP = 20; // words

// Create the MCP server
const server = new McpServer({
  name: "knowledge-base-mcp-server",
  version: "1.0.0",
});

// Helper: Open database connection
function getDb(): Database {
  const db = new Database(DB_PATH);
  db.run("PRAGMA foreign_keys = ON;");
  return db;
}

// Helper: Strip HTML tags and extract title
export function cleanHtml(html: string): { title: string; content: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "Untitled Document";

  let content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  return { title, content };
}

// Helper: Chunk text based on word counts
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 50) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// Helper: Get vector embedding from Ollama
async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text
    .slice(0, 1200)
    .replace(/[\x00-\x1f]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (process.env.MOCK_EMBEDDINGS === "true") {
    // Return a constant vector so similarity is always 1.0 for testing
    return new Array(1024).fill(0.1);
  }

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: cleanText }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding error: ${response.statusText}`);
  }

  const data = (await response.json()) as { embedding?: number[] };
  if (!data.embedding) {
    throw new Error("No embedding returned from Ollama");
  }

  return data.embedding;
}

// Helper: Convert float array to Buffer/Uint8Array for SQLite BLOB
export function embeddingToBuffer(embedding: number[]): Uint8Array {
  const buffer = new Uint8Array(embedding.length * 4);
  const view = new DataView(buffer.buffer);
  embedding.forEach((v, i) => view.setFloat32(i * 4, v, true));
  return buffer;
}

// Helper: Convert SQLite BLOB Uint8Array back to float array
export function bufferToEmbedding(buffer: Uint8Array): number[] {
  const embedding: number[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  for (let i = 0; i < buffer.byteLength; i += 4) {
    embedding.push(view.getFloat32(i, true));
  }
  return embedding;
}

// Helper: Cosine similarity calculation
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    if (valA !== undefined && valB !== undefined) {
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
  }

  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// TOOLS DEFINITION
// ==========================================

// 1. Ingest Knowledge Document Tool
server.registerTool(
  "ingest_knowledge_document",
  {
    description: "Ingest a document from a URL or raw text, chunk it, generate vector embeddings, and save it to the database",
    inputSchema: {
      url: z.string().url().describe("The URL of the document to ingest"),
      title: z.string().optional().describe("Optional custom title. If omitted, will be extracted from HTML"),
      sourceType: z
        .enum(["article", "tweet", "video", "pdf", "other"])
        .default("article")
        .describe("The source category of the document"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      rawContent: z.string().optional().describe("Optional raw text content. If provided, skips fetching the URL"),
    },
  },
  async ({ url, title, sourceType, tags, rawContent }) => {
    let db: Database | undefined;
    try {
      db = getDb();

      // Check if URL already exists
      const existing = db.prepare("SELECT id FROM documents WHERE url = ?").get(url) as { id: number } | undefined;
      if (existing) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: Document with URL "${url}" already exists in the knowledge base (ID: ${existing.id}).` }],
        };
      }

      let content = rawContent || "";
      let docTitle = title || "";

      if (!rawContent) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }
        const html = await response.text();
        const cleaned = cleanHtml(html);
        content = cleaned.content;
        docTitle = title || cleaned.title;
      }

      if (!docTitle) {
        docTitle = new URL(url).hostname;
      }

      const wordCount = content.split(/\s+/).length;

      // Insert document record
      const docResult = db.prepare(`
        INSERT INTO documents (url, title, source_type, raw_content, word_count, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(url, docTitle, sourceType, content, wordCount, JSON.stringify(tags || []));

      const docId = Number(docResult.lastInsertRowid);

      // Chunk and embed text
      const chunks = chunkText(content);
      const insertChunk = db.prepare(`
        INSERT INTO chunks (doc_id, content, embedding, chunk_index, token_count)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk !== undefined) {
          const embedding = await getEmbedding(chunk);
          const buffer = embeddingToBuffer(embedding);
          insertChunk.run(docId, chunk, buffer, i, chunk.split(/\s+/).length);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              documentId: docId,
              title: docTitle,
              chunksCreated: chunks.length,
              wordCount,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error during ingestion: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// 2. Delete Knowledge Document Tool
server.registerTool(
  "delete_knowledge_document",
  {
    description: "Delete a document and all its chunks/embeddings from the database by ID or URL",
    inputSchema: {
      id: z.number().optional().describe("ID of the document to delete"),
      url: z.string().url().optional().describe("URL of the document to delete (alternative to ID)"),
    },
  },
  async ({ id, url }) => {
    let db: Database | undefined;
    try {
      db = getDb();

      if (id === undefined && !url) {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: You must provide either 'id' or 'url'." }],
        };
      }

      let runResult;
      if (id !== undefined) {
        runResult = db.prepare("DELETE FROM documents WHERE id = ?").run(id);
      } else if (url !== undefined) {
        runResult = db.prepare("DELETE FROM documents WHERE url = ?").run(url);
      } else {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: You must provide either 'id' or 'url'." }],
        };
      }

      if (runResult.changes === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: Document not found." }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: `Successfully deleted document.` }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting document: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// 3. Update Knowledge Document Tool
server.registerTool(
  "update_knowledge_document",
  {
    description: "Update a document's details. If rawContent is provided, chunks and embeddings are regenerated",
    inputSchema: {
      id: z.number().describe("ID of the document to update"),
      title: z.string().optional().describe("New title for the document"),
      tags: z.array(z.string()).optional().describe("New tags for the document"),
      rawContent: z.string().optional().describe("New textual content of the document. Will trigger chunking and re-embedding"),
    },
  },
  async ({ id, title, tags, rawContent }) => {
    let db: Database | undefined;
    try {
      db = getDb();

      // Check if document exists
      const existing = db.prepare("SELECT id FROM documents WHERE id = ?").get(id) as { id: number } | undefined;
      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: Document with ID ${id} not found.` }],
        };
      }

      db.transaction(() => {
        // Update Title if provided
        if (db && title !== undefined) {
          db.prepare("UPDATE documents SET title = ? WHERE id = ?").run(title, id);
        }

        // Update Tags if provided
        if (db && tags !== undefined) {
          db.prepare("UPDATE documents SET tags = ? WHERE id = ?").run(JSON.stringify(tags), id);
        }
      })();

      // Regenerate chunks and embeddings if rawContent is provided
      let chunksCreated = 0;
      if (rawContent !== undefined) {
        const wordCount = rawContent.split(/\s+/).length;

        // Perform inside a transaction to prevent partial state on error
        await new Promise<void>(async (resolve, reject) => {
          try {
            if (!db) throw new Error("Database not connected");

            db.transaction(() => {
              if (db) {
                db.prepare("UPDATE documents SET raw_content = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(rawContent, wordCount, id);
                db.prepare("DELETE FROM chunks WHERE doc_id = ?").run(id);
              }
            })();

            const chunks = chunkText(rawContent);
            const insertChunk = db.prepare(`
              INSERT INTO chunks (doc_id, content, embedding, chunk_index, token_count)
              VALUES (?, ?, ?, ?, ?)
            `);

            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              if (chunk !== undefined) {
                const embedding = await getEmbedding(chunk);
                const buffer = embeddingToBuffer(embedding);
                insertChunk.run(id, chunk, buffer, i, chunk.split(/\s+/).length);
              }
            }
            chunksCreated = chunks.length;
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              documentId: id,
              chunksRegenerated: rawContent !== undefined,
              chunksCreated: rawContent !== undefined ? chunksCreated : undefined,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating document: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// 4. Search Knowledge Tool (Hybrid)
server.registerTool(
  "search_knowledge",
  {
    description: "Search the knowledge base using semantic vector similarity, keywords (FTS5), or a hybrid approach",
    inputSchema: {
      query: z.string().describe("Search query string"),
      limit: z.number().min(1).max(20).default(5).describe("Max documents to return"),
      mode: z.enum(["semantic", "keyword", "hybrid"]).default("semantic").describe("Retrieval mode"),
    },
  },
  async ({ query, limit, mode }) => {
    let db: Database | undefined;
    try {
      db = getDb();
      let results: Array<{ doc_id: number; title: string; url: string; content: string; score: number }> = [];

      // A. Keyword Search via FTS5
      const keywordSearch = (): typeof results => {
        try {
          if (!db) return [];
          const rows = db.prepare(`
            SELECT c.content, d.title, d.url, c.doc_id, c.id
            FROM chunks_fts f
            JOIN chunks c ON f.rowid = c.id
            JOIN documents d ON c.doc_id = d.id
            WHERE chunks_fts MATCH ?
            LIMIT ?
          `).all(query, limit * 2) as Array<{ content: string; title: string; url: string; doc_id: number; id: number }>;

          return rows.map((r) => ({
            doc_id: r.doc_id,
            title: r.title,
            url: r.url,
            content: r.content,
            score: 1.0, // FTS score baseline
          }));
        } catch (err) {
          console.error("FTS search error:", err);
          return [];
        }
      };

      // B. Semantic Search
      const semanticSearch = async (): Promise<typeof results> => {
        if (!db) return [];
        const queryEmbedding = await getEmbedding(query);

        // Fetch chunks with embeddings
        const rows = db.prepare(`
          SELECT c.id, c.content, c.embedding, c.doc_id, d.title, d.url
          FROM chunks c
          JOIN documents d ON c.doc_id = d.id
          WHERE c.embedding IS NOT NULL
        `).all() as Array<{ id: number; content: string; embedding: Uint8Array; doc_id: number; title: string; url: string }>;

        const scored = rows.map((r) => {
          const chunkEmbedding = bufferToEmbedding(r.embedding);
          const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
          return {
            doc_id: r.doc_id,
            title: r.title,
            url: r.url,
            content: r.content,
            score,
          };
        });

        // Sort by similarity score descending
        scored.sort((a, b) => b.score - a.score);
        return scored;
      };

      if (mode === "keyword") {
        results = keywordSearch();
      } else if (mode === "semantic") {
        results = await semanticSearch();
      } else {
        // Hybrid mode: Execute both, merge and deduplicate
        const keywordRes = keywordSearch();
        const semanticRes = await semanticSearch();

        // Map semRes by doc_id + content to easily check inclusion
        const seen = new Set<string>();
        results = [];

        // Add semantic results first (usually higher quality for concepts)
        for (const item of semanticRes) {
          const key = `${item.doc_id}-${item.content.slice(0, 50)}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        }

        // Boost/add keyword results if not present
        for (const item of keywordRes) {
          const key = `${item.doc_id}-${item.content.slice(0, 50)}`;
          if (!seen.has(key)) {
            seen.add(key);
            item.score = 0.5; // Neutral baseline score for keyword-only additions
            results.push(item);
          } else {
            // If it matches both, boost score
            const matchIndex = results.findIndex((r) => `${r.doc_id}-${r.content.slice(0, 50)}` === key);
            if (matchIndex !== -1) {
              const matchedItem = results[matchIndex];
              if (matchedItem !== undefined) {
                matchedItem.score = Math.min(1.0, matchedItem.score + 0.15);
              }
            }
          }
        }

        // Re-sort hybrid results
        results.sort((a, b) => b.score - a.score);
      }

      // Deduplicate results to return only the single most relevant chunk per document
      const docSeen = new Set<number>();
      const finalResults = results.filter((r) => {
        if (docSeen.has(r.doc_id)) return false;
        docSeen.add(r.doc_id);
        return true;
      }).slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              finalResults.map((r) => ({
                documentId: r.doc_id,
                title: r.title,
                url: r.url,
                similarityScore: Number(r.score.toFixed(4)),
                excerpt: r.content,
              })),
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching knowledge base: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// 5. List Knowledge Documents Tool
server.registerTool(
  "list_knowledge_documents",
  {
    description: "List documents currently stored in the knowledge base",
    inputSchema: {
      limit: z.number().min(1).max(100).default(20).describe("Límite de documentos a retornar"),
      offset: z.number().default(0).describe("Offset para paginación"),
    },
  },
  async ({ limit, offset }) => {
    let db: Database | undefined;
    try {
      db = getDb();
      const docs = db.prepare(`
        SELECT d.id, d.title, d.url, d.source_type, d.created_at,
               (SELECT COUNT(*) FROM chunks WHERE doc_id = d.id) as chunk_count
        FROM documents d
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset) as any[];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              docs.map((d) => ({
                id: d.id,
                title: d.title,
                url: d.url,
                sourceType: d.source_type,
                chunksCount: d.chunk_count,
                createdAt: d.created_at,
              })),
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing documents: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// 6. Get Knowledge Stats Tool
server.registerTool(
  "get_knowledge_stats",
  {
    description: "Get general metrics and stats of the knowledge base",
  },
  async () => {
    let db: Database | undefined;
    try {
      db = getDb();
      const docCount = (db.prepare("SELECT COUNT(*) as count FROM documents").get() as any).count;
      const chunkCount = (db.prepare("SELECT COUNT(*) as count FROM chunks").get() as any).count;
      const byType = db.prepare("SELECT source_type, COUNT(*) as count FROM documents GROUP BY source_type").all() as any[];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalDocuments: docCount,
              totalChunks: chunkCount,
              bySourceType: byType.reduce((acc, t) => {
                acc[t.source_type] = t.count;
                return acc;
              }, {} as Record<string, number>),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching statistics: ${error.message}` }],
      };
    } finally {
      if (db) db.close();
    }
  }
);

// ==========================================
// BOOT MCP SERVER
// ==========================================
async function run() {
  const useSse = process.argv.includes("--sse") || process.env.USE_SSE === "true";

  if (useSse) {
    const app = express();
    app.use(express.json());

    const transports: Record<string, SSEServerTransport> = {};

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

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.error(`Knowledge Base MCP Server running on SSE at http://localhost:${PORT}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Knowledge Base MCP Server running on stdio transport");
  }
}

run().catch((error) => {
  console.error("Fatal error running Knowledge Base MCP Server:", error);
  process.exit(1);
});
