import { VaultFile, NoteMetadata, GraphData, GraphNode, GraphEdge, BacklinkMention, NoteHeading, NoteTask } from '../types';

export class GraphIndexer {
  private metadataCache: Map<string, NoteMetadata> = new Map();
  private backlinksCache: Map<string, BacklinkMention[]> = new Map();
  private unlinkedMentionsCache: Map<string, BacklinkMention[]> = new Map();

  indexVault(files: VaultFile[]): GraphData {
    this.metadataCache.clear();
    this.backlinksCache.clear();
    this.unlinkedMentionsCache.clear();

    // 1. First pass: Parse metadata for all files
    for (const file of files) {
      const meta = this.parseNote(file);
      this.metadataCache.set(file.id, meta);
    }

    // 2. Second pass: Build connections & resolve wikilinks
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const backlinkCountMap: Map<string, number> = new Map();

    for (const file of files) {
      backlinkCountMap.set(file.id, 0);
    }

    // Match links
    for (const file of files) {
      const meta = this.metadataCache.get(file.id);
      if (!meta) continue;

      for (const rawLink of meta.outlinks) {
        const targetClean = rawLink.replace(/\.md$/, '').toLowerCase();
        // Find matching file
        const targetFile = files.find(f => {
          const nameClean = f.name.replace(/\.md$/, '').toLowerCase();
          const pathClean = f.path.replace(/\.md$/, '').toLowerCase();
          return nameClean === targetClean || pathClean === targetClean;
        });

        if (targetFile) {
          // Valid edge
          edges.push({
            source: file.id,
            target: targetFile.id
          });

          const currentCount = backlinkCountMap.get(targetFile.id) || 0;
          backlinkCountMap.set(targetFile.id, currentCount + 1);

          // Add to backlinks list
          const existingMentions = this.backlinksCache.get(targetFile.id) || [];
          existingMentions.push({
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            contextSnippet: this.extractSnippet(file.content, rawLink),
            line: 0,
            isLinked: true
          });
          this.backlinksCache.set(targetFile.id, existingMentions);
        }
      }
    }

    // 3. Third pass: Unlinked mentions
    for (const targetFile of files) {
      const targetTitle = targetFile.name.replace(/\.md$/, '');
      if (targetTitle.length < 3) continue; // Skip very short names to avoid false positives

      const regex = new RegExp(`(?<!\\[\\[)\\b${this.escapeRegExp(targetTitle)}\\b(?!\\]\\])`, 'gi');

      for (const sourceFile of files) {
        if (sourceFile.id === targetFile.id) continue;

        // If it's already an explicit linked outlink, skip
        const sourceMeta = this.metadataCache.get(sourceFile.id);
        const alreadyLinked = sourceMeta?.outlinks.some(
          l => l.toLowerCase() === targetTitle.toLowerCase()
        );
        if (alreadyLinked) continue;

        const match = regex.exec(sourceFile.content);
        if (match) {
          const existingUnlinked = this.unlinkedMentionsCache.get(targetFile.id) || [];
          existingUnlinked.push({
            fileId: sourceFile.id,
            filePath: sourceFile.path,
            fileName: sourceFile.name,
            contextSnippet: this.extractSnippet(sourceFile.content, targetTitle),
            line: 0,
            isLinked: false
          });
          this.unlinkedMentionsCache.set(targetFile.id, existingUnlinked);
        }
      }
    }

    // 4. Construct Graph Nodes with sizes and initial layout coordinates
    const folderColorMap: Record<string, string> = {
      '': '#8b5cf6', // Root - purple
      'Projects': '#10b981', // emerald
      'Technical': '#06b6d4', // cyan
      'Guides': '#f59e0b', // amber
      'Daily': '#ec4899', // pink
    };

    const count = files.length;
    const radius = Math.max(120, count * 25);

    files.forEach((file, index) => {
      const backlinks = backlinkCountMap.get(file.id) || 0;
      const angle = (index / count) * 2 * Math.PI;
      const meta = this.metadataCache.get(file.id);

      // Determine color
      let color = folderColorMap[file.folder] || '#a855f7';
      if (file.folder.includes('/')) {
        const topFolder = file.folder.split('/')[0];
        color = folderColorMap[topFolder] || '#a855f7';
      }

      nodes.push({
        id: file.id,
        label: file.name.replace(/\.md$/, ''),
        path: file.path,
        val: 6 + Math.min(backlinks * 3, 20),
        color,
        folder: file.folder,
        tags: meta?.tags || [],
        x: Math.cos(angle) * (radius * 0.7 + Math.random() * 50),
        y: Math.sin(angle) * (radius * 0.7 + Math.random() * 50),
        vx: 0,
        vy: 0
      });
    });

    return { nodes, edges };
  }

