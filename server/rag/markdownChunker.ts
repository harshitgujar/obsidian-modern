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
 * Chunks a markdown document intelligently along heading boundaries,
 * preserving code blocks, tables, and frontmatter metadata.
 */
export function chunkMarkdown(
  filePath: string,
  rawContent: string,
  options: { maxChunkChars?: number; minChunkChars?: number } = {}
): DocumentChunk[] {
  const maxChars = options.maxChunkChars || 1600; // ~400 tokens
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
  const sections: {
    heading: string;
    headingLevel: number;
    lines: string[];
  }[] = [];

  let currentHeading = '';
  let currentHeadingLevel = 0;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          headingLevel: currentHeadingLevel,
          lines: currentLines
        });
      }
      currentHeadingLevel = headingMatch[1].length;
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      headingLevel: currentHeadingLevel,
      lines: currentLines
    });
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText && !section.heading) continue;

    const wikilink = section.heading
      ? `[[${noteTitle}#${section.heading}]]`
      : `[[${noteTitle}]]`;

    // Context prefix added to content so chunk retains document context
    const contextPrefix = section.heading
      ? `[${noteTitle} > ${section.heading}]\n`
      : `[${noteTitle}]\n`;

    // If section fits comfortably within maxChars, keep it whole
    if (sectionText.length <= maxChars) {
      const fullContent = contextPrefix + (sectionText || section.heading);
      const chunkId = crypto
        .createHash('sha256')
        .update(`${filePath}::${section.heading}::${chunkIndex}`)
        .digest('hex')
        .slice(0, 16);

      chunks.push({
        id: chunkId,
        filePath,
        noteTitle,
        heading: section.heading,
        headingLevel: section.headingLevel,
        wikilink,
        tags: Array.from(docTags),
        content: fullContent,
        charCount: fullContent.length,
        tokenEstimate: Math.ceil(fullContent.length / 4)
      });
      chunkIndex++;
    } else {
      // Split large section by paragraphs
      const paragraphs = sectionText.split(/\n\n+/);
      let buffer = '';

      for (let p = 0; p < paragraphs.length; p++) {
        const para = paragraphs[p].trim();
        if (!para) continue;

        if (buffer.length + para.length > maxChars && buffer.length >= minChars) {
          const fullContent = contextPrefix + buffer.trim();
          const chunkId = crypto
            .createHash('sha256')
            .update(`${filePath}::${section.heading}::${chunkIndex}`)
            .digest('hex')
            .slice(0, 16);

          chunks.push({
            id: chunkId,
            filePath,
            noteTitle,
            heading: section.heading,
            headingLevel: section.headingLevel,
            wikilink,
            tags: Array.from(docTags),
            content: fullContent,
            charCount: fullContent.length,
            tokenEstimate: Math.ceil(fullContent.length / 4)
          });
          chunkIndex++;
          buffer = para + '\n\n';
        } else {
          buffer += para + '\n\n';
        }
      }

      if (buffer.trim()) {
        const fullContent = contextPrefix + buffer.trim();
        const chunkId = crypto
          .createHash('sha256')
          .update(`${filePath}::${section.heading}::${chunkIndex}`)
          .digest('hex')
          .slice(0, 16);

        chunks.push({
          id: chunkId,
          filePath,
          noteTitle,
          heading: section.heading,
          headingLevel: section.headingLevel,
          wikilink,
          tags: Array.from(docTags),
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
