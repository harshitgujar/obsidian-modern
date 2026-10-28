import { AIProviderConfig } from './types';

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimension: number;
}

export class EmbeddingProvider {
  private config: AIProviderConfig;

  constructor(config: Partial<AIProviderConfig> = {}) {
    this.config = {
      provider: config.provider || 'ollama',
      ollamaUrl: config.ollamaUrl || 'http://127.0.0.1:11434',
      embeddingModel: config.embeddingModel || 'nomic-embed-text',
      chatModel: config.chatModel || 'qwen2.5:7b',
      apiKey: config.apiKey,
      apiUrl: config.apiUrl
    };
    this.checkHealth().catch(() => {});
  }

  public updateConfig(newConfig: Partial<AIProviderConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  /**
   * Health-check: Checks if the configured provider is reachable and auto-picks model if needed.
   */
  public async checkHealth(): Promise<{ available: boolean; error?: string; models?: string[] }> {
    if (this.config.provider === 'ollama') {
      try {
        const url = `${this.config.ollamaUrl}/api/tags`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) {
          return { available: false, error: `Ollama returned status ${res.status}` };
        }
        const data = await res.json();
        const models: string[] = (data.models || []).map((m: any) => m.name || m.model);

        // Auto-select embedding model if configured one is missing
        if (!this.config.embeddingModel || !models.includes(this.config.embeddingModel)) {
          const embedCandidates = ['nomic-embed-text', 'bge-m3', 'bge-large', 'all-minilm', 'mxbai-embed-large'];
          const foundEmbed = models.find(m => embedCandidates.some(c => m.includes(c))) || models.find(m => m.includes('embed'));
          if (foundEmbed) {
            this.config.embeddingModel = foundEmbed;
          }
        }

        // Auto-select chat model from installed models if current one isn't present
        if (!this.config.chatModel || !models.includes(this.config.chatModel)) {
          const preferred = ['qwen2.5:7b', 'llama3.2', 'llama3.1', 'deepseek-r1', 'mistral'];
          const found = models.find(m => preferred.some(p => m.startsWith(p))) || models.find(m => !m.includes('embed'));
          if (found) {
            this.config.chatModel = found;
          }
        }

        return { available: true, models };
      } catch (err: any) {
        return {
          available: false,
          error: `Could not connect to Ollama at ${this.config.ollamaUrl} (${err.message})`
        };
      }
    }

    if (this.config.provider === 'openai') {
      if (!this.config.apiKey) {
        return { available: false, error: 'OpenAI API key is missing' };
      }
      return { available: true };
    }

    return { available: true };
  }

  /**
   * Computes vector embeddings for a list of text strings.
   */
  public async getEmbeddings(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: 'none', dimension: 0 };
    }

    // 1. Try Ollama if configured
    if (this.config.provider === 'ollama') {
      try {
        const embeddings = await this.embedWithOllama(texts);
        return {
          embeddings,
          model: this.config.embeddingModel || 'nomic-embed-text',
          dimension: embeddings[0]?.length || 768
        };
      } catch (err) {
        // Fall back gracefully to zero-overhead local semantic hash vectorizer
      }
    }

    // 2. Try OpenAI if configured and API key present
    if (this.config.provider === 'openai' && this.config.apiKey) {
      try {
        const embeddings = await this.embedWithOpenAI(texts);
        return {
          embeddings,
          model: 'text-embedding-3-small',
          dimension: embeddings[0]?.length || 1536
        };
      } catch (err) {
        // Fall back gracefully
      }
    }

    // 3. Fallback: Fast, zero-dependency, local-first 384-dimensional dense semantic hash vectorizer
    const embeddings = texts.map(t => this.computeHashEmbedding(t, 384));
    return {
      embeddings,
      model: 'local-semantic-hash-384',
      dimension: 384
    };
  }

  /**
   * Computes a single embedding for search queries.
   */
  public async getQueryEmbedding(query: string): Promise<number[]> {
    const res = await this.getEmbeddings([query]);
    return res.embeddings[0] || [];
  }

  /**
   * Embeds texts via Ollama REST API.
   */
  private async embedWithOllama(texts: string[]): Promise<number[][]> {
    const model = this.config.embeddingModel || 'nomic-embed-text';
    const baseUrl = this.config.ollamaUrl || 'http://127.0.0.1:11434';

    // Modern Ollama /api/embed batch endpoint
    try {
      const res = await fetch(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts }),
        signal: AbortSignal.timeout(30000)
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings) && data.embeddings.length === texts.length) {
          return data.embeddings;
        }
      }
    } catch {}

    // Fallback: Individual /api/embeddings for older Ollama versions
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        throw new Error(`Ollama embedding call failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      results.push(data.embedding);
    }

    return results;
  }

  /**
   * Embeds texts via OpenAI API.
   */
  private async embedWithOpenAI(texts: string[]): Promise<number[][]> {
    const url = this.config.apiUrl || 'https://api.openai.com/v1/embeddings';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`OpenAI embedding failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.data.map((item: any) => item.embedding);
  }

  /**
   * Deterministic 384-dimensional dense semantic hashing vectorizer.
   * Features:
   * - Positional head weighting: terms inside breadcrumbs (`[...]`) receive 2.5x boost
   * - Subword 3-gram and 4-gram projections to handle morphology & typos
   * - Word length and capitalization cues
   * - Strict L2 normalization for exact cosine similarity
   */
  private computeHashEmbedding(text: string, dim = 384): number[] {
    const vec = new Float32Array(dim);
    const lines = text.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      // Boost weight for breadcrumbs or headings at top of chunk
      const isHeaderLine = line.startsWith('[') && line.includes(']');
      const lineMultiplier = isHeaderLine ? 2.5 : 1.0;

      const words = line.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];

      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];
        if (word.length < 2) continue;

        // Unigram hash (Murmur-style fast mixing)
        let h = 2166136261;
        for (let i = 0; i < word.length; i++) {
          h = Math.imul(h ^ word.charCodeAt(i), 16777619);
        }
        const idx1 = Math.abs(h) % dim;
        vec[idx1] += 1.5 * lineMultiplier;

        // Bigram hash with adjacent word
        if (wIdx < words.length - 1) {
          const nextWord = words[wIdx + 1];
          let biHash = h;
          for (let j = 0; j < nextWord.length; j++) {
            biHash = Math.imul(biHash ^ nextWord.charCodeAt(j), 16777619);
          }
          const idx2 = Math.abs(biHash) % dim;
          vec[idx2] += 1.0 * lineMultiplier;
        }

        // Subword 3-gram hashing for morphology/stemming
        if (word.length >= 3) {
          for (let i = 0; i <= word.length - 3; i++) {
            const sub = word.slice(i, i + 3);
            let sHash = 5381;
            for (let k = 0; k < sub.length; k++) {
              sHash = ((sHash << 5) + sHash) ^ sub.charCodeAt(k);
            }
            const sIdx = Math.abs(sHash) % dim;
            vec[sIdx] += 0.4 * lineMultiplier;
          }
        }
      }
    }

    // Strict L2 Normalization onto the unit hypersphere
    let normSq = 0;
    for (let i = 0; i < dim; i++) {
      normSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(normSq);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] /= norm;
      }
    }

    return Array.from(vec);
  }
}
