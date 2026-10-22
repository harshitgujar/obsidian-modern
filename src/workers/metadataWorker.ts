import { VaultFile, NoteMetadata, NoteHeading, NoteTask, NoteSection } from '../types';

export function parseNoteMetadata(file: VaultFile): NoteMetadata {
  const content = file.content || '';
  const lines = content.split('\n');

  let frontmatter: Record<string, any> = {};
  let body = content;
  let lineOffset = 0;

  // YAML Frontmatter parsing
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const yamlStr = content.slice(4, endIdx).trim();
      frontmatter = parseSimpleYaml(yamlStr);
      body = content.slice(endIdx + 4);
      lineOffset = content.slice(0, endIdx + 4).split('\n').length - 1;
    }
  }

  // Extract outlinks [[Link]] or [[Link|Alias]] or [[Link#Heading]]
  const outlinks: string[] = [];
  const wikilinkRegex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(body)) !== null) {
    const raw = match[1];
    const target = raw.split('|')[0].split('#')[0].trim();
    if (target && !outlinks.includes(target)) {
      outlinks.push(target);
    }
  }

  // Extract tags from body and frontmatter
  const tagsSet = new Set<string>();
  if (Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach(t => tagsSet.add(String(t).replace(/^#/, '')));
  } else if (typeof frontmatter.tags === 'string') {
    frontmatter.tags.split(',').forEach(t => tagsSet.add(t.trim().replace(/^#/, '')));
  }

  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g;
  while ((match = tagRegex.exec(body)) !== null) {
    const tag = match[1];
    if (tag && !/^\d+$/.test(tag)) {
      tagsSet.add(tag);
    }
  }

  // Extract Headings, Tasks, Sections, Blocks
  const headings: NoteHeading[] = [];
  const tasks: NoteTask[] = [];
  const sections: NoteSection[] = [];
  const blocks: Record<string, number> = {};

  let currentSectionType: NoteSection['type'] | null = null;
  let sectionStart = 1;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Block ID: paragraph text ^block-id
    const blockMatch = line.match(/\s\^([a-zA-Z0-9-]+)$/);
    if (blockMatch) {
      blocks[blockMatch[1]] = lineNum;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      headings.push({
        level: hMatch[1].length,
        text: hMatch[2].trim(),
        line: lineNum
      });
      sections.push({ type: 'heading', startLine: lineNum, endLine: lineNum });
      return;
    }

    // Checklist task
    const tMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)$/);
    if (tMatch) {
      tasks.push({
        completed: tMatch[1].toLowerCase() === 'x',
        text: tMatch[2].trim(),
        line: lineNum
      });
    }

    // Callout
    if (line.trim().startsWith('> [!')) {
      sections.push({ type: 'callout', startLine: lineNum, endLine: lineNum });
      return;
    }

    // Thematic break
    if (line.trim() === '---' || line.trim() === '***') {
      sections.push({ type: 'thematicBreak', startLine: lineNum, endLine: lineNum });
      return;
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
    sections,
    blocks,
    wordCount: words,
    charCount: chars
  };
}

function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  let currentListKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Bullet item under list key
    if (trimmed.startsWith('- ') && currentListKey) {
      const item = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(result[currentListKey])) {
        result[currentListKey].push(item);
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if (val === '') {
      currentListKey = key;
      result[key] = [];
    } else if (val.startsWith('[') && val.endsWith(']')) {
      currentListKey = null;
      result[key] = val
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      currentListKey = null;
      result[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }

  return result;
}

// Web Worker message listener
if (typeof self !== 'undefined' && typeof (self as any).onmessage !== 'undefined') {
  self.onmessage = (e: MessageEvent) => {
    const { type, data } = e.data;
    if (type === 'parse-file') {
      const metadata = parseNoteMetadata(data);
      self.postMessage({ type: 'parsed-file', data: metadata });
    } else if (type === 'parse-batch') {
      const results: Record<string, NoteMetadata> = {};
      for (const file of data as VaultFile[]) {
        results[file.path] = parseNoteMetadata(file);
      }
      self.postMessage({ type: 'parsed-batch', data: results });
    }
  };
}
