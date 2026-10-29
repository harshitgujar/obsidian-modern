import { VaultFile, NoteMetadata, GraphData, GraphNode, GraphEdge, BacklinkMention } from '../types';
import { parseNoteMetadata } from '../workers/metadataWorker';

export interface GraphIndexOptions {
  showTags?: boolean;
  showAttachments?: boolean;
  hideUnresolved?: boolean;
  showOrphans?: boolean;
  colorGroups?: Array<{ query: string; color: string }>;
}

export class GraphIndexer {
  private metadataCache: Map<string, NoteMetadata> = new Map();
  private backlinksCache: Map<string, BacklinkMention[]> = new Map();
  private unlinkedMentionsCache: Map<string, BacklinkMention[]> = new Map();
  private worker: Worker | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        this.worker = new Worker(new URL('../workers/metadataWorker.ts', import.meta.url), {
          type: 'module'
        });
      } catch {
        this.worker = null;
      }
    }
  }

  indexVault(files: VaultFile[], options: GraphIndexOptions = {}): GraphData {
    this.metadataCache.clear();
    this.backlinksCache.clear();
    this.unlinkedMentionsCache.clear();

    const {
      showTags = false,
      showAttachments = false,
      hideUnresolved = false,
      showOrphans = true,
      colorGroups = []
    } = options;

    const mdAndCanvasFiles = files.filter(f => !f.isBinary);
    const binaryFiles = files.filter(f => f.isBinary);

    // 1. First pass: Parse metadata for all markdown & canvas files
    for (const file of mdAndCanvasFiles) {
      const meta = parseNoteMetadata(file);
      this.metadataCache.set(file.path, meta);
    }

    // Warm worker in background
    if (this.worker && mdAndCanvasFiles.length > 0) {
      try {
        this.worker.postMessage({ type: 'parse-batch', data: mdAndCanvasFiles });
      } catch {}
    }

    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const backlinkCountMap: Map<string, number> = new Map();

    const defaultFolderColors: Record<string, string> = {
      '': '#18181b',
      'Formatting': '#3f3f46',
      'Guides': '#52525b',
      'Adventurer': '#71717a',
      'Templates': '#27272a',
      'Daily': '#09090b',
      'Projects': '#18181b'
    };

    // Helper to compute node color from color groups or folder
    const computeFileColor = (file: VaultFile, meta?: NoteMetadata): string => {
      if (file.extension === 'canvas') return '#52525b';
      if (colorGroups && colorGroups.length > 0) {
        for (const cg of colorGroups) {
          if (!cg.query) continue;
          const q = cg.query.trim().toLowerCase();
          if (q.startsWith('path:')) {
            const qPath = q.slice(5).trim();
            if (file.path.toLowerCase().includes(qPath)) {
              return cg.color;
            }
          } else if (q.startsWith('tag:')) {
            const qTag = q.slice(4).trim().replace(/^#/, '');
            if (meta?.tags.some(t => t.toLowerCase() === qTag)) {
              return cg.color;
            }
          } else if (q.startsWith('file:')) {
            const qFile = q.slice(5).trim();
            if (file.name.toLowerCase().includes(qFile)) {
              return cg.color;
            }
          } else if (file.name.toLowerCase().includes(q) || file.path.toLowerCase().includes(q)) {
            return cg.color;
          }
        }
      }
      return defaultFolderColors[file.folder] || '#18181b';
    };

    // Add note files as nodes
    const totalFiles = mdAndCanvasFiles.length;
    const initialRadius = Math.max(160, totalFiles * 22);

    mdAndCanvasFiles.forEach((file, index) => {
      const meta = this.metadataCache.get(file.path);
      const angle = (index / Math.max(1, totalFiles)) * 2 * Math.PI;
      const color = computeFileColor(file, meta);

      nodesMap.set(file.path, {
        id: file.path,
        label: file.name.replace(/\.md$/, ''),
        path: file.path,
        val: 6,
        color,
        folder: file.folder,
        tags: meta?.tags || [],
        nodeType: 'file',
        x: Math.cos(angle) * (initialRadius * 0.75 + (index % 6) * 20),
        y: Math.sin(angle) * (initialRadius * 0.75 + (index % 6) * 20),
        vx: 0,
        vy: 0
      });
      backlinkCountMap.set(file.path, 0);
    });

    // 2. Second pass: Process outlinks, tags, attachments, and unresolved nodes
    const tagNodesSet = new Set<string>();
    const unresolvedNodesSet = new Set<string>();
    const attachmentNodesSet = new Set<string>();

    for (const file of mdAndCanvasFiles) {
      const meta = this.metadataCache.get(file.path);
      if (!meta) continue;

      const outTargets = [...meta.outlinks];

      // Parse .canvas file nodes
      if (file.extension === 'canvas') {
        try {
          const parsed = JSON.parse(file.content);
          if (Array.isArray(parsed.nodes)) {
            for (const cNode of parsed.nodes) {
              if (cNode.type === 'file' && cNode.file) {
                outTargets.push(cNode.file);
              }
            }
          }
        } catch {}
      }

      // Process Wikilinks
      for (const rawLink of outTargets) {
        const targetClean = rawLink.replace(/\.[^/.]+$/, '').toLowerCase();
        const targetFile = mdAndCanvasFiles.find(f => {
          const nameClean = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
          const pathClean = f.path.replace(/\.[^/.]+$/, '').toLowerCase();
          return nameClean === targetClean || pathClean === targetClean || f.path.toLowerCase() === rawLink.toLowerCase();
        });

        if (targetFile) {
          if (targetFile.path !== file.path) {
            edges.push({ source: file.path, target: targetFile.path });
            const count = (backlinkCountMap.get(targetFile.path) || 0) + 1;
            backlinkCountMap.set(targetFile.path, count);

            const mentions = this.backlinksCache.get(targetFile.path) || [];
            const { snippet, line } = this.extractSnippetAndLine(file.content, rawLink);
            mentions.push({
              fileId: file.path,
              filePath: file.path,
              fileName: file.name,
              contextSnippet: snippet,
              line,
              isLinked: true
            });
            this.backlinksCache.set(targetFile.path, mentions);
          }
        } else if (!hideUnresolved) {
          // Unresolved note link
          const unresolvedId = `unresolved:${rawLink}`;
          if (!nodesMap.has(unresolvedId)) {
            unresolvedNodesSet.add(rawLink);
            const angle = Math.random() * 2 * Math.PI;
            nodesMap.set(unresolvedId, {
              id: unresolvedId,
              label: rawLink,
              path: rawLink,
              val: 4,
              color: 'rgba(148, 163, 184, 0.55)',
              folder: '',
              tags: [],
              nodeType: 'unresolved',
              x: Math.cos(angle) * (initialRadius * 0.9),
              y: Math.sin(angle) * (initialRadius * 0.9),
              vx: 0,
              vy: 0
            });
          }
          edges.push({ source: file.path, target: unresolvedId });
        }
      }

      // Process Tags as graph nodes if showTags is true
      if (showTags) {
        for (const tag of meta.tags) {
          const tagId = `tag:#${tag}`;
          if (!nodesMap.has(tagId)) {
            tagNodesSet.add(tag);
            const angle = Math.random() * 2 * Math.PI;
            nodesMap.set(tagId, {
              id: tagId,
              label: `#${tag}`,
              path: tagId,
              val: 5,
              color: '#10b981', // Emerald green for tag nodes in Obsidian
              folder: '',
              tags: [tag],
              nodeType: 'tag',
              x: Math.cos(angle) * (initialRadius * 0.6),
              y: Math.sin(angle) * (initialRadius * 0.6),
              vx: 0,
              vy: 0
            });
          }
          edges.push({ source: file.path, target: tagId });
        }
      }

      // Process Attachments as graph nodes if showAttachments is true
      if (showAttachments) {
        for (const bin of binaryFiles) {
          if (file.content.includes(bin.path) || file.content.includes(bin.name)) {
            const attachId = `attach:${bin.path}`;
            if (!nodesMap.has(attachId)) {
              attachmentNodesSet.add(bin.path);
              const angle = Math.random() * 2 * Math.PI;
              nodesMap.set(attachId, {
                id: attachId,
                label: bin.name,
                path: bin.path,
                val: 4.5,
                color: '#f59e0b', // Amber yellow for attachment nodes
                folder: bin.folder,
                tags: [],
                nodeType: 'attachment',
                x: Math.cos(angle) * (initialRadius * 0.8),
                y: Math.sin(angle) * (initialRadius * 0.8),
                vx: 0,
                vy: 0
              });
            }
            edges.push({ source: file.path, target: attachId });
          }
        }
      }
    }

    // 3. Third pass: Unlinked mentions
    for (const targetFile of mdAndCanvasFiles) {
      if (targetFile.extension !== 'md') continue;
      const targetTitle = targetFile.name.replace(/\.md$/, '');
      if (targetTitle.length < 3) continue;

      const regex = new RegExp(`(?<!\\[\\[)\\b${this.escapeRegExp(targetTitle)}\\b(?!\\]\\])`, 'i');

      for (const sourceFile of mdAndCanvasFiles) {
        if (sourceFile.path === targetFile.path || sourceFile.extension !== 'md') continue;

        const sourceMeta = this.metadataCache.get(sourceFile.path);
        const alreadyLinked = sourceMeta?.outlinks.some(
          l => l.toLowerCase() === targetTitle.toLowerCase()
        );
        if (alreadyLinked) continue;

        const match = regex.exec(sourceFile.content);
        if (match) {
          const existingUnlinked = this.unlinkedMentionsCache.get(targetFile.path) || [];
          const { snippet, line } = this.extractSnippetAndLine(sourceFile.content, targetTitle);
          existingUnlinked.push({
            fileId: sourceFile.path,
            filePath: sourceFile.path,
            fileName: sourceFile.name,
            contextSnippet: snippet,
            line,
            isLinked: false
          });
          this.unlinkedMentionsCache.set(targetFile.path, existingUnlinked);
        }
      }
    }

    // Adjust node sizes based on backlinks count
    for (const [id, node] of nodesMap.entries()) {
      if (node.nodeType === 'file') {
        const backlinks = backlinkCountMap.get(id) || 0;
        node.val = 5 + Math.min(backlinks * 2.8, 20);
      }
    }

    let allNodes = Array.from(nodesMap.values());

    // Filter orphans if showOrphans is false
    if (!showOrphans) {
      const connectedNodeIds = new Set<string>();
      edges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });
      allNodes = allNodes.filter(n => connectedNodeIds.has(n.id));
    }

    return { nodes: allNodes, edges };
  }

  getMetadata(filePath: string): NoteMetadata | undefined {
    return this.metadataCache.get(filePath);
  }

  getBacklinks(filePath: string): BacklinkMention[] {
    return this.backlinksCache.get(filePath) || [];
  }

  getUnlinkedMentions(filePath: string): BacklinkMention[] {
    return this.unlinkedMentionsCache.get(filePath) || [];
  }

  private extractSnippetAndLine(content: string, keyword: string): { snippet: string; line: number } {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(keyword.toLowerCase());
    if (idx === -1) return { snippet: '', line: 1 };
    const line = content.slice(0, idx).split('\n').length;
    const start = Math.max(0, idx - 45);
    const end = Math.min(content.length, idx + keyword.length + 55);
    let snippet = content.slice(start, end).replace(/\n/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return { snippet, line };
  }

  private escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const graphIndexer = new GraphIndexer();
