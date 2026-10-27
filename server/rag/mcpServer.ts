import { RAGEngine } from './ragEngine';

export class VaultMCPServer {
  private ragEngine: RAGEngine;

  constructor(ragEngine: RAGEngine) {
    this.ragEngine = ragEngine;
  }

  /**
   * Returns MCP tool definitions for external AIs.
   */
  public listTools() {
    return [
      {
        name: 'search_vault_memory',
        description: 'Searches the user\'s personal Obsidian knowledge base using semantic hybrid retrieval. Returns grounded note sections with wikilinks.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The natural language search query or concept to look up in the vault.'
            },
            topK: {
              type: 'number',
              description: 'Number of results to return (default: 5).'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_related_notes',
        description: 'Finds notes in the vault that are semantically connected to a given note.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'The relative file path of the note, e.g. "Adventurer/No prior experience.md".'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'get_vault_ai_status',
        description: 'Returns the current index health, number of chunks, and active embedding model.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Handles an MCP tool execution call.
   */
  public async callTool(name: string, args: Record<string, any>) {
    if (name === 'search_vault_memory') {
      const query = String(args.query || '');
      const topK = Number(args.topK) || 5;
      const results = await this.ragEngine.search(query, topK);

      const formatted = results.map((r, i) => ({
        index: i + 1,
        source: r.chunk.wikilink,
        noteTitle: r.chunk.noteTitle,
        filePath: r.chunk.filePath,
        score: Math.round(r.score * 100),
        matchType: r.matchType,
        content: r.chunk.content
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formatted, null, 2)
          }
        ]
      };
    }

    if (name === 'get_related_notes') {
      const filePath = String(args.filePath || '');
      const related = await this.ragEngine.getRelatedNotes(filePath);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(related, null, 2)
          }
        ]
      };
    }

    if (name === 'get_vault_ai_status') {
      const status = await this.ragEngine.getStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown MCP tool: ${name}`);
  }
}
