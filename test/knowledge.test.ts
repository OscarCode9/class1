import { describe, expect, test } from "bun:test";
import {
  cleanHtml,
  chunkText,
  embeddingToBuffer,
  bufferToEmbedding,
  cosineSimilarity,
} from "../src/mcp/knowledge";

describe("Knowledge Base Unit Tests", () => {
  describe("cleanHtml", () => {
    test("should extract title and strip basic HTML tags", () => {
      const html = "<html><head><title>Test Article</title></head><body><h1>Hello World</h1><p>This is a <strong>test</strong>.</p></body></html>";
      const cleaned = cleanHtml(html);

      expect(cleaned.title).toBe("Test Article");
      // The head title tags are stripped, but its inner text is preserved in the content stream, matching the original parser behavior
      expect(cleaned.content).toBe("Test Article Hello World This is a test .");
    });

    test("should handle missing title gracefully", () => {
      const html = "<body><p>Hello World</p></body>";
      const cleaned = cleanHtml(html);

      expect(cleaned.title).toBe("Untitled Document");
      expect(cleaned.content).toBe("Hello World");
    });

    test("should strip script and style tags completely along with their contents", () => {
      const html = "<html><head><style>body { color: red; }</style><script>alert('test');</script></head><body><p>Actual content</p></body></html>";
      const cleaned = cleanHtml(html);

      expect(cleaned.content).toBe("Actual content");
      expect(cleaned.content).not.toContain("alert");
      expect(cleaned.content).not.toContain("color");
    });

    test("should decode HTML entities and normalize whitespace", () => {
      const html = "<div>Hello&nbsp;&amp;&nbsp;World&quot;&lt;&gt;</div>";
      const cleaned = cleanHtml(html);

      expect(cleaned.content).toBe('Hello & World"<>');
    });
  });

  describe("chunkText", () => {
    test("should chunk text based on word counts with overlap", () => {
      // 20 words, each padded slightly so that chunks exceed the 50 character limit threshold in the engine
      const text = "wordone wordtwo wordthree wordfour wordfive wordsix wordseven wordeight wordnine wordten wordeleven wordtwelve wordthirteen wordfourteen wordfifteen wordsixteen wordseventeen wordeighteen wordnineteen wordtwenty";
      
      // Chunk size 10, overlap 2
      const chunks = chunkText(text, 10, 2);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toContain("wordone wordtwo");
      
      // The second chunk should overlap with the end of the first
      if (chunks[1]) {
        expect(chunks[1]).toContain("wordnine wordten");
      }
    });

    test("should discard very small chunks", () => {
      const text = "very short text";
      const chunks = chunkText(text, 150, 20);

      // Chunks under 50 characters should be skipped
      expect(chunks).toHaveLength(0);
    });
  });

  describe("Binary Embedding Conversion", () => {
    test("should serialize and deserialize float arrays correctly", () => {
      const originalEmbedding = [0.1, -0.234, 0.5678, 1.0, -1.0];
      const buffer = embeddingToBuffer(originalEmbedding);
      
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.byteLength).toBe(originalEmbedding.length * 4);

      const deserialized = bufferToEmbedding(buffer);
      expect(deserialized).toHaveLength(originalEmbedding.length);
      
      // Check values with float precision tolerance
      originalEmbedding.forEach((val, i) => {
        const item = deserialized[i];
        expect(item).toBeDefined();
        expect(item!).toBeCloseTo(val, 5);
      });
    });
  });

  describe("cosineSimilarity", () => {
    test("should calculate correct similarity scores", () => {
      // Identical direction
      expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5);
      expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5); // Magnitude doesn't affect similarity

      // Orthogonal
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);

      // Opposite direction
      expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);

      // Intermediate
      expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(0.7071, 4); // cos(45 deg) = 1/sqrt(2)
    });

    test("should handle zero vectors gracefully", () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
      expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
    });
  });
});
