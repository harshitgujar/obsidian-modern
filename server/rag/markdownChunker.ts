import crypto from 'node:crypto';
import { DocumentChunk } from './types';

interface FrontmatterResult {
  metadata: Record<string, any>;
  cleanContent: string;
}

/**
 * Parses YAML frontmatter if present at the top of markdown content.
 */
function extractFrontmatter(content: string): FrontmatterResult {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { metadata: {}, cleanContent: content };
  }

  const rawYaml = match[1];
  const cleanContent = content.slice(match[0].length);
  const metadata: Record<string, any> = {};

  for (const line of rawYaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      // Simple array handling: [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        metadata[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        metadata[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  return { metadata, cleanContent };
}

/**
 * Extracts inline #tags from markdown text.
 */
function extractInlineTags(text: string): string[] {
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g;
  const tags = new Set<string>();
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1];
    if (!/^\d+$/.test(tag)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/**
 * Extracts all [[Wikilinks]] from markdown text.
 */
function extractWikilinks(text: string): string[] {
  const linkRegex = /\[\[([^\]|#\r\n]+)(?:#[^\]|\r\n]+)?(?:\|[^\]\r\n]+)?\]\]/g;
  const links = new Set<string>();
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const raw = match[1].trim();
    if (raw) links.add(raw);
  }
  return Array.from(links);
}

interface ParsedSection {
  heading: string;
  headingLevel: number;
  breadcrumbs: string[];
  lines: string[];
}

/**
 * Splits lines into atomic blocks (paragraphs, complete code fences, tables)
 * so that code blocks and tables are NEVER broken in half across chunks.
 */
function splitIntoAtomicBlocks(lines: string[]): string[] {
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inCodeFence = false;
  let codeFenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code fence start/end
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceMarker = marker[0]; // '`' or '~'
        currentBlock.push(line);
      } else if (marker[0] === codeFenceMarker) {
        inCodeFence = false;
        currentBlock.push(line);
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
        continue;
      } else {
        currentBlock.push(line);
      }
      continue;
    }

    if (inCodeFence) {
      currentBlock.push(line);
      continue;
    }

    // Empty line separates blocks
    if (trimmed === '') {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }

  return blocks.filter(b => b.trim().length > 0);
}

/**
 * Chunks a markdown document with:
 * 1. AST-aware Hierarchical Heading Stacks (Breadcrumbs)
 * 2. Code Fence & Table Atomic Block Protection
 * 3. Outlink Graph Extraction
 * 4. Frontmatter & Tag Preservation
 */
export function chunkMarkdown(
  filePath: string,
  rawContent: string,
  options: { maxChunkChars?: number; minChunkChars?: number } = {}
): DocumentChunk[] {
  const maxChars = options.maxChunkChars || 1500; // ~375 tokens
  const minChars = options.minChunkChars || 120;

  const noteTitle = filePath.replace(/\.md$/, '').split('/').pop() || 'Untitled';
  const { metadata, cleanContent } = extractFrontmatter(rawContent);

  // Extract all document tags
  const docTags = new Set<string>();
  if (Array.isArray(metadata.tags)) {
    metadata.tags.forEach((t: string) => docTags.add(String(t).replace(/^#/, '')));
  } else if (typeof metadata.tags === 'string') {
    metadata.tags.split(/[\s,]+/).forEach((t: string) => docTags.add(t.replace(/^#/, '')));
  }
  extractInlineTags(cleanContent).forEach(t => docTags.add(t));

  const lines = cleanContent.split('\n');
  const sections: ParsedSection[] = [];

  // Hierarchical heading stack: maintains [H1, H2, H3] parentage
  const headingStack: { level: number; text: string }[] = [];
  let currentLines: string[] = [];
  let inCodeFence = false;
  let codeFenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track code fences so `# comment` inside code is not treated as a markdown heading
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceMarker = marker[0];
      } else if (marker[0] === codeFenceMarker) {
        inCodeFence = false;
      }
      currentLines.push(line);
      continue;
    }

    if (inCodeFence) {
      currentLines.push(line);
      continue;
    }

    // Heading match
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      // Flush previous section
      if (currentLines.length > 0) {
        const activeHeading = headingStack[headingStack.length - 1];
        sections.push({
          heading: activeHeading ? activeHeading.text : '',
          headingLevel: activeHeading ? activeHeading.level : 0,
          breadcrumbs: [noteTitle, ...headingStack.map(h => h.text)],
          lines: currentLines
        });
        currentLines = [];
      }

      // Pop headings that are same level or deeper
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, text });
    } else {
      currentLines.push(line);
    }
  }

  // Flush remaining lines
  if (currentLines.length > 0) {
    const activeHeading = headingStack[headingStack.length - 1];
    sections.push({
      heading: activeHeading ? activeHeading.text : '',
      headingLevel: activeHeading ? activeHeading.level : 0,
      breadcrumbs: [noteTitle, ...headingStack.map(h => h.text)],
      lines: currentLines
    });
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText && !section.heading) continue;

    // Sanitize heading for clean wikilink navigation without Markdown formatting artifacts
    const cleanHeading = section.heading
      ? section.heading.replace(/[*_~`#\[\]]/g, '').trim()
      : '';

    const wikilink = cleanHeading
      ? `[[${noteTitle}#${cleanHeading}]]`
      : `[[${noteTitle}]]`;

    // High-context hierarchical breadcrumb prefix
    const breadcrumbStr = section.breadcrumbs.join(' > ');
    const contextPrefix = `[${breadcrumbStr}]\n`;

    // If section fits comfortably within maxChars, keep it whole
    if (sectionText.length <= maxChars) {
      const fullContent = contextPrefix + (sectionText || section.heading);
      const chunkId = crypto
        .createHash('sha256')
        .update(`${filePath}::${cleanHeading}::${chunkIndex}`)
        .digest('hex')
        .slice(0, 16);

      const chunkOutlinks = extractWikilinks(fullContent);

      chunks.push({
        id: chunkId,
        filePath,
        noteTitle,
        heading: section.heading,
        headingLevel: section.headingLevel,
        breadcrumbs: section.breadcrumbs,
        wikilink,
        tags: Array.from(docTags),
        outlinks: chunkOutlinks,
        content: fullContent,
        charCount: fullContent.length,
        tokenEstimate: Math.ceil(fullContent.length / 4)
      });
      chunkIndex++;
    } else {
      // Split large section by atomic blocks (never splitting code or tables)
      const atomicBlocks = splitIntoAtomicBlocks(section.lines);
      let buffer = '';

      for (let b = 0; b < atomicBlocks.length; b++) {
        const block = atomicBlocks[b].trim();
        if (!block) continue;

        if (buffer.length + block.length > maxChars && buffer.length >= minChars) {
          const fullContent = contextPrefix + buffer.trim();
          const chunkId = crypto
            .createHash('sha256')
            .update(`${filePath}::${cleanHeading}::${chunkIndex}`)
            .digest('hex')
            .slice(0, 16);

          chunks.push({
            id: chunkId,
            filePath,
            noteTitle,
            heading: section.heading,
            headingLevel: section.headingLevel,
            breadcrumbs: section.breadcrumbs,
            wikilink,
            tags: Array.from(docTags),
            outlinks: extractWikilinks(fullContent),
            content: fullContent,
            charCount: fullContent.length,
            tokenEstimate: Math.ceil(fullContent.length / 4)
          });
          chunkIndex++;
          buffer = block + '\n\n';
        } else {
          buffer += block + '\n\n';
        }
      }

      if (buffer.trim()) {
        const fullContent = contextPrefix + buffer.trim();
        const chunkId = crypto
          .createHash('sha256')
          .update(`${filePath}::${cleanHeading}::${chunkIndex}`)
          .digest('hex')
          .slice(0, 16);

        chunks.push({
          id: chunkId,
          filePath,
          noteTitle,
          heading: section.heading,
          headingLevel: section.headingLevel,
          breadcrumbs: section.breadcrumbs,
          wikilink,
          tags: Array.from(docTags),
          outlinks: extractWikilinks(fullContent),
          content: fullContent,
          charCount: fullContent.length,
          tokenEstimate: Math.ceil(fullContent.length / 4)
        });
        chunkIndex++;
      }
    }
  }

  return chunks;
}
