import { RAGEngine } from './ragEngine';

export interface VaultFileDelegate {
  readFile: (relPath: string) => string;
  writeFile: (relPath: string, content: string) => any;
  resolveNotePath?: (filePathOrTitle: string) => string | null;
}

export class VaultMCPServer {
  private ragEngine: RAGEngine;
  private fileDelegate?: VaultFileDelegate;

  constructor(ragEngine: RAGEngine, fileDelegate?: VaultFileDelegate) {
    this.ragEngine = ragEngine;
    this.fileDelegate = fileDelegate;
  }

  /**
   * Returns MCP tool definitions for external AIs.
   */
  public listTools() {
    return [
      {
        name: 'search_vault_memory',
        description: 'Searches the user\'s personal Runagon knowledge base using semantic hybrid retrieval (GraphRAG). Returns grounded note sections with wikilinks, headings, and relevance scores.',
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
        name: 'get_subgraph_topology',
        description: 'Returns the 1-hop topological knowledge graph map for a note or code file (extracted links, backlinks, and inferred connections) without loading entire file bodies.',
        inputSchema: {
          type: 'object',
          properties: {
            filePathOrTitle: {
              type: 'string',
              description: 'The note title or relative file path to inspect.'
            }
          },
          required: ['filePathOrTitle']
        }
      },
      {
        name: 'get_vault_ai_status',
        description: 'Returns the current index health, number of chunks, and active embedding model.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'read_vault_note',
        description: 'Reads the complete raw Markdown text of an existing note in the vault by relative file path or title.',
        inputSchema: {
          type: 'object',
          properties: {
            filePathOrTitle: {
              type: 'string',
              description: 'Relative path (e.g. "Features/Feature X.md") or note title (e.g. "Feature X").'
            }
          },
          required: ['filePathOrTitle']
        }
      },
      {
        name: 'create_vault_note',
        description: 'Creates a brand new Markdown note in the user\'s vault with the specified content. Creates any missing subfolders automatically.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative path for the new note (e.g. "Features/New Idea.md" or "Daily/2026-11-06.md"). Will automatically append .md if missing.'
            },
            content: {
              type: 'string',
              description: 'The full Markdown content to write to the note.'
            }
          },
          required: ['filePath', 'content']
        }
      },
      {
        name: 'update_vault_note',
        description: 'Updates, rewrites, or appends to an existing Markdown note in the vault. Automatically saves a backup snapshot before writing.',
        inputSchema: {
          type: 'object',
          properties: {
            filePathOrTitle: {
              type: 'string',
              description: 'Relative path or title of the note to update (e.g. "Features/Feature X.md" or "Feature X").'
            },
            content: {
              type: 'string',
              description: 'The new Markdown content, or the text to append.'
            },
            mode: {
              type: 'string',
              enum: ['replace', 'append'],
              description: 'Either "replace" to overwrite the full note (default) or "append" to append to the end.'
            }
          },
          required: ['filePathOrTitle', 'content']
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
        topology: r.topologyHeader || undefined,
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

    if (name === 'get_subgraph_topology') {
      const target = String(args.filePathOrTitle || '');
      const topology = this.ragEngine.getSubgraphTopology(target);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(topology, null, 2)
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

    if (name === 'read_vault_note') {
      const target = String(args.filePathOrTitle || '').trim();
      if (!this.fileDelegate) {
        throw new Error('Vault file delegate is not connected to read notes.');
      }
      const resolvedPath = this.fileDelegate.resolveNotePath
        ? this.fileDelegate.resolveNotePath(target)
        : (target.endsWith('.md') ? target : `${target}.md`);

      if (!resolvedPath) {
        throw new Error(`Note not found in vault: "${target}"`);
      }

      const content = this.fileDelegate.readFile(resolvedPath);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              filePath: resolvedPath,
              noteTitle: resolvedPath.replace(/\.md$/, '').split('/').pop(),
              size: content.length,
              content
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'create_vault_note') {
      let relPath = String(args.filePath || '').trim().replace(/^["']|["']$/g, '');
      const content = String(args.content || '');
      if (!relPath) throw new Error('Missing filePath for note creation');
      if (!relPath.toLowerCase().endsWith('.md')) {
        relPath += '.md';
      }
      if (!this.fileDelegate) {
        throw new Error('Vault file delegate is not connected to create notes.');
      }

      this.fileDelegate.writeFile(relPath, content);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Note successfully created in vault: "${relPath}"`,
              filePath: relPath,
              bytesWritten: Buffer.byteLength(content, 'utf8')
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'update_vault_note') {
      const target = String(args.filePathOrTitle || '').trim().replace(/^["']|["']$/g, '');
      const newContent = String(args.content || '');
      const mode = args.mode === 'append' ? 'append' : 'replace';

      if (!target) throw new Error('Missing filePathOrTitle for note update');
      if (!this.fileDelegate) {
        throw new Error('Vault file delegate is not connected to update notes.');
      }

      const resolvedPath = this.fileDelegate.resolveNotePath
        ? this.fileDelegate.resolveNotePath(target)
        : (target.endsWith('.md') ? target : `${target}.md`);

      const targetPath = resolvedPath || (target.endsWith('.md') ? target : `${target}.md`);

      let finalContent = newContent;
      if (mode === 'append' && resolvedPath) {
        try {
          const current = this.fileDelegate.readFile(resolvedPath);
          finalContent = `${current.trimEnd()}\n\n${newContent.trimStart()}`;
        } catch {
          finalContent = newContent;
        }
      }

      this.fileDelegate.writeFile(targetPath, finalContent);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Note successfully updated in vault: "${targetPath}" (${mode} mode)`,
              filePath: targetPath,
              mode,
              bytesWritten: Buffer.byteLength(finalContent, 'utf8')
            }, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown MCP tool: ${name}`);
  }
}
