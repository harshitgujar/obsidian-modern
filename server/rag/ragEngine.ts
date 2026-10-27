import { VectorStore } from './vectorStore';
import { EmbeddingProvider } from './embeddingProvider';
import { DocumentChunk, RAGSearchResult, AIProviderConfig, RAGStatus } from './types';

export class RAGEngine {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private vaultDir: string;
  private isIndexing = false;

  constructor(vaultDir: string, providerConfig: Partial<AIProviderConfig> = {}) {
    this.vaultDir = vaultDir;
    this.embeddingProvider = new EmbeddingProvider(providerConfig);
    this.vectorStore = new VectorStore(vaultDir, this.embeddingProvider);
  }

  public getVectorStore(): VectorStore {
    return this.vectorStore;
  }

  public getEmbeddingProvider(): EmbeddingProvider {
    return this.embeddingProvider;
  }

  /**
   * Returns current RAG engine status.
   */
  public async getStatus(totalMarkdownFiles = 0): Promise<RAGStatus> {
    const stats = this.vectorStore.getStats();
    const health = await this.embeddingProvider.checkHealth();
    const config = this.embeddingProvider.getConfig();

    return {
      isIndexing: this.isIndexing,
      indexedFiles: stats.indexedFiles,
      totalFiles: totalMarkdownFiles || stats.indexedFiles,
      totalChunks: stats.totalChunks,
      embeddingModel: stats.embeddingModel,
      provider: config.provider,
      isProviderAvailable: health.available,
      providerError: health.error,
      lastIndexTime: stats.lastUpdated
    };
  }

  /**
   * Performs Hybrid Search combining Semantic Vector Cosine Similarity
   * and Keyword Token Matching using Reciprocal Rank Fusion (RRF).
   */
  public async search(
    query: string,
    topK = 5,
    filter?: { folder?: string; excludePath?: string }
  ): Promise<RAGSearchResult[]> {
    if (!query.trim()) return [];

    // 1. Vector Search
    const queryVector = await this.embeddingProvider.getQueryEmbedding(query);
    const vectorHits = this.vectorStore.searchVector(queryVector, 15, filter);

    // 2. Keyword Search
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 1);

