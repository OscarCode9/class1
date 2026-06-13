import { Database } from "bun:sqlite";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(__dirname, "../../data/knowledge.db");
const DB_PATH = process.env.KNOWLEDGE_DB_PATH || DEFAULT_DB_PATH;
const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";
const OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings";
const EMBED_MODEL = "mxbai-embed-large";

interface MemoryFact {
  id?: number;
  category: "preference" | "user_profile" | "learning" | "fact";
  fact_text: string;
  confidence: number;
}

interface ReflectionAction {
  insertions: Omit<MemoryFact, "id">[];
  updates: MemoryFact[];
  deletions: { id: number; reason: string }[];
}

// Helper: Get vector embedding from Ollama (or mock)
async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.MOCK_EMBEDDINGS === "true" || process.env.MOCK_LLM === "true") {
    return new Array(1024).fill(0.1);
  }

  try {
    const response = await fetch(OLLAMA_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });
    if (!response.ok) throw new Error("Embeddings request failed");
    const data = (await response.json()) as { embedding?: number[] };
    return data.embedding || new Array(1024).fill(0.1);
  } catch {
    return new Array(1024).fill(0.1);
  }
}

// Helper: Cosine similarity conversion
function embeddingToBuffer(embedding: number[]): Uint8Array {
  const buffer = new Uint8Array(embedding.length * 4);
  const view = new DataView(buffer.buffer);
  embedding.forEach((v, i) => view.setFloat32(i * 4, v, true));
  return buffer;
}

