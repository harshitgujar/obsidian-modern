export interface DocumentChunk {
  id: string;               // Unique hash of filePath + heading + chunkIndex
  filePath: string;         // e.g. "Adventurer/No prior experience.md"
  noteTitle: string;        // e.g. "No prior experience"
  heading: string;          // e.g. "Core AI Features"
  headingLevel: number;     // 1 to 6 (0 if before first heading)
  wikilink: string;         // e.g. "[[No prior experience#Core AI Features]]"
  tags: string[];           // Extracted tags (frontmatter + inline)
  content: string;          // Chunk text content
  charCount: number;
  tokenEstimate: number;    // ~chars / 4
  vector?: number[];        // Float embedding vector
}

export interface FileIndexMeta {
  filePath: string;
  hash: string;             // SHA-256 of file content
  mtime: number;            // Timestamp
  chunkIds: string[];
}

export interface IndexManifest {
  version: number;
  embeddingModel: string;
  dimension: number;
  totalChunks: number;
  lastUpdated: number;
  files: Record<string, FileIndexMeta>;
}

export interface RAGSearchResult {
  chunk: DocumentChunk;
  score: number;            // Normalized similarity score (0 to 1)
  matchType: 'semantic' | 'lexical' | 'hybrid';
}

export interface AIProviderConfig {
  provider: 'ollama' | 'openai' | 'custom';
  ollamaUrl?: string;       // Default: "http://127.0.0.1:11434"
  embeddingModel?: string;  // Default: "nomic-embed-text"
  chatModel?: string;       // Default: "llama3.2"
  apiKey?: string;          // For cloud providers
  apiUrl?: string;
}

export interface RAGStatus {
  isIndexing: boolean;
  indexedFiles: number;
  totalFiles: number;
  totalChunks: number;
  embeddingModel: string;
  provider: 'ollama' | 'openai' | 'custom';
  isProviderAvailable: boolean;
  providerError?: string;
  lastIndexTime: number;
}