    const allChunks = this.vectorStore.getAllChunks();
    const keywordHits: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of allChunks) {
      if (filter?.excludePath && chunk.filePath === filter.excludePath) continue;
      if (filter?.folder && !chunk.filePath.startsWith(filter.folder)) continue;

      let matchCount = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerTitle = chunk.noteTitle.toLowerCase();
      const lowerHeading = chunk.heading.toLowerCase();

      for (const term of queryTerms) {
        if (lowerTitle.includes(term)) matchCount += 3;
        if (lowerHeading.includes(term)) matchCount += 2;
        if (lowerContent.includes(term)) matchCount += 1;
      }

      if (matchCount > 0) {
        keywordHits.push({ chunk, score: matchCount });
      }
    }

    keywordHits.sort((a, b) => b.score - a.score);
    const topKeywords = keywordHits.slice(0, 15);

    // 3. Reciprocal Rank Fusion (RRF)
    const rrfScores = new Map<string, { chunk: DocumentChunk; score: number; matchType: 'semantic' | 'lexical' | 'hybrid' }>();

    vectorHits.forEach((hit, rank) => {
      const rrf = 1 / (60 + rank + 1);
      rrfScores.set(hit.chunk.id, {
        chunk: hit.chunk,
        score: rrf,
        matchType: 'semantic'
      });
    });

    topKeywords.forEach((hit, rank) => {
      const rrf = 1 / (60 + rank + 1);
      const existing = rrfScores.get(hit.chunk.id);
      if (existing) {
        existing.score += rrf;
        existing.matchType = 'hybrid';
      } else {
        rrfScores.set(hit.chunk.id, {
          chunk: hit.chunk,
          score: rrf,
          matchType: 'lexical'
        });
      }
    });

    const combined = Array.from(rrfScores.values());
    combined.sort((a, b) => b.score - a.score);

    // Normalize top score
    const maxScore = combined[0]?.score || 1;
    return combined.slice(0, topK).map(item => ({
      chunk: item.chunk,
      score: Math.min(1, item.score / maxScore),
      matchType: item.matchType
    }));
  }

  /**
   * Finds semantically related notes for a given active note.
   */
  public async getRelatedNotes(filePath: string, topK = 4): Promise<{ noteTitle: string; filePath: string; wikilink: string; similarity: number }[]> {
    const allChunks = this.vectorStore.getAllChunks();
    const noteChunks = allChunks.filter(c => c.filePath === filePath && c.vector);

    if (noteChunks.length === 0) return [];

    // Use the primary chunk vector as representation
    const repVector = noteChunks[0].vector!;
    const hits = this.vectorStore.searchVector(repVector, topK * 3, { excludePath: filePath });

    const seenNotes = new Set<string>();
    const results: { noteTitle: string; filePath: string; wikilink: string; similarity: number }[] = [];

    for (const hit of hits) {
      if (seenNotes.has(hit.chunk.filePath)) continue;
      seenNotes.add(hit.chunk.filePath);

      results.push({
        noteTitle: hit.chunk.noteTitle,
        filePath: hit.chunk.filePath,
        wikilink: `[[${hit.chunk.noteTitle}]]`,
        similarity: Math.round(Math.max(0, hit.score) * 100)
      });

      if (results.length >= topK) break;
    }

    return results;
  }

  /**
   * Constructs the grounded RAG context prompt with strict wikilink citation instructions.
   */
  public buildPromptContext(query: string, searchResults: RAGSearchResult[]): { systemPrompt: string; userPrompt: string } {
    const contextBlocks = searchResults.map((res, i) => {
      return `[Chunk ${i + 1}] Source: ${res.chunk.wikilink}\n${res.chunk.content.trim()}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are the Obsidian Vault Assistant. You have direct access to the user's personal knowledge base.
Your job is to answer the user's question accurately and helpfully using the provided context chunks from their vault.

CRITICAL RULES:
1. Base your answer strictly on the facts present in the vault context.
2. Every major claim or insight MUST cite the source using native Obsidian wikilink syntax, e.g. [[Note Title#Heading]] or [[Note Title]].
3. Never use raw bracket citations like [1] or [Chunk 1]. Always write [[Note Title#Heading]].
4. If the context does not contain enough information to fully answer, answer what you can from the notes and clearly state what is missing.
5. Format your response cleanly in GitHub Flavored Markdown (bullet points, bold highlights, code blocks).`;

    const userPrompt = `[VAULT CONTEXT]:\n${contextBlocks}\n\n[USER QUESTION]:\n${query}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Streams a grounded response from the configured LLM (Ollama or OpenAI).
   */
  public async *streamChat(
    query: string,
    searchResults: RAGSearchResult[],
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): AsyncGenerator<string, void, unknown> {
    const { systemPrompt, userPrompt } = this.buildPromptContext(query, searchResults);
    const config = this.embeddingProvider.getConfig();

    if (config.provider === 'ollama') {
      const baseUrl = config.ollamaUrl || 'http://127.0.0.1:11434';
      const model = config.chatModel || 'llama3.2';

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4),
        { role: 'user', content: userPrompt }
      ];

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama chat stream failed: HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream from Ollama');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch {}
        }
      }
      return;
    }

    // OpenAI-compatible streaming
    if (config.provider === 'openai' && config.apiKey) {
      const url = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4),
        { role: 'user', content: userPrompt }
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.chatModel || 'gpt-4o-mini',
          messages,
          stream: true
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI chat stream failed: HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const clean = line.replace(/^data:\s*/, '').trim();
          if (!clean || clean === '[DONE]') continue;
          try {
            const parsed = JSON.parse(clean);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {}
        }
      }
      return;
    }

    // Offline Mock / Fallback if no provider running
    yield `I found **${searchResults.length} relevant sections** in your vault for: *"${query}"*:\n\n`;
    for (const res of searchResults) {
      yield `* **${res.chunk.wikilink}** (${Math.round(res.score * 100)}% match)\n  > ${res.chunk.content.slice(0, 180).replace(/\n/g, ' ')}...\n\n`;
    }
    yield `\n> [!NOTE]\n> To generate AI natural language synthesis, please start **Ollama** locally (\`ollama run llama3.2\`) or add an API key in Settings.`;
  }
}