async function queryOllamaLLM(prompt: string): Promise<string> {
  if (process.env.MOCK_LLM === "true") {
    throw new Error("Mocking mode enabled");
  }

  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3", // default fallback model
      prompt,
      system: "You are the agent memory consolidation model. Respond ONLY with raw JSON.",
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama LLM generation error: ${response.statusText}`);
  }

  const data = (await response.json()) as { response: string };
  return data.response;
}

// Fallback rule-based mock consolidation for testing or offline modes
function runMockConsolidation(episodes: any[], semanticMemories: any[]): ReflectionAction {
  const insertions: Omit<MemoryFact, "id">[] = [];
  const updates: MemoryFact[] = [];
  const deletions: { id: number; reason: string }[] = [];

  const episodeText = episodes.map((e) => e.content).join(" ").toLowerCase();

  // Simple heuristic checks
  if (episodeText.includes("bun") && !semanticMemories.some((m) => m.fact_text.toLowerCase().includes("bun"))) {
    insertions.push({
      category: "preference",
      fact_text: "User prefers using Bun over Node.js for running typescript code",
      confidence: 0.95,
    });
  }

  if (episodeText.includes("docker") && !semanticMemories.some((m) => m.fact_text.toLowerCase().includes("docker"))) {
    insertions.push({
      category: "fact",
      fact_text: "The project workspace class1 includes a Dockerfile configuration",
      confidence: 0.9,
    });
  }

  return { insertions, updates, deletions };
}

function initializeDbSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_uuid TEXT UNIQUE NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      step_index INTEGER NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      thoughts TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory_semantic (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT CHECK(category IN ('preference', 'user_profile', 'learning', 'fact')) NOT NULL,
      fact_text TEXT NOT NULL,
      embedding BLOB NOT NULL,
      confidence REAL DEFAULT 1.0,
      entity_associated TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function consolidateSessionMemory(sessionUuid: string): Promise<void> {
  const dbPath = process.env.KNOWLEDGE_DB_PATH || path.resolve(__dirname, "../../data/knowledge.db");
  const db = new Database(dbPath);
  db.run("PRAGMA foreign_keys = ON;");
  initializeDbSchema(db);

  try {
    // 1. Fetch Session ID
    const session = db.prepare("SELECT id FROM memory_sessions WHERE session_uuid = ?").get(sessionUuid) as { id: number } | undefined;
    if (!session) {
      console.warn(`No session found for UUID: ${sessionUuid}`);
      return;
    }

    // 2. Fetch recent episodes
    const episodes = db.prepare(`
      SELECT role, content, thoughts, timestamp
      FROM memory_episodes
      WHERE session_id = ?
      ORDER BY step_index ASC
    `).all(session.id) as any[];

    if (episodes.length === 0) {
      console.log(`No episodes logged for session: ${sessionUuid}. Skipping consolidation.`);
      return;
    }

    // 3. Fetch existing semantic memories
    const semanticMemories = db.prepare(`
      SELECT id, category, fact_text, confidence, entity_associated
      FROM memory_semantic
    `).all() as any[];

    // 4. Formulate Prompt
    const prompt = `
Eres el subcomponente de consolidación de memoria del agente.
Se te proporciona:
1. Hechos ya conocidos sobre el usuario y el entorno (Memoria Semántica):
${JSON.stringify(semanticMemories, null, 2)}

2. La conversación y acciones recientes del agente (Memoria Episódica):
${JSON.stringify(episodes, null, 2)}

Tu tarea es:
- Identificar nuevas preferencias del usuario, hechos estables o aprendizajes del agente.
- Detectar si algún hecho anteriormente conocido ha cambiado o es falso (conflictos).
- Generar una lista de acciones estructurada en JSON para actualizar la Memoria Semántica.

FORMATO DE SALIDA REQUERIDO (JSON):
{
  "insertions": [
    { "category": "preference", "fact_text": "Prefiere probar el código con Bun antes de Docker", "confidence": 0.9 }
  ],
  "updates": [
    { "id": 14, "fact_text": "Trabaja en el proyecto class1 usando TypeScript (actualizado)", "confidence": 1.0 }
  ],
  "deletions": [
    { "id": 5, "reason": "El usuario ya no usa Python para este backend" }
  ]
}
`;

    let actionPlan: ReflectionAction;

    try {
      console.log("Querying Ollama LLM for consolidation...");
      const responseText = await queryOllamaLLM(prompt);
      actionPlan = JSON.parse(responseText.trim()) as ReflectionAction;
    } catch (err: any) {
      console.log(`Ollama LLM consolidation failed or mock mode active: ${err.message}. Running rule-based consolidator.`);
      actionPlan = runMockConsolidation(episodes, semanticMemories);
    }

    // 5. Apply insertions
    const insertStmt = db.prepare(`
      INSERT INTO memory_semantic (category, fact_text, embedding, confidence)
      VALUES (?, ?, ?, ?)
    `);
    for (const ins of actionPlan.insertions) {
      const embedding = await getEmbedding(ins.fact_text);
      const buffer = embeddingToBuffer(embedding);
      insertStmt.run(ins.category, ins.fact_text, buffer, ins.confidence);
      console.log(`[Consolidation] Inserted new semantic memory: "${ins.fact_text}"`);
    }

    // 6. Apply updates
    const updateStmt = db.prepare(`
      UPDATE memory_semantic
      SET category = ?, fact_text = ?, embedding = ?, confidence = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    for (const upd of actionPlan.updates) {
      if (upd.id !== undefined) {
        const embedding = await getEmbedding(upd.fact_text);
        const buffer = embeddingToBuffer(embedding);
        updateStmt.run(upd.category, upd.fact_text, buffer, upd.confidence, upd.id);
        console.log(`[Consolidation] Updated semantic memory ID ${upd.id}: "${upd.fact_text}"`);
      }
    }

    // 7. Apply deletions
    const deleteStmt = db.prepare("DELETE FROM memory_semantic WHERE id = ?");
    for (const del of actionPlan.deletions) {
      deleteStmt.run(del.id);
      console.log(`[Consolidation] Deleted semantic memory ID ${del.id}. Reason: ${del.reason}`);
    }

  } finally {
    db.close();
  }
}

// CLI runner entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionArgIndex = process.argv.indexOf("--session");
  const sessionUuid = sessionArgIndex !== -1 ? process.argv[sessionArgIndex + 1] : null;

  if (!sessionUuid) {
    console.error("Error: Please specify session UUID using --session <uuid>");
    process.exit(1);
  }

  consolidateSessionMemory(sessionUuid)
    .then(() => {
      console.log("Memory consolidation process finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal error during memory consolidation:", err);
      process.exit(1);
    });
}
