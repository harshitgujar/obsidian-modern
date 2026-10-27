import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DocumentChunk, IndexManifest, FileIndexMeta } from './types';
import { chunkMarkdown } from './markdownChunker';
import { EmbeddingProvider } from './embeddingProvider';

export class VectorStore {
  private vaultDir: string;
  private indexDir: string;
  private manifestPath: string;
  private chunksPath: string;

  private manifest: IndexManifest;
  private chunks: Map<string, DocumentChunk> = new Map();
  private embeddingProvider: EmbeddingProvider;
  private isDirty = false;

  constructor(vaultDir: string, embeddingProvider: EmbeddingProvider) {
    this.vaultDir = vaultDir;
    this.indexDir = path.join(vaultDir, '.obsidian', 'ai-index');
    this.manifestPath = path.join(this.indexDir, 'manifest.json');
    this.chunksPath = path.join(this.indexDir, 'chunks.json');
    this.embeddingProvider = embeddingProvider;

    this.manifest = {
      version: 1,
      embeddingModel: 'nomic-embed-text',
      dimension: 768,
      totalChunks: 0,
      lastUpdated: Date.now(),
      files: {}
    };

    this.loadIndex();
  }

  /**
   * Loads the existing index from disk if present.
   */
  private loadIndex() {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const rawManifest = fs.readFileSync(this.manifestPath, 'utf8');
        this.manifest = JSON.parse(rawManifest);
      }

      if (fs.existsSync(this.chunksPath)) {
        const rawChunks = fs.readFileSync(this.chunksPath, 'utf8');
        const chunkList: DocumentChunk[] = JSON.parse(rawChunks);
        this.chunks.clear();
        for (const c of chunkList) {
          this.chunks.set(c.id, c);
        }
      }
    } catch (err) {
      console.warn('Failed to load existing AI index, starting fresh:', err);
      this.chunks.clear();
    }
  }

  /**
   * Persists the index and manifest to disk.
   */
  public saveIndex() {
    try {
      if (!fs.existsSync(this.indexDir)) {
        fs.mkdirSync(this.indexDir, { recursive: true });
      }

      this.manifest.totalChunks = this.chunks.size;
      this.manifest.lastUpdated = Date.now();

      fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf8');
      fs.writeFileSync(this.chunksPath, JSON.stringify(Array.from(this.chunks.values())), 'utf8');
      this.isDirty = false;
    } catch (err) {
      console.error('Failed to save AI index to disk:', err);
    }
  }

  /**
   * Returns current index statistics.
   */
  public getStats() {
    return {
      indexedFiles: Object.keys(this.manifest.files).length,
      totalChunks: this.chunks.size,
      lastUpdated: this.manifest.lastUpdated,
      embeddingModel: this.manifest.embeddingModel
    };
  }

  /**
   * Indexes a single markdown file incrementally.
   * If file content hash hasn't changed, skips embedding computation.
   */
  public async indexFile(filePath: string, content: string, mtime = Date.now()): Promise<boolean> {
    if (!filePath.endsWith('.md')) return false;

    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const existingMeta = this.manifest.files[filePath];

    // If unchanged and chunks exist, skip
    if (existingMeta && existingMeta.hash === hash && existingMeta.chunkIds.length > 0) {
      const allChunksExist = existingMeta.chunkIds.every(id => this.chunks.has(id));
      if (allChunksExist) {
        return false; // No changes
      }
    }

    // 1. Remove old chunks for this file
    if (existingMeta) {
      for (const id of existingMeta.chunkIds) {
        this.chunks.delete(id);
      }
    }

    // 2. Chunk markdown structurally
    const newChunks = chunkMarkdown(filePath, content);
    if (newChunks.length === 0) {
      delete this.manifest.files[filePath];
      this.saveIndex();
      return true;
    }

    // 3. Compute vector embeddings
    const textsToEmbed = newChunks.map(c => c.content);
    const { embeddings, model, dimension } = await this.embeddingProvider.getEmbeddings(textsToEmbed);

    this.manifest.embeddingModel = model;
    this.manifest.dimension = dimension;

    const chunkIds: string[] = [];
    for (let i = 0; i < newChunks.length; i++) {
      const chunk = newChunks[i];
      chunk.vector = embeddings[i];
      this.chunks.set(chunk.id, chunk);
      chunkIds.push(chunk.id);
    }

    // 4. Update file metadata
    this.manifest.files[filePath] = {
      filePath,
      hash,
      mtime,
      chunkIds
    };

    this.saveIndex();
    return true;
  }

  /**
   * Removes a deleted file's chunks from index.
   */
  public removeFile(filePath: string) {
    const meta = this.manifest.files[filePath];
    if (!meta) return;

    for (const id of meta.chunkIds) {
      this.chunks.delete(id);
    }
    delete this.manifest.files[filePath];
    this.saveIndex();
  }

  /**
   * Renames a file in the index in O(1) without recomputing embeddings.
   */
  public renameFile(oldPath: string, newPath: string) {
    const meta = this.manifest.files[oldPath];
    if (!meta) return;

    delete this.manifest.files[oldPath];
    meta.filePath = newPath;
    this.manifest.files[newPath] = meta;

    const newTitle = newPath.replace(/\.md$/, '').split('/').pop() || 'Untitled';

    for (const id of meta.chunkIds) {
      const chunk = this.chunks.get(id);
      if (chunk) {
        chunk.filePath = newPath;
        chunk.noteTitle = newTitle;
        chunk.wikilink = chunk.heading
          ? `[[${newTitle}#${chunk.heading}]]`
          : `[[${newTitle}]]`;
      }
    }

    this.saveIndex();
  }

  /**
   * Performs high-speed vector cosine similarity search.
   */
  public searchVector(
    queryVector: number[],
    topK = 6,
    filter?: { folder?: string; excludePath?: string }
  ): { chunk: DocumentChunk; score: number }[] {
    if (!queryVector || queryVector.length === 0) return [];

    const results: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.vector) continue;
      if (filter?.excludePath && chunk.filePath === filter.excludePath) continue;
      if (filter?.folder && !chunk.filePath.startsWith(filter.folder)) continue;

      const sim = this.cosineSimilarity(queryVector, chunk.vector);
      results.push({ chunk, score: sim });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Returns all stored chunks for lexical / keyword analysis.
   */
  public getAllChunks(): DocumentChunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Computes cosine similarity between two normalized vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dot / denominator;
  }
}
