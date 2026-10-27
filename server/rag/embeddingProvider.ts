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

        // Auto-select chat model from installed models if current one isn't present
        if (!this.config.chatModel || !models.includes(this.config.chatModel)) {
          const preferred = ['qwen2.5:7b', 'llama3.2', 'llama3.1', 'deepseek-r1:14b', 'mistral'];
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
        console.warn('Ollama embedding failed, falling back to local hash vectorizer:', err);
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
        console.warn('OpenAI embedding failed, falling back to local hash vectorizer:', err);
      }
    }

    // 3. Fallback: Fast, zero-dependency deterministic subword hash vectorizer
    const embeddings = texts.map(t => this.computeHashEmbedding(t, 256));
    return {
      embeddings,
      model: 'local-hash-vectorizer',
      dimension: 256
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
    const results: number[][] = [];

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
        if (Array.isArray(data.embeddings)) {
          return data.embeddings;
        }
      }
    } catch {}

    // Fallback: Individual /api/embeddings for older Ollama versions
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
   * Deterministic L2-normalized token & char n-gram hash vectorizer (offline fallback).
   */
  private computeHashEmbedding(text: string, dim = 256): number[] {
    const vec = new Float32Array(dim);
    const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];

    for (const token of tokens) {
      let hash = 5381;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 33) ^ token.charCodeAt(i);
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1.0;

      // Also hash 3-grams
      if (token.length >= 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          const gram = token.slice(i, i + 3);
          let gHash = 5381;
          for (let j = 0; j < gram.length; j++) {
            gHash = (gHash * 33) ^ gram.charCodeAt(j);
          }
          vec[Math.abs(gHash) % dim] += 0.5;
        }
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] /= norm;
      }
    }

    return Array.from(vec);
  }
}
