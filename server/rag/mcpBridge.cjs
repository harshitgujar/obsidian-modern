#!/usr/bin/env node
/**
 * Runagon - Model Context Protocol (MCP) Stdio Bridge
 * Connects Claude Desktop, Cursor, and other external MCP AI clients to Runagon Vault Memory.
 *
 * Usage:
 *   node mcpBridge.cjs [vaultPath] [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Command line arguments with intelligent defaults
const rawVault = (process.argv[2] || '').replace(/^["']|["']$/g, '').trim();
const vaultPath = rawVault ? path.resolve(rawVault) : path.resolve(__dirname, '../../vault');
const serverHost = process.env.RUNAGON_HOST || process.env.OBSIDIAN_HOST || '127.0.0.1';

/**
 * Auto-healing dynamic port discovery:
 * Reads .obsidian/active-port if available, otherwise checks CLI args and env.
 */
function getEffectivePort() {
  const portFile = path.join(vaultPath, '.obsidian', 'active-port');
  if (fs.existsSync(portFile)) {
    try {
      const p = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
      if (!isNaN(p) && p > 0) return p;
    } catch {}
  }
  if (process.argv[3]) {
    const p = parseInt(process.argv[3].replace(/^["']|["']$/g, ''), 10);
    if (!isNaN(p) && p > 0) return p;
  }
  if (process.env.RUNAGON_PORT || process.env.OBSIDIAN_PORT) {
    const p = parseInt(process.env.RUNAGON_PORT || process.env.OBSIDIAN_PORT, 10);
    if (!isNaN(p) && p > 0) return p;
  }
  return 5175;
}

/**
 * Sends an HTTP request to the running Runagon server.
 */
function callVaultMcp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const activePort = getEffectivePort();
    const payload = JSON.stringify({ method, params });
    const req = http.request(
      {
        hostname: serverHost,
        port: activePort,
        path: '/api/vault/ai/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 10000
      },
      res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Invalid JSON from Runagon server: ${data.slice(0, 100)}`));
          }
        });
      }
    );

    req.on('error', err => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Runagon server request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Offline fallback retrieval when Runagon app is closed:
 * Performs lexical search directly over the vault's cached .obsidian/ai-index/chunks.json.
 */
function searchVaultOffline(query, topK = 5) {
  const chunksPath = path.join(vaultPath, '.obsidian', 'ai-index', 'chunks.json');
  if (!fs.existsSync(chunksPath)) {
    return [
      {
        source: '[[Runagon]]',
        noteTitle: 'Runagon App Closed',
        score: 100,
        content: 'Runagon is not currently open, and no offline index was found. Please launch Runagon to initialize and search your vault memory.'
      }
    ];
  }

  try {
    const raw = fs.readFileSync(chunksPath, 'utf8');
    const chunks = JSON.parse(raw);
    const qLower = (query || '').toLowerCase().trim();
    const terms = qLower.split(/\s+/).filter(t => t.length > 1);

    const scored = [];
    for (const chunk of chunks) {
      const contentLower = (chunk.content || '').toLowerCase();
      const titleLower = (chunk.noteTitle || '').toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (titleLower.includes(term)) score += 5;
        if (contentLower.includes(term)) score += 1;
      }

      if (score > 0) {
        scored.push({
          source: chunk.wikilink || `[[${chunk.noteTitle}]]`,
          noteTitle: chunk.noteTitle,
          filePath: chunk.filePath,
          heading: chunk.heading,
          score: Math.min(100, score * 10),
          matchType: 'offline-lexical',
          content: chunk.content
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  } catch (err) {
    return [
      {
        source: '[[Error]]',
        noteTitle: 'Offline Index Error',
        score: 0,
        content: `Failed reading offline index: ${err.message}`
      }
    ];
  }
}

/**
 * Offline fallback for related notes when Obsidian app is closed.
 */
function getRelatedNotesOffline(filePath) {
  const chunksPath = path.join(vaultPath, '.obsidian', 'ai-index', 'chunks.json');
  if (!fs.existsSync(chunksPath)) return [];
  try {
    const raw = fs.readFileSync(chunksPath, 'utf8');
    const chunks = JSON.parse(raw);
    const targetChunk = chunks.find(c => c.filePath === filePath);
    if (!targetChunk || !Array.isArray(targetChunk.outlinks)) return [];

    return targetChunk.outlinks.map(link => ({
      noteTitle: link,
      wikilink: `[[${link}]]`,
      similarity: 75
    }));
  } catch {
    return [];
  }
}

/**
 * Writes a JSON-RPC 2.0 response to stdout.
 */
function sendJsonRpc(id, result, error) {
  const msg = { jsonrpc: '2.0', id };
  if (error) {
    msg.error = typeof error === 'string' ? { code: -32603, message: error } : error;
  } else {
    msg.result = result;
  }
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Standard tool definitions for Model Context Protocol clients.
 */
const TOOLS = [
  {
    name: 'search_vault_memory',
    description: 'Searches the user\'s personal Runagon knowledge base using semantic hybrid retrieval (GraphRAG). Returns grounded notes with [[wikilinks]], headings, and relevance scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language question, search terms, or concept to retrieve from the vault.'
        },
        topK: {
          type: 'number',
          description: 'Maximum number of notes to return (default: 5).'
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
          description: 'The relative file path of the note, e.g. "Guides/Link notes.md".'
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
    description: 'Returns index statistics, number of indexed notes, chunk counts, and model health.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Setup Line Reader for stdio communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async line => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    sendJsonRpc(null, null, { code: -32700, message: 'Parse error: invalid JSON' });
    return;
  }

  const { id, method, params } = request;

  // 1. Initialize Handshake
  if (method === 'initialize') {
    sendJsonRpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'runagon-vault-memory',
        version: '1.0.0'
      }
    });
    return;
  }

  // 2. Initialized Notification (no response needed)
  if (method === 'notifications/initialized') {
    return;
  }

  // 3. Ping (MCP Specification)
  if (method === 'ping') {
    sendJsonRpc(id, {});
    return;
  }

  // 4. Tools Listing
  if (method === 'tools/list') {
    sendJsonRpc(id, { tools: TOOLS });
    return;
  }

  // 5. Prompts & Resources Listing (MCP Specification)
  if (method === 'prompts/list') {
    sendJsonRpc(id, { prompts: [] });
    return;
  }

  if (method === 'resources/list') {
    sendJsonRpc(id, { resources: [] });
    return;
  }

  // 6. Tools Execution
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      // First try live server for real-time 60 FPS GraphRAG
      const res = await callVaultMcp('tools/call', { name: toolName, arguments: toolArgs });
      sendJsonRpc(id, res);
    } catch (serverErr) {
      // Graceful offline fallback: if server is down, retrieve from cached vault index
      if (toolName === 'search_vault_memory') {
        const offlineResults = searchVaultOffline(toolArgs.query || '', toolArgs.topK || 5);
        sendJsonRpc(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  notice: 'Runagon app is offline. Results retrieved from local cached vault index.',
                  results: offlineResults
                },
                null,
                2
              )
            }
          ]
        });
      } else if (toolName === 'get_related_notes') {
        const offlineRelated = getRelatedNotesOffline(toolArgs.filePath || '');
        sendJsonRpc(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  notice: 'Runagon app is offline. Related notes derived from static outlinks.',
                  related: offlineRelated
                },
                null,
                2
              )
            }
          ]
        });
      } else if (toolName === 'get_subgraph_topology') {
        const offlineRelated = getRelatedNotesOffline(toolArgs.filePathOrTitle || '');
        sendJsonRpc(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  notice: 'Runagon app is offline. Topology derived from static cached links.',
                  root: toolArgs.filePathOrTitle,
                  extractedOutlinks: offlineRelated.map(r => r.noteTitle),
                  extractedBacklinks: [],
                  inferredConnections: []
                },
                null,
                2
              )
            }
          ]
        });
      } else if (toolName === 'get_vault_ai_status') {
        sendJsonRpc(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'offline',
                  notice: 'Runagon desktop app is currently closed. Launch the app to access live embeddings and real-time updates.'
                },
                null,
                2
              )
            }
          ]
        });
      } else {
        sendJsonRpc(id, {
          content: [
            {
              type: 'text',
              text: `Tool ${toolName} requires Runagon app to be open.`
            }
          ]
        });
      }
    }
    return;
  }

  // Unsupported methods (ignore notifications without id)
  if (id !== undefined) {
    sendJsonRpc(id, null, { code: -32601, message: `Method not found: ${method}` });
  }
});

// Process signal handling
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
