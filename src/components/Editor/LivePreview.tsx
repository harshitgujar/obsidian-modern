import React, { useMemo } from 'react';
import { VaultFile, NoteMetadata } from '../../types';
import { 
  FileText, 
  ExternalLink, 
  Info, 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle, 
  Quote, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  Tag as TagIcon,
  Calendar,
  Layers
} from 'lucide-react';

interface LivePreviewProps {
  file: VaultFile;
  metadata?: NoteMetadata;
  onNavigateLink: (targetTitle: string) => void;
  onTagClick: (tag: string) => void;
  onToggleTask: (lineIndex: number) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  file,
  metadata,
  onNavigateLink,
  onTagClick,
  onToggleTask
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse lines and render blocks
  const content = file.content;

  // Separate frontmatter from body
  const { frontmatter, bodyLines, startLineOffset } = useMemo(() => {
    let fm: Record<string, any> = metadata?.frontmatter || {};
    let lines = content.split('\n');
    let startOffset = 0;

    if (lines[0]?.trim() === '---') {
      const endIdx = lines.slice(1).findIndex(l => l.trim() === '---');
      if (endIdx !== -1) {
        startOffset = endIdx + 2;
        lines = lines.slice(endIdx + 2);
      }
    }

    return { frontmatter: fm, bodyLines: lines, startLineOffset: startOffset };
  }, [content, metadata]);

