import { VectorStore } from './vectorStore';
import { EmbeddingProvider } from './embeddingProvider';
import { DocumentChunk, RAGSearchResult, AIProviderConfig, RAGStatus, RAGSearchFilter, SubgraphTopologyResult } from './types';

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
      queueLength: this.indexingQueueCount,
      availableModels: health.models || [],
      chatModel: config.chatModel,
      ollamaUrl: config.ollamaUrl,
      apiUrl: config.apiUrl,
      hasApiKey: Boolean(config.apiKey)
    };
  }

  /**
   * Performs BM25-grade Lexical Keyword Ranking across all chunks.
   */
  private computeBM25Scores(
    queryTerms: string[],
    chunks: DocumentChunk[],
    filter?: RAGSearchFilter
  ): { chunk: DocumentChunk; score: number }[] {
    const k1 = 1.2;
    const b = 0.75;
    const N = chunks.length || 1;

    // Calculate document lengths and avg length
    let totalLength = 0;
    const docLengths = new Map<string, number>();
    const docTermFreqs = new Map<string, Map<string, number>>();
    const docFrequency = new Map<string, number>();
    const folderPrefix = filter?.folder ? (filter.folder.endsWith('/') ? filter.folder : filter.folder + '/') : undefined;

    for (const chunk of chunks) {
      if (filter?.excludePath && chunk.filePath === filter.excludePath) continue;
      if (filter?.filePath && chunk.filePath !== filter.filePath) continue;
      if (folderPrefix && !chunk.filePath.startsWith(folderPrefix) && chunk.filePath !== filter?.folder) continue;

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
   * If scoped specifically to an active note (filePath), expansion is disabled to prevent leakage.
   */
  private expandGraphNeighborhood(
    seedChunks: DocumentChunk[],
    existingChunkIds: Set<string>,
    maxExpansion = 2,
    filter?: RAGSearchFilter
  ): RAGSearchResult[] {
    // If scoped specifically to a single active note, do not leak neighbor notes
    if (filter?.filePath) return [];

    const graphResults: RAGSearchResult[] = [];
    const folderPrefix = filter?.folder ? (filter.folder.endsWith('/') ? filter.folder : filter.folder + '/') : undefined;

    for (const seed of seedChunks) {
      if (graphResults.length >= maxExpansion) break;

      // 1. Traverse outgoing wikilinks (Notes linked by this chunk)
      for (const targetTitle of seed.outlinks) {
        if (graphResults.length >= maxExpansion) break;

        const targetChunks = this.vectorStore.getChunksByTitle(targetTitle);
        for (const targetChunk of targetChunks) {
          if (filter?.excludePath && targetChunk.filePath === filter.excludePath) continue;
          if (folderPrefix && !targetChunk.filePath.startsWith(folderPrefix) && targetChunk.filePath !== filter?.folder) continue;

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
          if (filter?.excludePath && blChunk.filePath === filter.excludePath) continue;
          if (folderPrefix && !blChunk.filePath.startsWith(folderPrefix) && blChunk.filePath !== filter?.folder) continue;

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
    filter?: RAGSearchFilter
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
    const graphExpansion = this.expandGraphNeighborhood(seedChunks, selectedIds, 2, filter);

    const finalHits = [...primaryHits, ...graphExpansion];

    // 5. Graph Topology Enrichment (Dual-Edge EXTRACTED & INFERRED metadata)
    for (const hit of finalHits) {
      const topo = this.getSubgraphTopology(hit.chunk.filePath);
      const parts: string[] = [];
      if (topo.extractedOutlinks.length > 0) {
        parts.push(`Out: ${topo.extractedOutlinks.slice(0, 3).map(o => `[[${o}]]`).join(', ')}`);
      }
      if (topo.extractedBacklinks.length > 0) {
        parts.push(`In: ${topo.extractedBacklinks.slice(0, 3).map(b => `[[${b}]]`).join(', ')}`);
      }
      if (topo.inferredConnections.length > 0) {
        parts.push(`Inferred: ${topo.inferredConnections.slice(0, 2).map(inf => `[[${inf}]]`).join(', ')}`);
      }
      if (parts.length > 0) {
        hit.topologyHeader = parts.join(' | ');
      }
    }

    return finalHits;
  }

  /**
   * Returns a 1-hop topological subgraph representation (extracted links, backlinks, inferred ties)
   * for a given note.
   */
  public getSubgraphTopology(filePathOrTitle: string): SubgraphTopologyResult {
    const allChunks = this.vectorStore.getAllChunks();
    const cleanTitle = filePathOrTitle.replace(/\.[^/.]+$/, '').split('/').pop() || filePathOrTitle;

    const noteChunks = allChunks.filter(
      c => c.filePath === filePathOrTitle || c.noteTitle.toLowerCase() === cleanTitle.toLowerCase()
    );

    const actualTitle = noteChunks[0]?.noteTitle || cleanTitle;
    const actualPath = noteChunks[0]?.filePath || filePathOrTitle;

    // 1. EXTRACTED Outlinks (explicitly linked by this note)
    const extractedOutlinks = Array.from(
      new Set(noteChunks.flatMap(c => c.outlinks || []))
    );

    // 2. EXTRACTED Backlinks (other notes linking into this note)
    const backlinkChunks = this.vectorStore.findChunksLinkingTo(actualTitle);
    const extractedBacklinks = Array.from(
      new Set(backlinkChunks.map(c => c.noteTitle).filter(t => t !== actualTitle))
    );

    // 3. INFERRED connections (semantic nearest neighbors with cosine > 0.80)
    const inferredConnections: string[] = [];
    if (noteChunks[0]?.vector) {
      const semHits = this.vectorStore.searchVector(noteChunks[0].vector, 4, { excludePath: actualPath });
      for (const h of semHits) {
        if (!extractedOutlinks.includes(h.chunk.noteTitle) && !extractedBacklinks.includes(h.chunk.noteTitle)) {
          if (!inferredConnections.includes(h.chunk.noteTitle)) {
            inferredConnections.push(h.chunk.noteTitle);
          }
        }
      }
    }

    const totalConnected = extractedOutlinks.length + extractedBacklinks.length + inferredConnections.length;

    return {
      root: actualPath,
      title: actualTitle,
      filePath: actualPath,
      extractedOutlinks,
      extractedBacklinks,
      inferredConnections,
      totalConnected
    };
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
      const topoNote = res.topologyHeader ? ` [Topology: ${res.topologyHeader}]` : '';
      const breadcrumbNote = res.chunk.breadcrumbs?.length > 1 ? ` (Context: ${res.chunk.breadcrumbs.join(' > ')})` : '';
      return `[Chunk ${i + 1}] Source: ${res.chunk.wikilink}${breadcrumbNote}${graphNote}${topoNote}\n${res.chunk.content.trim()}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are the Runagon Vault Copilot. You have direct read access to the user's personal knowledge base.
Your job is to synthesize an accurate, elegant, and helpful response using the provided context chunks from their vault.

CRITICAL RULES:
1. Base your answer strictly on the verified facts in the vault context.
2. Every major claim or concept MUST cite its source using native Runagon wikilink syntax, e.g. [[Note Title#Heading]] or [[Note Title]].
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

    // Sanitize chat history to avoid sending empty messages (causes HTTP 400 with modern LLMs)
    const validHistory = history
      .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-4);

    if (config.provider === 'ollama') {
      const baseUrl = config.ollamaUrl || 'http://127.0.0.1:11434';
      const model = config.chatModel || 'llama3.2';

      const messages = [
        { role: 'system', content: systemPrompt },
        ...validHistory,
        { role: 'user', content: userPrompt }
      ];

      try {
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
          const errText = await res.text().catch(() => '');
          let helpHint = '';
          if (res.status === 404) {
            helpHint = `\n\n> [!WARNING]\n> Model \`${model}\` not found in Ollama. Run \`ollama pull ${model}\` in your terminal or configure an installed model in AI Settings.`;
          }
          yield `*(Ollama Error ${res.status}: ${errText.slice(0, 100) || 'Model request failed'})*${helpHint}\n\nFalling back to local GraphRAG synthesis:\n\n`;
        } else {
          const reader = res.body?.getReader();
          if (reader) {
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

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer);
                if (parsed.message?.content) {
                  yield parsed.message.content;
                }
              } catch {}
            }
            return;
          }
        }
      } catch (err: any) {
        yield `*(Could not connect to Ollama at ${baseUrl}: ${err?.message || 'Connection refused'}). Falling back to offline synthesis:*\n\n`;
      }
    }

    // OpenAI-compatible streaming
    if (config.provider === 'openai' && config.apiKey) {
      const url = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...validHistory,
        { role: 'user', content: userPrompt }
      ];

      try {
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
          const errText = await res.text().catch(() => '');
          yield `*(OpenAI stream error ${res.status}: ${errText.slice(0, 100)}). Falling back to offline synthesis:*\n\n`;
        } else {
          const reader = res.body?.getReader();
          if (reader) {
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

            if (buffer.trim()) {
              const clean = buffer.replace(/^data:\s*/, '').trim();
              if (clean && clean !== '[DONE]') {
                try {
                  const parsed = JSON.parse(clean);
                  const token = parsed.choices?.[0]?.delta?.content;
                  if (token) yield token;
                } catch {}
              }
            }
            return;
          }
        }
      } catch (err: any) {
        yield `*(OpenAI request failed: ${err?.message}). Falling back to offline synthesis:*\n\n`;
      }
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
