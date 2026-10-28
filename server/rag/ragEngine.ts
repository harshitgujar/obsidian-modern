import { VectorStore } from './vectorStore';
import { EmbeddingProvider } from './embeddingProvider';
import { DocumentChunk, RAGSearchResult, AIProviderConfig, RAGStatus } from './types';

export class RAGEngine {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private vaultDir: string;
  private isIndexing = false;
  private indexingQueueCount = 0;

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

  public setIndexingStatus(isIndexing: boolean, queueCount = 0) {
    this.isIndexing = isIndexing;
    this.indexingQueueCount = queueCount;
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
      lastIndexTime: stats.lastUpdated,
      queueLength: this.indexingQueueCount
    };
  }

  /**
   * Performs BM25-grade Lexical Keyword Ranking across all chunks.
   */
  private computeBM25Scores(
    queryTerms: string[],
    chunks: DocumentChunk[],
    filter?: { folder?: string; excludePath?: string }
  ): { chunk: DocumentChunk; score: number }[] {
    const k1 = 1.2;
    const b = 0.75;
    const N = chunks.length || 1;

    // Calculate document lengths and avg length
    let totalLength = 0;
    const docLengths = new Map<string, number>();
    const docTermFreqs = new Map<string, Map<string, number>>();
    const docFrequency = new Map<string, number>();

    for (const chunk of chunks) {
      if (filter?.excludePath && chunk.filePath === filter.excludePath) continue;
      if (filter?.folder && !chunk.filePath.startsWith(filter.folder)) continue;

      const words = chunk.content.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
      const len = words.length;
      totalLength += len;
      docLengths.set(chunk.id, len);

      const tfMap = new Map<string, number>();
      for (const w of words) {
        tfMap.set(w, (tfMap.get(w) || 0) + 1);
      }
      docTermFreqs.set(chunk.id, tfMap);

      // Unique terms in doc for DF
      for (const term of tfMap.keys()) {
        docFrequency.set(term, (docFrequency.get(term) || 0) + 1);
      }
    }

    const avgdl = totalLength / (docLengths.size || 1);
    const results: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of chunks) {
      const tfMap = docTermFreqs.get(chunk.id);
      if (!tfMap) continue;

      const docLen = docLengths.get(chunk.id) || avgdl;
      let score = 0;

      for (const term of queryTerms) {
        const tf = tfMap.get(term) || 0;
        if (tf === 0) continue;

        const df = docFrequency.get(term) || 0;
        // Robertson-Spärck Jones IDF formula
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const num = tf * (k1 + 1);
        const denom = tf + k1 * (1 - b + b * (docLen / avgdl));
        score += idf * (num / denom);
      }

      // Exact match boosts: title, heading, tag, or wikilink matches
      const lowerQuery = queryTerms.join(' ');
      if (chunk.noteTitle.toLowerCase().includes(lowerQuery)) score += 5.0;
      if (chunk.heading.toLowerCase().includes(lowerQuery)) score += 3.0;
      if (chunk.tags.some(t => t.toLowerCase() === lowerQuery)) score += 4.0;
      if (chunk.outlinks.some(l => l.toLowerCase() === lowerQuery)) score += 3.0;

      if (score > 0) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * GraphRAG: Performs 1-Hop Knowledge Graph Expansion on top seed chunks.
   * Traverses explicit outlinks and backlinks to bring human-curated connections into context.
   */
  private expandGraphNeighborhood(
    seedChunks: DocumentChunk[],
    existingChunkIds: Set<string>,
    maxExpansion = 2
  ): RAGSearchResult[] {
    const graphResults: RAGSearchResult[] = [];

    for (const seed of seedChunks) {
      if (graphResults.length >= maxExpansion) break;

      // 1. Traverse outgoing wikilinks (Notes linked by this chunk)
      for (const targetTitle of seed.outlinks) {
        if (graphResults.length >= maxExpansion) break;

        const targetChunks = this.vectorStore.getChunksByTitle(targetTitle);
        for (const targetChunk of targetChunks) {
          if (!existingChunkIds.has(targetChunk.id)) {
            existingChunkIds.add(targetChunk.id);
            graphResults.push({
              chunk: targetChunk,
              score: 0.85,
              matchType: 'graph',
              graphSource: `Directly linked from [[${seed.noteTitle}]]`
            });
            break;
          }
        }
      }

      // 2. Traverse incoming backlinks (Notes linking into this note)
      if (graphResults.length < maxExpansion) {
        const backlinkChunks = this.vectorStore.findChunksLinkingTo(seed.noteTitle);
        for (const blChunk of backlinkChunks) {
          if (!existingChunkIds.has(blChunk.id)) {
            existingChunkIds.add(blChunk.id);
            graphResults.push({
              chunk: blChunk,
              score: 0.80,
              matchType: 'graph',
              graphSource: `Referenced by [[${blChunk.noteTitle}]]`
            });
            break;
          }
        }
      }
    }

    return graphResults;
  }

  /**
   * Performs Graph-Augmented Hybrid Search:
   * 1. Dense Vector Cosine Similarity (semantic conceptual matches)
   * 2. BM25 Lexical Ranking (exact terms, codes, tags)
   * 3. Reciprocal Rank Fusion (RRF)
   * 4. 1-Hop Knowledge Graph Expansion (traverses manual [[wikilinks]])
   */
  public async search(
    query: string,
    topK = 5,
    filter?: { folder?: string; excludePath?: string }
  ): Promise<RAGSearchResult[]> {
    if (!query.trim()) return [];

    // 1. Vector Search
    const queryVector = await this.embeddingProvider.getQueryEmbedding(query);
    const vectorHits = this.vectorStore.searchVector(queryVector, 20, filter);

    // 2. BM25 Lexical Search
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .map(t => t.replace(/[^a-z0-9_-]/g, ''))
      .filter(t => t.length > 1);

    const allChunks = this.vectorStore.getAllChunks();
    const bm25Hits = this.computeBM25Scores(queryTerms, allChunks, filter).slice(0, 20);

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

    bm25Hits.forEach((hit, rank) => {
      const rrf = 1 / (60 + rank + 1);
      const existing = rrfScores.get(hit.chunk.id);
      if (existing) {
        existing.score += rrf * 1.2; // Slight boost for hybrid consensus
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
    const primaryHits: RAGSearchResult[] = combined.slice(0, topK).map(item => ({
      chunk: item.chunk,
      score: Math.min(1, item.score / maxScore),
      matchType: item.matchType
    }));

    // 4. GraphRAG: 1-Hop Knowledge Graph Neighborhood Expansion
    const selectedIds = new Set(primaryHits.map(h => h.chunk.id));
    const seedChunks = primaryHits.slice(0, 2).map(h => h.chunk);
    const graphExpansion = this.expandGraphNeighborhood(seedChunks, selectedIds, 2);

    return [...primaryHits, ...graphExpansion];
  }

  /**
   * Finds semantically and topologically related notes for an active note.
   */
  public async getRelatedNotes(filePath: string, topK = 4): Promise<{ noteTitle: string; filePath: string; wikilink: string; similarity: number }[]> {
    const allChunks = this.vectorStore.getAllChunks();
    const noteChunks = allChunks.filter(c => c.filePath === filePath && c.vector);

    if (noteChunks.length === 0) return [];

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
   * Constructs the grounded RAG context prompt with strict wikilink citation instructions
   * and graph relationship metadata.
   */
  public buildPromptContext(query: string, searchResults: RAGSearchResult[]): { systemPrompt: string; userPrompt: string } {
    const contextBlocks = searchResults.map((res, i) => {
      const graphNote = res.graphSource ? ` [Knowledge Graph: ${res.graphSource}]` : '';
      const breadcrumbNote = res.chunk.breadcrumbs?.length > 1 ? ` (Context: ${res.chunk.breadcrumbs.join(' > ')})` : '';
      return `[Chunk ${i + 1}] Source: ${res.chunk.wikilink}${breadcrumbNote}${graphNote}\n${res.chunk.content.trim()}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are the Obsidian Vault Copilot. You have direct read access to the user's personal knowledge base.
Your job is to synthesize an accurate, elegant, and helpful response using the provided context chunks from their vault.

CRITICAL RULES:
1. Base your answer strictly on the verified facts in the vault context.
2. Every major claim or concept MUST cite its source using native Obsidian wikilink syntax, e.g. [[Note Title#Heading]] or [[Note Title]].
3. Never use raw bracket citations like [1] or [Chunk 1]. Always write [[Note Title#Heading]].
4. When context chunks indicate a Knowledge Graph link (e.g. "Directly linked from [[Note A]]"), acknowledge this conceptual connection.
5. If the context does not contain enough information, answer what you can from the notes and clearly explain what is missing.
6. Format your response cleanly in GitHub Flavored Markdown (bullet points, bold key terms, tables, code blocks).`;

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

    // Offline Intelligent Fallback Synthesis when no LLM is actively streaming
    yield `I analyzed your vault using **GraphRAG hybrid search** (BM25 + Dense Semantic Vectors + 1-Hop Graph Expansion) and retrieved **${searchResults.length} grounded sections** for: *"${query}"*:\n\n`;
    for (const res of searchResults) {
      const graphTag = res.graphSource ? ` • _${res.graphSource}_` : '';
      const matchTypeLabel = res.matchType === 'hybrid' ? 'Exact & Semantic Match' : res.matchType === 'graph' ? 'Graph Connected' : res.matchType === 'lexical' ? 'Keyword Match' : 'Semantic Match';
      yield `* **${res.chunk.wikilink}** (${Math.round(res.score * 100)}% relevance • ${matchTypeLabel}${graphTag})\n`;
      if (res.chunk.breadcrumbs && res.chunk.breadcrumbs.length > 1) {
        yield `  > *Breadcrumbs:* \`${res.chunk.breadcrumbs.join(' > ')}\`\n`;
      }
      yield `  > ${res.chunk.content.replace(/^\[.*?\]\n/, '').slice(0, 200).replace(/\n/g, ' ')}...\n\n`;
    }

    const linkedNotes = new Set<string>();
    for (const r of searchResults) {
      if (r.chunk.outlinks) {
        for (const l of r.chunk.outlinks) {
          linkedNotes.add(l);
        }
      }
    }
    if (linkedNotes.size > 0) {
      yield `### Connected Vault Concepts\nThese notes share explicit wikilinks with your search results:\n`;
      for (const link of Array.from(linkedNotes).slice(0, 6)) {
        yield `- [[${link}]]\n`;
      }
      yield `\n`;
    }

    yield `> [!TIP]\n> **Local AI Integration**: Start Ollama locally with \`ollama run llama3.2\` to enable full natural language synthesis without cloud servers.`;
  }
}