  // Inline formatting renderer (Wikilinks, bold, italic, code, math, tags)
  const renderInline = (text: string) => {
    // 1. Process Wikilinks [[Title|Alias]]
    const parts: (string | React.ReactNode)[] = [];
    const regex = /(\[\[(.*?)\]\])|(`.*?`)|(\*\*.*?\*\*)|(\*.*?\*)|(~~.*?~~)|(\$[^$]+\$)|((?:^|\s)#[a-zA-Z0-9_\-\/]+)/g;

    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }

      const fullMatch = match[0];

      // Wikilink [[Note Title|Alias]]
      if (match[1]) {
        const rawContent = match[2];
        const [target, alias] = rawContent.split('|').map(s => s.trim());
        const display = alias || target;
        parts.push(
          <span
            key={`wiki-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              onNavigateLink(target);
            }}
            className="wikilink"
            title={`Open note: ${target}`}
          >
            <FileText className="w-3 h-3 inline-block opacity-70" />
            <span>{display}</span>
          </span>
        );
      }
      // Inline code `code`
      else if (match[3]) {
        const codeContent = fullMatch.slice(1, -1);
        parts.push(
          <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[0.9em] border border-zinc-700/60">
            {codeContent}
          </code>
        );
      }
      // Bold **bold**
      else if (match[4]) {
        parts.push(
          <strong key={`bold-${match.index}`} className="font-semibold text-zinc-100">
            {fullMatch.slice(2, -2)}
          </strong>
        );
      }
      // Italic *italic*
      else if (match[5]) {
        parts.push(
          <em key={`italic-${match.index}`} className="italic text-zinc-300">
            {fullMatch.slice(1, -1)}
          </em>
        );
      }
      // Strikethrough ~~strike~~
      else if (match[6]) {
        parts.push(
          <del key={`del-${match.index}`} className="line-through text-zinc-500">
            {fullMatch.slice(2, -2)}
          </del>
        );
      }
      // Math $E=mc^2$
      else if (match[7]) {
        parts.push(
          <span key={`math-${match.index}`} className="font-mono text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-800/40 text-[0.92em]">
            {fullMatch.slice(1, -1)}
          </span>
        );
      }
      // Tag #tag
      else if (match[8]) {
        const cleanTag = match[8].trim().replace(/^#/, '');
        parts.push(
          <span
            key={`tag-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(cleanTag);
            }}
            className="tag-pill"
          >
            #{cleanTag}
          </span>
        );
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  // Group lines into blocks (Callouts, code blocks, tables, lists, headers)
  const renderedBlocks = useMemo(() => {
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const realLineIndex = startLineOffset + i;

      // 1. Fenced Code Block ```
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        let j = i + 1;
        while (j < bodyLines.length && !bodyLines[j].trim().startsWith('```')) {
          codeLines.push(bodyLines[j]);
          j++;
        }
        const fullCode = codeLines.join('\n');
        const codeBlockIdx = i;

        blocks.push(
          <div key={`code-block-${i}`} className="my-4 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950/80 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
              <span className="font-medium text-[11px] uppercase tracking-wider">{lang || 'text'}</span>
              <button
                onClick={() => handleCopyCode(fullCode, codeBlockIdx)}
                className="flex items-center gap-1 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800"
              >
                {copiedIndex === codeBlockIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-zinc-200 leading-relaxed font-mono">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        i = j + 1;
        continue;
      }

      // 2. Callout / Admonition > [!TYPE]
      if (line.trim().startsWith('> [!')) {
        const calloutMatch = line.trim().match(/^>\s*\[!([a-zA-Z]+)\]/);
        const calloutType = calloutMatch ? calloutMatch[1].toLowerCase() : 'note';
        const calloutLines: string[] = [];
        let j = i + 1;
        while (j < bodyLines.length && bodyLines[j].trim().startsWith('>')) {
          calloutLines.push(bodyLines[j].replace(/^>\s?/, ''));
          j++;
        }

        let icon = <Info className="w-4 h-4 text-blue-400" />;
        let calloutClass = 'callout-note';

        if (calloutType === 'tip') {
          icon = <Lightbulb className="w-4 h-4 text-emerald-400" />;
          calloutClass = 'callout-tip';
        } else if (calloutType === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
          calloutClass = 'callout-warning';
        } else if (calloutType === 'important' || calloutType === 'caution') {
          icon = <AlertCircle className="w-4 h-4 text-rose-400" />;
          calloutClass = 'callout-important';
        } else if (calloutType === 'quote') {
          icon = <Quote className="w-4 h-4 text-purple-400" />;
          calloutClass = 'callout-quote';
        }

        blocks.push(
          <div key={`callout-${i}`} className={`callout ${calloutClass}`}>
            <div className="callout-title">
              {icon}
              <span>{calloutType}</span>
            </div>
            <div className="text-zinc-300 text-sm space-y-1">
              {calloutLines.map((cl, cIdx) => (
                <p key={cIdx} className="my-1">{renderInline(cl)}</p>
              ))}
            </div>
          </div>
        );
        i = j;
        continue;
      }

      // 3. Block Math $$...$$
      if (line.trim().startsWith('$$')) {
        const mathLines: string[] = [];
        let j = i;
        if (line.trim() === '$$') {
          j = i + 1;
          while (j < bodyLines.length && bodyLines[j].trim() !== '$$') {
            mathLines.push(bodyLines[j]);
            j++;
          }
          j++; // skip closing $$
        } else {
          mathLines.push(line.replace(/^\$\$/,'').replace(/\$\$$/,''));
          j = i + 1;
        }

        blocks.push(
          <div key={`math-block-${i}`} className="my-4 p-4 text-center bg-zinc-900/60 border border-zinc-800 rounded-lg text-emerald-400 font-mono text-base tracking-wide overflow-x-auto">
            {mathLines.join('\n')}
          </div>
        );
        i = j;
        continue;
      }

      // 4. Interactive Checklist item: - [ ] or - [x]
      const taskMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1].length;
        const isDone = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3];

        blocks.push(
          <div
            key={`task-${i}`}
            className="flex items-start gap-2.5 my-1.5 group cursor-pointer"
            style={{ paddingLeft: `${indent * 12}px` }}
            onClick={() => onToggleTask(realLineIndex)}
          >
            <button className="mt-1 text-zinc-400 group-hover:text-purple-400 transition-colors">
              {isDone ? (
                <CheckSquare className="w-4 h-4 text-purple-500 fill-purple-500/20" />
              ) : (
                <Square className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
              )}
            </button>
            <span className={`text-[15px] select-text ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
              {renderInline(taskText)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // 5. Headings (# H1, ## H2, ### H3, etc.)
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const hText = hMatch[2];
        const id = hText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

        if (level === 1) {
          blocks.push(<h1 key={`h1-${i}`} id={id}>{renderInline(hText)}</h1>);
        } else if (level === 2) {
          blocks.push(<h2 key={`h2-${i}`} id={id}>{renderInline(hText)}</h2>);
        } else if (level === 3) {
          blocks.push(<h3 key={`h3-${i}`} id={id}>{renderInline(hText)}</h3>);
        } else {
          blocks.push(<h4 key={`h4-${i}`} id={id} className="text-base font-semibold text-zinc-300 my-2">{renderInline(hText)}</h4>);
        }
        i++;
        continue;
      }

      // 6. Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        let j = i;
        while (j < bodyLines.length && bodyLines[j].trim().startsWith('|')) {
          tableLines.push(bodyLines[j]);
          j++;
        }

        const parseRow = (rowStr: string) =>
          rowStr.split('|').slice(1, -1).map(c => c.trim());

        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseRow);

        blocks.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-zinc-800">
            <table>
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j;
        continue;
      }

      // 7. Horizontal Rule ---
      if (line.trim() === '---' || line.trim() === '***') {
        blocks.push(<hr key={`hr-${i}`} />);
        i++;
        continue;
      }

      // 8. Blockquote
      if (line.trim().startsWith('>')) {
        const bqText = line.replace(/^>\s?/, '');
        blocks.push(
          <blockquote key={`bq-${i}`}>
            {renderInline(bqText)}
          </blockquote>
        );
        i++;
        continue;
      }

      // 9. Unordered list bullet
      if (line.match(/^\s*[-*+]\s+/)) {
        const listText = line.replace(/^\s*[-*+]\s+/, '');
        blocks.push(
          <li key={`li-${i}`} className="ml-4 list-disc text-zinc-200">
            {renderInline(listText)}
          </li>
        );
        i++;
        continue;
      }

      // 10. Empty lines / Paragraphs
      if (line.trim() === '') {
        blocks.push(<div key={`empty-${i}`} className="h-2.5" />);
      } else {
        blocks.push(
          <p key={`p-${i}`} className="leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }

      i++;
    }

    return blocks;
  }, [bodyLines, startLineOffset, copiedIndex]);

  return (
    <div className="w-full max-w-4xl mx-auto px-10 py-8 select-text">
      {/* Obsidian Properties Card (Frontmatter) */}
      {Object.keys(frontmatter).length > 0 && (
        <div className="mb-6 p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs backdrop-blur-sm select-none">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mb-2.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Properties</span>
          </div>

          <div className="grid grid-cols-[110px_1fr] gap-y-2 items-center text-xs">
            {frontmatter.tags && (
              <>
                <div className="flex items-center gap-1 text-zinc-400">
                  <TagIcon className="w-3 h-3 text-sky-400" />
                  <span>Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags]).map((t: string, idx: number) => (
                    <span
                      key={idx}
                      onClick={() => onTagClick(t.replace(/^#/, ''))}
                      className="px-2 py-0.5 rounded-full bg-sky-950/50 text-sky-400 border border-sky-800/40 cursor-pointer hover:bg-sky-900/50 transition-colors"
                    >
                      #{t.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </>
            )}

            {frontmatter.created && (
              <>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>Created</span>
                </div>
                <div className="text-zinc-300 font-mono text-[11px]">{String(frontmatter.created)}</div>
              </>
            )}

            {frontmatter.status && (
              <>
                <div className="text-zinc-400">Status</div>
                <div>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 capitalize">
                    {String(frontmatter.status)}
                  </span>
                </div>
              </>
            )}

            {Object.entries(frontmatter)
              .filter(([k]) => !['tags', 'created', 'status', 'title'].includes(k))
              .map(([key, val]) => (
                <React.Fragment key={key}>
                  <div className="text-zinc-400 capitalize">{key}</div>
                  <div className="text-zinc-300">{String(val)}</div>
                </React.Fragment>
              ))}
          </div>
        </div>
      )}

      {/* Main Markdown Content */}
      <div className="markdown-body">
        {renderedBlocks}
      </div>
    </div>
  );
};