  getMetadata(fileId: string): NoteMetadata | undefined {
    return this.metadataCache.get(fileId);
  }

  getBacklinks(fileId: string): BacklinkMention[] {
    return this.backlinksCache.get(fileId) || [];
  }

  getUnlinkedMentions(fileId: string): BacklinkMention[] {
    return this.unlinkedMentionsCache.get(fileId) || [];
  }

  private parseNote(file: VaultFile): NoteMetadata {
    const content = file.content;
    const lines = content.split('\n');

    let frontmatter: Record<string, any> = {};
    let body = content;

    // Check for YAML frontmatter
    if (content.startsWith('---')) {
      const endIdx = content.indexOf('\n---', 3);
      if (endIdx !== -1) {
        const yamlStr = content.slice(4, endIdx).trim();
        frontmatter = this.parseSimpleYaml(yamlStr);
        body = content.slice(endIdx + 4);
      }
    }

    // Extract outlinks [[Link]] or [[Link|Alias]]
    const outlinks: string[] = [];
    const wikilinkRegex = /\[\[(.*?)\]\]/g;
    let match;
    while ((match = wikilinkRegex.exec(body)) !== null) {
      const raw = match[1];
      const target = raw.split('|')[0].trim();
      if (target && !outlinks.includes(target)) {
        outlinks.push(target);
      }
    }

    // Extract tags #tag or frontmatter tags
    const tagsSet = new Set<string>();
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach(t => tagsSet.add(String(t).replace(/^#/, '')));
    } else if (typeof frontmatter.tags === 'string') {
      frontmatter.tags.split(',').forEach(t => tagsSet.add(t.trim().replace(/^#/, '')));
    }

    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g;
    while ((match = tagRegex.exec(body)) !== null) {
      const tag = match[1];
      if (tag && !/^\d+$/.test(tag)) { // Ignore numbers
        tagsSet.add(tag);
      }
    }

    // Extract Headings
    const headings: NoteHeading[] = [];
    lines.forEach((line, idx) => {
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        headings.push({
          level: hMatch[1].length,
          text: hMatch[2].trim(),
          line: idx + 1
        });
      }
    });

    // Extract Tasks
    const tasks: NoteTask[] = [];
    lines.forEach((line, idx) => {
      const tMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)$/);
      if (tMatch) {
        tasks.push({
          completed: tMatch[1].toLowerCase() === 'x',
          text: tMatch[2].trim(),
          line: idx + 1
        });
      }
    });

    const words = body.trim().split(/\s+/).filter(Boolean).length;
    const chars = body.length;

    return {
      path: file.path,
      title: (frontmatter.title as string) || file.name.replace(/\.md$/, ''),
      frontmatter,
      outlinks,
      tags: Array.from(tagsSet),
      headings,
      tasks,
      wordCount: words,
      charCount: chars
    };
  }

  private parseSimpleYaml(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      if (val.startsWith('[') && val.endsWith(']')) {
        result[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      } else {
        result[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }

    return result;
  }

  private extractSnippet(content: string, keyword: string): string {
    const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 45);
    const end = Math.min(content.length, idx + keyword.length + 55);
    let snippet = content.slice(start, end).replace(/\n/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
  }

  private escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const graphIndexer = new GraphIndexer();
