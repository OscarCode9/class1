# Análisis de tu Base de Datos de Conocimiento Personalizada

A diferencia del mecanismo por defecto de OpenClaw, has desarrollado una base de datos de conocimiento personalizada e independiente. Este sistema está implementado en la ruta [kb.ts](file:///Users/oscarcode/.openclaw/workspace/scripts/kb.ts) y utiliza la base de datos SQLite [knowledge.db](file:///Users/oscarcode/class1/data/knowledge.db).

A continuación se detalla su arquitectura, estructura de datos y el flujo de búsqueda semántica.

---

## 1. Arquitectura General
El sistema utiliza un enfoque local-first para la ingesta y la búsqueda semántica, apoyándose en **Ollama** e inferencia local de vectores:

* **Base de Datos**: SQLite (`better-sqlite3`).
* **Embeddings**: Inferencia local con **Ollama** utilizando el modelo `mxbai-embed-large` (1024 dimensiones).
* **Búsqueda Semántica**: Búsqueda por similitud del coseno calculada directamente en memoria mediante JavaScript/TypeScript, complementada por búsqueda de texto completo tradicional (FTS5).

---

## 2. Modelo de Datos (`knowledge.db`)
El esquema de base de datos consta de dos tablas principales y una tabla virtual de texto completo:

```mermaid
erDiagram
    documents ||--o{ chunks : "contiene"
    documents {
        int id PK
        text url UNIQUE
        text title
        text source_type
        text raw_content
        int word_count
        datetime created_at
        datetime updated_at
        text tags "JSON array"
    }
    chunks {
        int id PK
        int doc_id FK
        text content
        blob embedding "1024-dim float32 vector (4096 bytes)"
        int chunk_index
        int token_count
        datetime created_at
    }
```

### Tabla `documents`
Guarda el artículo original, su origen (tipo de fuente) y metadatos:
* `source_type`: Restringido mediante check a `'article'`, `'tweet'`, `'video'`, `'pdf'` u `'other'`.
* `tags`: Almacena un array JSON de etiquetas.

### Tabla `chunks`
Guarda las particiones del texto asociadas a cada documento:
* `embedding`: Un vector de precisión simple (`float32`) de 1024 dimensiones almacenado directamente como un **BLOB de 4096 bytes** (1024 * 4 bytes).

### Tabla virtual `chunks_fts` (Búsqueda de Texto Completo FTS5)
Mediante triggers automáticos de SQLite (`chunks_ai`, `chunks_ad`, `chunks_au`), cada inserción, actualización o borrado en la tabla `chunks` sincroniza de forma inmediata el índice de texto completo FTS5 para búsquedas por palabras clave.

---

## 3. Flujo de Ingesta de Artículos (`kb.ts ingest`)
Cuando agregas un artículo usando `npx ts-node kb.ts ingest <url>`:

1. **Extracción (Scraping)**: Utiliza `curl` para descargar el HTML, extrae el título de la etiqueta `<title>` y limpia todas las etiquetas HTML y scripts para obtener el texto plano.
2. **Chunking basado en palabras**:
   * Segmenta el texto en chunks con `CHUNK_SIZE = 150` palabras.
   * Aplica un solapamiento (`CHUNK_OVERLAP`) de `20` palabras.
3. **Embeddings con Ollama**:
   * Envía cada chunk a `http://localhost:11434/api/embeddings` usando el modelo `mxbai-embed-large`.
   * El vector de 1024 floats devuelto por Ollama se convierte en un buffer de Node (`Buffer.alloc(1024 * 4)`) escribiendo floats de 32 bits Little-Endian (`writeFloatLE`).
4. **Almacenamiento**: Inserta el documento en `documents` y cada chunk en `chunks` asociando su ID.

---

## 4. Búsqueda Vectorial Manual (`kb.ts search`)
Dado que la base de datos no carga extensiones vectoriales externas en tiempo de ejecución de SQLite (a diferencia del `sqlite-vec` nativo del plugin por defecto de OpenClaw), tu script [kb.ts](file:///Users/oscarcode/.openclaw/workspace/scripts/kb.ts) realiza la similitud de la siguiente manera:

1. **Vector de Consulta**: Obtiene el embedding de la pregunta/búsqueda desde Ollama.
2. **Carga en Memoria**: Lee **todos** los chunks almacenados que tengan embeddings de la base de datos (`SELECT c.content, c.embedding, d.title...`).
3. **Conversión**: Convierte el `BLOB` binario recuperado de nuevo a un array de números utilizando `readFloatLE`.
4. **Cálculo de Similitud del Coseno**:
   Aplica la fórmula matemática clásica para calcular la similitud entre el vector de consulta y cada chunk en JavaScript:
   ```typescript
   function cosineSimilarity(a: number[], b: number[]): number {
     let dotProduct = 0;
     let normA = 0;
     let normB = 0;
     for (let i = 0; i < a.length; i++) {
       dotProduct += a[i] * b[i];
       normA += a[i] * a[i];
       normB += b[i] * b[i];
     }
     return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
   }
   ```
5. **Ordenamiento y Deduplicación**: Ordena de mayor a menor score de similitud y filtra duplicados para mostrar únicamente el chunk más relevante por cada documento único.

---

## 5. Diferencias Clave: Tu DB vs. OpenClaw Default

| Característica | Tu Base de Datos (`kb.ts`) | OpenClaw Default (`memory-core`) |
| :--- | :--- | :--- |
| **Persistencia** | SQLite (`knowledge.db`) en `/data` | SQLite (`main.sqlite`) en `/memory` |
| **Origen de Datos** | Raspado de URLs (`curl` HTML stripping) | Archivos Markdown del workspace (`memory/*.md`) |
| **Chunking** | Basado en palabras (150 palabras, 20 overlap) | Basado en tokens (~400 tokens, 80 overlap) |
| **Embeddings** | Ollama local (`mxbai-embed-large`) | OpenAI (por defecto) o configurable |
| **Cálculo Vectorial** | En memoria en JS (`cosineSimilarity()`) | En base de datos nativa con extensión `sqlite-vec` |
| **Deduplicación** | Devuelve solo 1 chunk superior por documento | Devuelve múltiples chunks continuos o relevantes |
