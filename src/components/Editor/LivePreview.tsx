import React, { useMemo, useState, useEffect, useRef } from 'react';
import { VaultFile, NoteMetadata, BacklinkMention } from '../../types';
import { FileContextMenu } from '../Common/FileContextMenu';
import { InteractiveTable } from './InteractiveTable';
import { TableGridPicker, generateMarkdownTable } from './TableGridPicker';
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
  Layers,
  ChevronRight,
  ChevronDown,
  Plus,
  Volume2,
  LayoutDashboard,
  Film,
  FileCode,
  Search,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Code as CodeIcon,
  Sparkles,
  Edit2,
  X
} from 'lucide-react';

interface CollapsibleCalloutProps {
  customTitle: string;
  calloutClass: string;
  icon: React.ReactNode;
  collapseSign?: string;
  children: React.ReactNode;
}

const CollapsibleCallout: React.FC<CollapsibleCalloutProps> = ({
  customTitle,
  calloutClass,
  icon,
  collapseSign,
  children
}) => {
  const isCollapsible = Boolean(collapseSign);
  const [isCollapsed, setIsCollapsed] = useState(collapseSign === '-');

  return (
    <div className={`callout ${calloutClass} transition-all duration-150`}>
      <div
        className={`callout-title flex items-center justify-between ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => {
          if (isCollapsible) setIsCollapsed(prev => !prev);
        }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-zinc-100">{customTitle}</span>
        </div>
        {isCollapsible && (
          <button className="text-zinc-400 hover:text-zinc-200 p-0.5">
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="text-zinc-300 text-sm space-y-1 mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface QuerySearchBlockProps {
  query: string;
  allFiles: VaultFile[];
  onNavigateLink: (path: string) => void;
}

const QuerySearchBlock: React.FC<QuerySearchBlockProps> = ({ query, allFiles, onNavigateLink }) => {
  const matchingFiles = useMemo(() => {
    const lines = query.split('\n').map(l => l.trim()).filter(Boolean);
    let results = allFiles.filter(f => f.extension === 'md' || f.extension === 'canvas');

    for (const line of lines) {
      if (line.startsWith('file:')) {
        const pattern = line.slice(5).trim().toLowerCase();
        results = results.filter(f => f.name.toLowerCase().includes(pattern) || f.path.toLowerCase().includes(pattern));
      } else if (line.startsWith('tag:')) {
        const rawTag = line.slice(4).trim().replace(/^#/, '').toLowerCase();
        results = results.filter(f => {
          const content = f.content.toLowerCase();
          return content.includes(`#${rawTag}`);
        });
      } else if (line.startsWith('path:')) {
        const folder = line.slice(5).trim().toLowerCase();
        results = results.filter(f => f.folder.toLowerCase().includes(folder) || f.path.toLowerCase().includes(folder));
      } else {
        const term = line.toLowerCase();
        results = results.filter(f => f.name.toLowerCase().includes(term) || f.content.toLowerCase().includes(term));
      }
    }
    return results;
  }, [query, allFiles]);

  return (
    <div className="my-4 rounded-2xl border border-black/[0.07] bg-white overflow-hidden shadow-sm text-xs font-sans">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#f4f4f6] border-b border-black/[0.06] text-[#111113]">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#18181b]" />
          <span className="font-semibold text-[#111113]">Embedded Search</span>
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.05] text-[#585860] font-mono">
            {query.trim().slice(0, 30)}
          </code>
        </div>
        <span className="text-[11px] text-[#8e8e93] font-mono">
          {matchingFiles.length} result{matchingFiles.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="p-2 max-h-64 overflow-y-auto space-y-1">
        {matchingFiles.length === 0 ? (
          <div className="p-3 text-[#8e8e93] text-center italic text-[11px]">
            No matching files found for query.
          </div>
        ) : (
          matchingFiles.map(f => (
            <div
              key={f.path}
              onClick={() => onNavigateLink(f.path)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f4f4f6] cursor-pointer text-[#111113] transition-colors group"
            >
              <div className="flex items-center gap-2 truncate">
                {f.extension === 'canvas' ? (
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#18181b] shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#18181b] shrink-0" />
                )}
                <span className="font-medium text-xs truncate">{f.name.replace(/\.md$/, '')}</span>
                {f.folder && (
                  <span className="text-[10px] text-[#8e8e93] font-mono truncate">({f.folder})</span>
                )}
              </div>
              <ExternalLink className="w-3 h-3 text-[#8e8e93] group-hover:text-[#111113] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface AutoResizeBlockTextareaProps {
  initialValue: string;
  onCommit: (val: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  placeholder?: string;
  className?: string;
}

const AutoResizeBlockTextarea: React.FC<AutoResizeBlockTextareaProps> = ({
  initialValue,
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onArrowUp,
  onArrowDown,
  placeholder = 'Type here...',
  className = ''
}) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(24, textareaRef.current.scrollHeight)}px`;
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(24, e.target.scrollHeight)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit(value);
      onEnter();
    } else if (e.key === 'Backspace' && value === '') {
      e.preventDefault();
      onBackspaceEmpty();
    } else if (e.key === 'ArrowUp' && onArrowUp && textareaRef.current?.selectionStart === 0) {
      e.preventDefault();
      onCommit(value);
      onArrowUp();
    } else if (e.key === 'ArrowDown' && onArrowDown && textareaRef.current?.selectionEnd === value.length) {
      e.preventDefault();
      onCommit(value);
      onArrowDown();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCommit(value);
      textareaRef.current?.blur();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      className={`w-full bg-transparent border-0 outline-none resize-none overflow-hidden p-0 m-0 focus:ring-0 ${className}`}
    />
  );
};

interface LivePreviewProps {
  file: VaultFile;
  allFiles: VaultFile[];
  metadata?: NoteMetadata;
  backlinks?: BacklinkMention[];
  showFrontmatter?: boolean;
  foldHeading?: boolean;
  onNavigateLink: (targetTitle: string) => void;
  onTagClick: (tag: string) => void;
  onToggleTask: (lineIndex: number) => void;
  onAddProperty?: (key: string, value: string) => void;
  onEnterEditMode?: () => void;
  isEditable?: boolean;
  onContentChange?: (content: string) => void;
  onRenameFile?: (file: VaultFile, newName: string) => void;
  onOpenFile?: (path: string) => void;
  onOpenSplit?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onBookmarkFile?: (path: string, title?: string) => void;
  isBookmarked?: boolean;
  onDuplicateFile?: (path: string) => void;
  onRevealInNavigation?: (path: string) => void;
  onOpenLocalGraph?: (path: string) => void;
  onExportPdf?: (path: string) => void;
  folders?: string[];
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  file,
  allFiles,
  metadata,
  backlinks = [],
  showFrontmatter = true,
  foldHeading = true,
  onNavigateLink,
  onTagClick,
  onToggleTask,
  onAddProperty,
  onEnterEditMode,
  isEditable = false,
  onContentChange,
  onRenameFile,
  onOpenFile,
  onOpenSplit,
  onDeleteFile,
  onBookmarkFile,
  isBookmarked = false,
  onDuplicateFile,
  onRevealInNavigation,
  onOpenLocalGraph,
  onExportPdf,
  folders = []
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [foldedHeadings, setFoldedHeadings] = useState<Record<number, boolean>>({});
  const [showBottomBacklinks, setShowBottomBacklinks] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{
    targetFile: VaultFile;
    x: number;
    y: number;
  } | null>(null);
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropVal, setNewPropVal] = useState('');

  // Notion-style inline title editing
  const [inlineTitle, setInlineTitle] = useState(file.name.replace(/\.md$/, ''));
  useEffect(() => {
    setInlineTitle(file.name.replace(/\.md$/, ''));
  }, [file.name]);

  // Notion-style block editing
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [editingBlockText, setEditingBlockText] = useState('');

  // Notion-style block insertion menu
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showTablePickerInBlockMenu, setShowTablePickerInBlockMenu] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  // File Context Menu for media embeds & wikilinks
  const [activeFileContextMenu, setActiveFileContextMenu] = useState<{
    x: number;
    y: number;
    file: VaultFile;
    embedContext?: any;
  } | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleMediaContextMenu = (
    e: React.MouseEvent,
    targetFile: VaultFile | undefined,
    rawEmbedText: string,
    aliasOrSize?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const fallbackFile: VaultFile = targetFile || {
      id: `file-${Date.now()}`,
      name: rawEmbedText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim().split('/').pop() || 'media',
      path: rawEmbedText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim(),
      folder: '',
      extension: rawEmbedText.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '',
      content: '',
      size: 0,
      updatedAt: Date.now(),
      createdAt: Date.now()
    };

    setActiveFileContextMenu({
      x: e.clientX,
      y: e.clientY,
      file: fallbackFile,
      embedContext: {
        rawEmbedText,
        onRemoveEmbed: () => {
          const newContent = file.content.replace(rawEmbedText, '').replace(/\n\n\n+/g, '\n\n');
          onContentChange?.(newContent);
        },
        onResetSize: () => {
          const rawTarget = rawEmbedText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim();
          const newContent = file.content.replace(rawEmbedText, `![[${rawTarget}]]`);
          onContentChange?.(newContent);
        },
        onSwapFile: (newFilePath: string) => {
          const newEmbed = rawEmbedText.startsWith('![[')
            ? `![[${newFilePath}]]`
            : `![${newFilePath}](${newFilePath})`;
          const newContent = file.content.replace(rawEmbedText, newEmbed);
          onContentChange?.(newContent);
        }
      }
    });
  };

  const commitBlockEdit = (realLineIndex: number, newText: string) => {
    const lines = file.content.split('\n');
    if (realLineIndex >= 0 && realLineIndex < lines.length) {
      lines[realLineIndex] = newText;
      onContentChange?.(lines.join('\n'));
    }
  };

  const deleteBlock = (lineIdx: number) => {
    const realLineIdx = startLineOffset + lineIdx;
    const lines = file.content.split('\n');
    if (realLineIdx >= 0 && realLineIdx < lines.length) {
      lines.splice(realLineIdx, 1);
      onContentChange?.(lines.join('\n'));
    }
    setEditingBlockIndex(null);
  };

  const insertNewBlock = (blockTemplate: string, afterIndex?: number | null) => {
    const lines = file.content.split('\n');
    const targetIdx = afterIndex !== undefined && afterIndex !== null 
      ? startLineOffset + afterIndex + 1 
      : lines.length;
    lines.splice(targetIdx, 0, blockTemplate);
    const newContent = lines.join('\n');
    onContentChange?.(newContent);
    setShowBlockMenu(false);
    setInsertAfterIndex(null);
  };

  // Strip %%...%% Obsidian comments for reading/preview display
  const rawContent = file.content || '';

  // Separate frontmatter from body
  const { frontmatter, bodyLines, startLineOffset } = useMemo(() => {
    let fm: Record<string, any> = { ...(metadata?.frontmatter || {}) };
    let lines = rawContent.split('\n');
    let startOffset = 0;

    if (lines[0]?.trim() === '---') {
      const endIdx = lines.slice(1).findIndex(l => l.trim() === '---');
      if (endIdx !== -1) {
        startOffset = endIdx + 2;
        // Parse frontmatter lines directly for instant zero-lag rendering
        const fmLines = lines.slice(1, endIdx + 1);
        let currentKey = '';
        for (const fLine of fmLines) {
          const match = fLine.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
          if (match) {
            currentKey = match[1];
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (val) {
              fm[currentKey] = val;
            } else {
              fm[currentKey] = [];
            }
          } else if (currentKey && fLine.trim().startsWith('- ')) {
            const item = fLine.trim().replace(/^-\s*/, '').replace(/^["']|["']$/g, '');
            if (!Array.isArray(fm[currentKey])) {
              fm[currentKey] = fm[currentKey] ? [fm[currentKey]] : [];
            }
            fm[currentKey].push(item);
          }
        }
        lines = lines.slice(endIdx + 2);
      }
    }

    return { frontmatter: fm, bodyLines: lines, startLineOffset: startOffset };
  }, [rawContent, metadata]);

  // Resolve vault file by name or path
  const resolveFile = (target: string): VaultFile | undefined => {
    const rawTarget = target.split('#')[0].trim();
    const cleanNoExt = rawTarget.replace(/\.[^/.]+$/, '').toLowerCase();
    const cleanWithExt = rawTarget.toLowerCase();
    return allFiles.find(f => {
      const nameWithExt = f.name.toLowerCase();
      const nameNoExt = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
      const pathWithExt = f.path.toLowerCase();
      const pathNoExt = f.path.replace(/\.[^/.]+$/, '').toLowerCase();
      return (
        nameWithExt === cleanWithExt ||
        nameNoExt === cleanNoExt ||
        pathWithExt === cleanWithExt ||
        pathNoExt === cleanNoExt
      );
    });
  };

  // Inline formatting renderer (Embeds, Wikilinks, highlights ==...==, bold, italic, code, math, footnotes, tags)
  const renderInline = (text: string) => {
    // Strip inline %% comment %%
    const cleanedText = text.replace(/%%.*?%%/g, '');
    const parts: (string | React.ReactNode)[] = [];

    const regex = /(!\[\[(.*?)\]\])|(\[\[(.*?)\]\])|(==(.*?)==)|(`.*?`)|(\*\*.*?\*\*)|(\*.*?\*)|(~~.*?~~)|(\$[^$]+\$)|(\[\^(\w+)\])|(\[(.*?)\]\((https?:\/\/[^\s)]+)\))|((?:^|\s)#[a-zA-Z0-9_\-\/]+)/g;

    let lastIdx = 0;
    let match;

    while ((match = regex.exec(cleanedText)) !== null) {
      if (match.index > lastIdx) {
        parts.push(cleanedText.slice(lastIdx, match.index));
      }

      const fullMatch = match[0];

      // 1. Obsidian Embed ![[Target]]
      if (match[1]) {
        const rawEmbed = match[2];
        const [rawTarget, alias] = rawEmbed.split('|').map(s => s.trim());
        const [targetPath, fragment] = rawTarget.split('#');
        const embeddedFile = resolveFile(targetPath);

        // 1. Audio Embed
        if (rawTarget.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
          const audioPath = embeddedFile ? embeddedFile.path : targetPath;
          parts.push(
            <div
              key={`audio-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch)}
              className="my-3 p-3 rounded-2xl skeuo-card flex items-center gap-3 cursor-context-menu"
            >
              <Volume2 className="w-4 h-4 text-[#18181b] shrink-0" />
              <span className="text-xs text-[#111113] font-mono truncate">{targetPath}</span>
              <audio controls src={`/api/vault/raw?path=${encodeURIComponent(audioPath)}`} className="h-8 flex-1" />
            </div>
          );
        }
        // 2. Video Embed
        else if (rawTarget.match(/\.(mp4|webm|mov|mkv)$/i)) {
          const videoPath = embeddedFile ? embeddedFile.path : targetPath;
          parts.push(
            <div
              key={`video-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch)}
              className="my-3 rounded-2xl overflow-hidden border border-black/[0.07] bg-white shadow-sm cursor-context-menu"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#f4f4f6] border-b border-black/[0.06] text-xs text-[#585860]">
                <span className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                  <Film className="w-3.5 h-3.5 text-[#18181b]" />
                  {targetPath}
                </span>
              </div>
              <video controls src={`/api/vault/raw?path=${encodeURIComponent(videoPath)}`} className="w-full max-h-96 object-contain bg-black" />
            </div>
          );
        }
        // 3. PDF Embed with #page=N support
        else if (rawTarget.match(/\.pdf$/i) || embeddedFile?.extension === 'pdf') {
          const pdfPath = embeddedFile ? embeddedFile.path : targetPath;
          const pageMatch = fragment?.match(/page=(\d+)/i);
          const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
          const pageHash = pageNumber ? `#page=${pageNumber}` : '';
          parts.push(
            <div
              key={`pdf-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch)}
              className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl cursor-context-menu hover:border-purple-500/40 transition-colors"
            >
              <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-300">
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold text-zinc-200 truncate">{embeddedFile ? embeddedFile.name : targetPath}</span>
                  {pageNumber && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      Page {pageNumber}
                    </span>
                  )}
                </div>
                <a
                  href={`/api/vault/raw?path=${encodeURIComponent(pdfPath)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                  title="Open PDF"
                >
                  <span>Open PDF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <iframe
                src={`/api/vault/raw?path=${encodeURIComponent(pdfPath)}${pageHash}`}
                className="w-full h-[450px] bg-zinc-900 border-0"
                title={targetPath}
              />
            </div>
          );
        }
        // 4. Image Embed with size syntax: ![[image.png|100x145]] or ![[image.png|200]]
        else if (rawTarget.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
          const imgPath = embeddedFile ? embeddedFile.path : targetPath;
          const sizeMatch = alias?.match(/^(\d+)(?:x(\d+))?$/);
          const customWidth = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
          const customHeight = sizeMatch && sizeMatch[2] ? parseInt(sizeMatch[2], 10) : undefined;
          parts.push(
            <div
              key={`embed-img-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch, alias)}
              className="my-3 inline-block cursor-context-menu group/img"
            >
              <img
                src={`/api/vault/raw?path=${encodeURIComponent(imgPath)}`}
                alt={(!sizeMatch && alias) || targetPath}
                style={{
                  width: customWidth ? `${customWidth}px` : undefined,
                  height: customHeight ? `${customHeight}px` : undefined,
                  maxWidth: '100%'
                }}
                className="max-h-[75vh] rounded-lg border border-zinc-800 object-contain group-hover/img:border-purple-500/60 transition-colors shadow-md"
              />
            </div>
          );
        }
        // 5. Canvas in Note Embed
        else if (embeddedFile?.extension === 'canvas' || rawTarget.match(/\.canvas$/i)) {
          let nodeCount = 0;
          let edgeCount = 0;
          try {
            if (embeddedFile) {
              const parsed = JSON.parse(embeddedFile.content);
              nodeCount = Array.isArray(parsed.nodes) ? parsed.nodes.length : 0;
              edgeCount = Array.isArray(parsed.edges) ? parsed.edges.length : 0;
            }
          } catch {}

          parts.push(
            <div
              key={`embed-canvas-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch)}
              className="my-3 rounded-xl border border-orange-500/40 bg-[#16161c] overflow-hidden shadow-lg hover:border-orange-500/70 transition-all cursor-pointer group"
              onClick={() => {
                if (embeddedFile) onNavigateLink(embeddedFile.path);
              }}
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-orange-950/20 border-b border-orange-500/30">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-xs text-orange-200">
                    {embeddedFile ? embeddedFile.name : targetPath}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                    Canvas Board
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {nodeCount} cards · {edgeCount} connections
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (embeddedFile) onNavigateLink(embeddedFile.path);
                    }}
                    className="p-1 rounded text-orange-400 hover:text-orange-200 hover:bg-orange-500/20 transition-colors"
                    title="Open Canvas"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3 text-xs text-zinc-400 flex items-center justify-between bg-black/20">
                <span className="text-zinc-500 text-[11px]">
                  Embedded canvas board. Click anywhere on this card to open in Canvas view.
                </span>
                <span className="text-xs text-orange-400 group-hover:underline flex items-center gap-1 font-medium shrink-0">
                  <span>Open board</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        }
        // 6. Markdown Note or Section Embed (![[Note#Section]])
        else if (embeddedFile) {
          let snippet = '';
          let sectionTitle = '';
          if (fragment) {
            const headingClean = fragment.replace(/^[#^]/, '').trim();
            const lines = embeddedFile.content.split('\n');
            const hIdx = lines.findIndex(l => {
              const m = l.match(/^#+\s+(.*)$/);
              return m && m[1].trim().toLowerCase() === headingClean.toLowerCase();
            });
            if (hIdx !== -1) {
              const hMatch = lines[hIdx].match(/^#+/);
              const hLevel = hMatch ? hMatch[0].length : 1;
              sectionTitle = lines[hIdx].replace(/^#+\s*/, '');
              const sectionLines: string[] = [];
              for (let k = hIdx + 1; k < lines.length; k++) {
                const nextH = lines[k].match(/^(#+)\s+/);
                if (nextH && nextH[1].length <= hLevel) break;
                sectionLines.push(lines[k]);
              }
              snippet = sectionLines.join('\n').trim().slice(0, 800);
            }
          }

          if (!snippet) {
            snippet = embeddedFile.content
              .replace(/^---[\s\S]*?---/, '')
              .trim()
              .slice(0, 420);
          }

          parts.push(
            <div
              key={`embed-note-${match.index}`}
              onContextMenu={e => handleMediaContextMenu(e, embeddedFile, fullMatch)}
              className="my-3 pl-4 pr-3 py-3 rounded-r-lg border-l-4 border-purple-500 bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 cursor-context-menu"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{embeddedFile.name.replace(/\.md$/, '')}</span>
                  {sectionTitle && (
                    <>
                      <span className="text-zinc-500 font-normal">&gt;</span>
                      <span className="text-purple-400 font-normal truncate">#{sectionTitle}</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => onNavigateLink(embeddedFile.path)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-300 shrink-0"
                  title="Open embedded note"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {snippet}
              </div>
            </div>
          );
        } else {
          parts.push(
            <span key={`embed-missing-${match.index}`} className="text-xs text-zinc-500 italic">
              ![[{rawTarget}]]
            </span>
          );
        }
      }
      // 2. Wikilink [[Note Title|Alias]]
      else if (match[3]) {
        const rawContent = match[4];
        const [target, alias] = rawContent.split('|').map(s => s.trim());
        const display = alias || target;
        const targetFile = resolveFile(target);

        parts.push(
          <span
            key={`wiki-${match.index}`}
            onClick={e => {
              e.stopPropagation();
              onNavigateLink(target);
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              handleMediaContextMenu(e, targetFile, fullMatch);
            }}
            onMouseEnter={e => {
              if (targetFile) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setHoverPreview({
                  targetFile,
                  x: Math.min(window.innerWidth - 340, rect.left),
                  y: Math.min(window.innerHeight - 240, rect.bottom + 8)
                });
              }
            }}
            onMouseLeave={() => setHoverPreview(null)}
            className="wikilink cm-wikilink-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-full bg-[#ebebef] hover:bg-[#e4e4e9] text-[#1c1c1e] text-[12px] font-medium cursor-pointer transition-all border border-black/[0.05] shadow-xs select-none align-middle"
            title={targetFile ? `Open note: ${targetFile.path} (Right-click for options)` : `Create note: ${target}`}
          >
            <FileText className="w-3 h-3 inline-block opacity-70" />
            <span>{display}</span>
          </span>
        );
      }
      // 3. Highlighting ==text==
      else if (match[5]) {
        parts.push(
          <mark
            key={`mark-${match.index}`}
            className="cm-highlight-mark bg-amber-500/22 text-amber-200 dark:text-amber-100 font-medium px-1.5 py-0.5 rounded-sm select-text"
          >
            {match[6]}
          </mark>
        );
      }
      // 4. Inline code `code`
      else if (match[7]) {
        const codeContent = fullMatch.slice(1, -1);
        parts.push(
          <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded bg-[#27272a] text-[#f43f5e] font-mono text-[0.88em] select-text">
            {codeContent}
          </code>
        );
      }
      // 5. Bold **bold**
      else if (match[8]) {
        parts.push(
          <strong key={`bold-${match.index}`} className="font-semibold text-zinc-100">
            {fullMatch.slice(2, -2)}
          </strong>
        );
      }
      // 6. Italic *italic*
      else if (match[9]) {
        parts.push(
          <em key={`italic-${match.index}`} className="italic text-zinc-300">
            {fullMatch.slice(1, -1)}
          </em>
        );
      }
      // 7. Strikethrough ~~strike~~
      else if (match[10]) {
        parts.push(
          <del key={`del-${match.index}`} className="line-through text-zinc-500">
            {fullMatch.slice(2, -2)}
          </del>
        );
      }
      // 8. Inline Math $E=mc^2$
      else if (match[11]) {
        parts.push(
          <span key={`math-${match.index}`} className="font-mono text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-800/40 text-[0.92em]">
            {fullMatch.slice(1, -1)}
          </span>
        );
      }
      // 9. Footnote reference [^1]
      else if (match[12]) {
        parts.push(
          <sup key={`fn-${match.index}`} className="text-purple-400 font-mono text-[10px] px-0.5 cursor-pointer hover:underline">
            [{match[13]}]
          </sup>
        );
      }
      // 10. External Markdown Link [label](https://...)
      else if (match[14]) {
        parts.push(
          <a
            key={`ext-${match.index}`}
            href={match[16]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-0.5"
          >
            <span>{match[15]}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      // 11. Tag #tag
      else if (match[17]) {
        const cleanTag = match[17].trim().replace(/^#/, '');
        parts.push(
          <span
            key={`tag-${match.index}`}
            onClick={e => {
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

    if (lastIdx < cleanedText.length) {
      parts.push(cleanedText.slice(lastIdx));
    }

    return parts.length > 0 ? parts : cleanedText;
  };

  // Group lines into blocks (Callouts, code blocks, tables, lists, headers, comments)
  const renderedBlocks = useMemo(() => {
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let activeFoldLevel: number | null = null;

    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const realLineIndex = startLineOffset + i;

      // Multi-line %% comment block %%
      if (line.trim().startsWith('%%') && !line.trim().slice(2).includes('%%')) {
        let j = i + 1;
        while (j < bodyLines.length && !bodyLines[j].includes('%%')) {
          j++;
        }
        i = j + 1;
        continue;
      }

      // Check if we are currently inside a folded heading section
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        if (activeFoldLevel !== null && level <= activeFoldLevel) {
          activeFoldLevel = null; // Exit fold
        }
      }

      if (activeFoldLevel !== null) {
        i++;
        continue;
      }

      // 0. Image ![alt](src)
      const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const src = imgMatch[2];
        blocks.push(
          <div key={`img-${i}`} className="my-5 flex flex-col items-center justify-center">
            <div className="rounded-xl overflow-hidden border border-zinc-700/80 shadow-xl bg-zinc-950 p-1 max-w-full">
              <img src={src} alt={alt} className="max-h-[55vh] w-auto object-contain rounded-lg" />
            </div>
            {alt && <div className="text-xs text-zinc-400 mt-2 italic">{alt}</div>}
          </div>
        );
        i++;
        continue;
      }

      // HTML <iframe> embed (e.g. YouTube, slides, web widgets)
      if (line.trim().toLowerCase().startsWith('<iframe')) {
        const srcMatch = line.match(/src=["'](.*?)["']/i);
        const titleMatch = line.match(/title=["'](.*?)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        const title = titleMatch ? titleMatch[1] : 'Embedded content';
        if (src) {
          blocks.push(
            <div key={`iframe-${i}`} className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  {title}
                </span>
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 text-[11px] flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  src={src}
                  title={title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          );
          i++;
          continue;
        }
      }

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

        // Embedded search query block: ```query ... ```
        if (lang.toLowerCase() === 'query') {
          blocks.push(
            <QuerySearchBlock
              key={`query-block-${i}`}
              query={fullCode}
              allFiles={allFiles}
              onNavigateLink={onNavigateLink}
            />
          );
          i = j + 1;
          continue;
        }

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
        const calloutMatch = line.trim().match(/^>\s*\[!([a-zA-Z-]+)\]([+-])?\s*(.*)$/);
        const calloutType = calloutMatch ? calloutMatch[1].toLowerCase() : 'note';
        const collapseSign = calloutMatch ? calloutMatch[2] : undefined;
        const customTitle = calloutMatch && calloutMatch[3] ? calloutMatch[3] : calloutType;
        const calloutLines: string[] = [];
        let j = i + 1;
        while (j < bodyLines.length && bodyLines[j].trim().startsWith('>')) {
          calloutLines.push(bodyLines[j].replace(/^>\s?/, ''));
          j++;
        }

        let icon = <Info className="w-4 h-4 text-blue-400" />;
        let calloutClass = 'callout-note';

        if (calloutType === 'tip' || calloutType === 'hint') {
          icon = <Lightbulb className="w-4 h-4 text-emerald-400" />;
          calloutClass = 'callout-tip';
        } else if (calloutType === 'warning' || calloutType === 'caution') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
          calloutClass = 'callout-warning';
        } else if (calloutType === 'important' || calloutType === 'danger' || calloutType === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-rose-400" />;
          calloutClass = 'callout-important';
        } else if (calloutType === 'quote') {
          icon = <Quote className="w-4 h-4 text-purple-400" />;
          calloutClass = 'callout-quote';
        }

        blocks.push(
          <CollapsibleCallout
            key={`callout-${i}`}
            customTitle={customTitle}
            calloutClass={calloutClass}
            icon={icon}
            collapseSign={collapseSign}
          >
            {calloutLines.map((cl, cIdx) => (
              <p key={cIdx} className="my-1">{renderInline(cl)}</p>
            ))}
          </CollapsibleCallout>
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
          j++;
        } else {
          mathLines.push(line.replace(/^\$\$/, '').replace(/\$\$$/, ''));
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

        if (editingBlockIndex === i && isEditable) {
          blocks.push(
            <div
              key={`task-edit-${i}`}
              className="flex items-start gap-2.5 my-1.5 px-2 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]"
              style={{ paddingLeft: `${indent * 12 + 8}px` }}
            >
              <button
                type="button"
                onClick={() => onToggleTask(realLineIndex)}
                className="mt-1 text-zinc-400 hover:text-[#384cff] dark:hover:text-[#6372ff] transition-colors shrink-0"
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-[#384cff] dark:text-[#6372ff] fill-current/20" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500" />
                )}
              </button>
              <AutoResizeBlockTextarea
                initialValue={taskText}
                onCommit={newVal => commitBlockEdit(realLineIndex, `${' '.repeat(indent)}- [${isDone ? 'x' : ' '}] ${newVal}`)}
                onEnter={() => {
                  commitBlockEdit(realLineIndex, `${' '.repeat(indent)}- [${isDone ? 'x' : ' '}] ${editingBlockText}`);
                  insertNewBlock(`${' '.repeat(indent)}- [ ] `, i);
                  setEditingBlockIndex(i + 1);
                  setEditingBlockText('');
                }}
                onBackspaceEmpty={() => {
                  deleteBlock(i);
                  const prevIdx = Math.max(0, i - 1);
                  setEditingBlockIndex(prevIdx);
                  setEditingBlockText(bodyLines[prevIdx] || '');
                }}
                placeholder="To-do..."
                className="text-[15px] text-[#111113] dark:text-[#f4f4f6]"
              />
            </div>
          );
        } else {
          blocks.push(
            <div
              key={`task-${i}`}
              className="flex items-start gap-2.5 my-1.5 group cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
              style={{ paddingLeft: `${indent * 12}px` }}
            >
              <button
                type="button"
                className="mt-1 text-zinc-400 group-hover:text-[#384cff] dark:group-hover:text-[#6372ff] transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask(realLineIndex);
                }}
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-[#384cff] dark:text-[#6372ff] fill-current/20" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                )}
              </button>
              <span
                onClick={() => {
                  if (isEditable) {
                    setEditingBlockIndex(i);
                    setEditingBlockText(taskText);
                  }
                }}
                className={`text-[15px] select-text flex-1 ${isDone ? 'line-through text-[#8e8e93] dark:text-[#71717a]' : 'text-[#111113] dark:text-[#f4f4f6]'}`}
              >
                {renderInline(taskText)}
              </span>
            </div>
          );
        }
        i++;
        continue;
      }

      // 5. Headings (# H1, ## H2, ### H3, etc.) with Fold support
      if (hMatch) {
        const level = hMatch[1].length;
        const hText = hMatch[2];
        const id = hText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const isFolded = Boolean(foldedHeadings[i]);

        if (isFolded) {
          activeFoldLevel = level;
        }

        const headingContent = (
          <div className="group flex items-center gap-1.5">
            {foldHeading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFoldedHeadings(prev => ({ ...prev, [i]: !prev[i] }));
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity -ml-5 shrink-0"
                title={isFolded ? 'Unfold heading' : 'Fold heading'}
              >
                {isFolded ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <span>{renderInline(hText)}</span>
            {isFolded && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal ml-2">
                •••
              </span>
            )}
          </div>
        );

        // Suppress redundant H1 if it duplicates the inline title at the top of note
        const cleanFileName = file.name.replace(/\.md$/, '').trim().toLowerCase();
        const isDuplicateDocTitle = level === 1 && i <= 3 && hText.trim().toLowerCase() === cleanFileName;

        if (isDuplicateDocTitle) {
          i++;
          continue;
        }

        if (editingBlockIndex === i && isEditable) {
          blocks.push(
            <div key={`h-edit-${i}`} className="my-2 px-2 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
              <AutoResizeBlockTextarea
                initialValue={hText}
                onCommit={newVal => commitBlockEdit(realLineIndex, `${'#'.repeat(level)} ${newVal}`)}
                onEnter={() => {
                  commitBlockEdit(realLineIndex, `${'#'.repeat(level)} ${editingBlockText}`);
                  insertNewBlock('', i);
                  setEditingBlockIndex(i + 1);
                  setEditingBlockText('');
                }}
                onBackspaceEmpty={() => {
                  deleteBlock(i);
                  const prevIdx = Math.max(0, i - 1);
                  setEditingBlockIndex(prevIdx);
                  setEditingBlockText(bodyLines[prevIdx] || '');
                }}
                placeholder="Heading..."
                className={`${
                  level === 1 ? 'text-3xl font-bold' : level === 2 ? 'text-2xl font-bold' : 'text-xl font-semibold'
                } text-[#111113] dark:text-[#f4f4f6]`}
              />
            </div>
          );
        } else {
          const hProps = {
            key: `h${level}-${i}`,
            id,
            onClick: () => {
              if (isEditable) {
                setEditingBlockIndex(i);
                setEditingBlockText(hText);
              }
            },
            className: 'cursor-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors'
          };
          if (level === 1) blocks.push(<h1 {...hProps}>{headingContent}</h1>);
          else if (level === 2) blocks.push(<h2 {...hProps}>{headingContent}</h2>);
          else if (level === 3) blocks.push(<h3 {...hProps}>{headingContent}</h3>);
          else blocks.push(<h4 {...hProps} className="text-base font-semibold text-[#111113] dark:text-[#f4f4f6] my-2">{headingContent}</h4>);
        }
        i++;
        continue;
      }

      // 6. Markdown Tables (Google Docs High-Fidelity Table)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        let j = i;
        while (j < bodyLines.length && bodyLines[j].trim().startsWith('|')) {
          tableLines.push(bodyLines[j]);
          j++;
        }

        const tableMarkdown = tableLines.join('\n');
        const startIdx = i;
        const endIdx = j;

        blocks.push(
          <InteractiveTable
            key={`table-${i}`}
            initialMarkdown={tableMarkdown}
            isEditable={isEditable}
            onChange={newTableMd => {
              if (onContentChange) {
                const nextLines = [...bodyLines];
                nextLines.splice(startIdx, endIdx - startIdx, newTableMd.trim());
                onContentChange(nextLines.join('\n'));
              }
            }}
          />
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
        if (editingBlockIndex === i && isEditable) {
          blocks.push(
            <blockquote key={`bq-edit-${i}`} className="my-2 pl-3 border-l-2 border-[#384cff] dark:border-[#6372ff] bg-black/[0.02] dark:bg-white/[0.03] rounded-r-lg p-1.5">
              <AutoResizeBlockTextarea
                initialValue={bqText}
                onCommit={newVal => commitBlockEdit(realLineIndex, `> ${newVal}`)}
                onEnter={() => {
                  commitBlockEdit(realLineIndex, `> ${editingBlockText}`);
                  insertNewBlock('', i);
                  setEditingBlockIndex(i + 1);
                  setEditingBlockText('');
                }}
                onBackspaceEmpty={() => {
                  deleteBlock(i);
                  const prevIdx = Math.max(0, i - 1);
                  setEditingBlockIndex(prevIdx);
                  setEditingBlockText(bodyLines[prevIdx] || '');
                }}
                placeholder="Quote..."
                className="text-[15px] italic text-[#585860] dark:text-[#a1a1aa]"
              />
            </blockquote>
          );
        } else {
          blocks.push(
            <blockquote
              key={`bq-${i}`}
              onClick={() => {
                if (isEditable) {
                  setEditingBlockIndex(i);
                  setEditingBlockText(bqText);
                }
              }}
              className="cursor-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
            >
              {renderInline(bqText)}
            </blockquote>
          );
        }
        i++;
        continue;
      }

      // 9. Unordered or Ordered list
      if (line.match(/^\s*[-*+]\s+/)) {
        const listText = line.replace(/^\s*[-*+]\s+/, '');
        if (editingBlockIndex === i && isEditable) {
          blocks.push(
            <div key={`li-edit-${i}`} className="flex items-center gap-2 my-1 px-2 py-1 ml-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
              <span className="text-[#8e8e93]">•</span>
              <AutoResizeBlockTextarea
                initialValue={listText}
                onCommit={newVal => commitBlockEdit(realLineIndex, `- ${newVal}`)}
                onEnter={() => {
                  commitBlockEdit(realLineIndex, `- ${editingBlockText}`);
                  insertNewBlock('- ', i);
                  setEditingBlockIndex(i + 1);
                  setEditingBlockText('');
                }}
                onBackspaceEmpty={() => {
                  deleteBlock(i);
                  const prevIdx = Math.max(0, i - 1);
                  setEditingBlockIndex(prevIdx);
                  setEditingBlockText(bodyLines[prevIdx] || '');
                }}
                placeholder="List item..."
                className="text-[15px] text-[#111113] dark:text-[#f4f4f6]"
              />
            </div>
          );
        } else {
          blocks.push(
            <li
              key={`li-${i}`}
              onClick={() => {
                if (isEditable) {
                  setEditingBlockIndex(i);
                  setEditingBlockText(listText);
                }
              }}
              className="ml-4 list-disc text-[#111113] dark:text-[#f4f4f6] cursor-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
            >
              {renderInline(listText)}
            </li>
          );
        }
        i++;
        continue;
      }

      // 10. Empty lines / Paragraphs
      if (line.trim().startsWith('%%')) {
        blocks.push(<div key={`comment-${i}`} className="hidden" />);
      } else if (editingBlockIndex === i && isEditable) {
        blocks.push(
          <div key={`p-edit-${i}`} className="my-1.5 px-2 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
            <AutoResizeBlockTextarea
              initialValue={editingBlockText}
              onCommit={newVal => commitBlockEdit(realLineIndex, newVal)}
              onEnter={() => {
                commitBlockEdit(realLineIndex, editingBlockText);
                insertNewBlock('', i);
                setEditingBlockIndex(i + 1);
                setEditingBlockText('');
              }}
              onBackspaceEmpty={() => {
                deleteBlock(i);
                const prevIdx = Math.max(0, i - 1);
                setEditingBlockIndex(prevIdx);
                setEditingBlockText(bodyLines[prevIdx] || '');
              }}
              placeholder="Type something or '/' for blocks..."
              className="text-[15px] leading-relaxed text-[#111113] dark:text-[#f4f4f6]"
            />
          </div>
        );
      } else {
        blocks.push(
          <p
            key={`p-${i}`}
            onClick={() => {
              if (isEditable) {
                setEditingBlockIndex(i);
                setEditingBlockText(line);
              }
            }}
            className={`leading-relaxed cursor-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors ${
              line.trim() === '' ? 'h-6' : ''
            }`}
          >
            {line.trim() === '' ? (
              <span className="text-[#8e8e93]/40 select-none text-xs italic">Empty line (click to type)</span>
            ) : (
              renderInline(line)
            )}
          </p>
        );
      }

      i++;
    }

    return blocks;
  }, [bodyLines, startLineOffset, copiedIndex, foldedHeadings, foldHeading, allFiles, editingBlockIndex, editingBlockText, isEditable]);

  const handleCreateProp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPropKey.trim() && onAddProperty) {
      onAddProperty(newPropKey.trim(), newPropVal.trim());
      setNewPropKey('');
      setNewPropVal('');
      setIsAddingProp(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-10 py-8 select-text relative">
      {/* Obsidian Inline Title */}
      {isEditable ? (
        <div className="group relative flex items-center mb-6 pb-2 border-b border-black/[0.08] dark:border-white/[0.08]">
          <input
            type="text"
            value={inlineTitle}
            onChange={e => setInlineTitle(e.target.value)}
            onBlur={() => {
              const trimmed = inlineTitle.trim();
              const currentBase = file.name.replace(/\.md$/, '');
              if (trimmed && trimmed !== currentBase && onRenameFile) {
                onRenameFile(file, `${trimmed}.md`);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Untitled Note"
            className="inline-title font-bold text-3xl md:text-4xl text-[#111113] dark:text-[#f4f4f6] tracking-tight bg-transparent w-full focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#8e8e93] dark:text-[#71717a] font-mono ml-2 shrink-0 select-none">
            Click to rename
          </span>
        </div>
      ) : (
        <h1 className="inline-title font-bold text-3xl md:text-4xl text-[#111113] dark:text-[#f4f4f6] tracking-tight mb-6 pb-2 border-b border-black/[0.08] dark:border-white/[0.08]">
          {file.name.replace(/\.md$/, '')}
        </h1>
      )}

      {/* Notion-Style Properties Card (Frontmatter) */}
      {showFrontmatter && (Object.keys(frontmatter).length > 0 || isAddingProp) && (
        <div className="mb-6 p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f9f9fb] dark:bg-[#18181b] shadow-xs text-xs select-none">
          <div className="flex items-center justify-between text-[#585860] dark:text-[#a1a1aa] font-semibold mb-3">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
              <span className="text-[#111113] dark:text-[#f4f4f6] font-medium">Properties</span>
            </div>
            {onAddProperty && isEditable && (
              <button
                onClick={() => setIsAddingProp(prev => !prev)}
                className="flex items-center gap-1 text-[11px] text-[#585860] hover:text-[#384cff] dark:text-[#a1a1aa] dark:hover:text-[#6372ff] cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add property</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-[110px_1fr] gap-y-2.5 items-center text-xs">
            {frontmatter.tags && (
              <>
                <div className="flex items-center gap-1 text-[#8e8e93] dark:text-[#71717a]">
                  <TagIcon className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
                  <span>tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags]).map((t: string, idx: number) => (
                    <span
                      key={idx}
                      onClick={() => onTagClick(String(t).replace(/^#/, ''))}
                      className="px-2.5 py-0.5 rounded-full bg-[#ececf0] dark:bg-[#27272a] text-[#384cff] dark:text-[#6372ff] border border-black/[0.05] dark:border-white/[0.06] cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors font-medium text-[11px]"
                    >
                      #{String(t).replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </>
            )}

            {Object.entries(frontmatter)
              .filter(([k]) => k !== 'tags')
              .map(([key, val]) => (
                <React.Fragment key={key}>
                  <div className="text-[#8e8e93] dark:text-[#71717a] font-mono text-[11px]">{key}</div>
                  <div className="text-[#111113] dark:text-[#f4f4f6] font-medium">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </div>
                </React.Fragment>
              ))}
          </div>

          {isAddingProp && (
            <form onSubmit={handleCreateProp} className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2">
              <input
                type="text"
                value={newPropKey}
                onChange={e => setNewPropKey(e.target.value)}
                placeholder="Property name"
                className="bg-white dark:bg-[#111113] border border-black/[0.1] dark:border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] dark:text-[#f4f4f6] focus:border-[#384cff] outline-none w-32 shadow-xs"
              />
              <input
                type="text"
                value={newPropVal}
                onChange={e => setNewPropVal(e.target.value)}
                placeholder="Value"
                className="bg-white dark:bg-[#111113] border border-black/[0.1] dark:border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] dark:text-[#f4f4f6] focus:border-[#384cff] outline-none flex-1 shadow-xs"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-[#384cff] hover:bg-[#2c3ee0] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </form>
          )}
        </div>
      )}

      {/* Main Markdown Content */}
      <div className="markdown-body">
        {renderedBlocks}
      </div>

      {/* Notion-Style Quick Inserter and Click-to-Write Area */}
      {isEditable && (
        <div className="mt-6">
          <div
            onClick={() => {
              const lastIdx = bodyLines.length - 1;
              if (lastIdx >= 0 && bodyLines[lastIdx].trim() === '') {
                setEditingBlockIndex(lastIdx);
                setEditingBlockText(bodyLines[lastIdx]);
              } else {
                insertNewBlock('', lastIdx >= 0 ? lastIdx : null);
                setEditingBlockIndex(bodyLines.length);
                setEditingBlockText('');
              }
            }}
            className="min-h-[120px] cursor-text py-3"
          >
            {bodyLines.length === 0 && (
              <div className="text-[#8e8e93]/60 dark:text-[#71717a]/60 text-base py-4 select-none">
                Type &apos;/&apos; for commands or click to start writing...
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-dashed border-black/[0.08] dark:border-white/[0.08]">
            <button
              onClick={() => {
                setInsertAfterIndex(bodyLines.length - 1);
                setShowBlockMenu(true);
              }}
              className="flex items-center gap-2 text-[#8e8e93] hover:text-[#384cff] dark:text-[#71717a] dark:hover:text-[#6372ff] text-xs py-2 px-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors w-full text-left group cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#8e8e93] group-hover:text-[#384cff] dark:text-[#71717a] dark:group-hover:text-[#6372ff] transition-colors" />
              <span className="font-medium">Add block (Heading, Checklist, Table, Callout, Media...)</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Backlinks Section (Obsidian core feature: backlinks at bottom of note) */}
      <div className="mt-12 pt-6 border-t border-black/[0.08] dark:border-white/[0.08]">
        <button
          onClick={() => setShowBottomBacklinks(prev => !prev)}
          className="flex items-center gap-2 text-xs font-semibold text-[#585860] hover:text-[#111113] dark:text-[#a1a1aa] dark:hover:text-[#f4f4f6] transition-colors w-full group py-1 cursor-pointer"
        >
          {showBottomBacklinks ? (
            <ChevronDown className="w-4 h-4 text-[#384cff] dark:text-[#6372ff]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#8e8e93] group-hover:text-[#384cff] dark:text-[#71717a] dark:group-hover:text-[#6372ff]" />
          )}
          <span className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
            <span>Backlinks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ececf0] dark:bg-[#27272a] text-[#585860] dark:text-[#a1a1aa] font-mono">
              {backlinks.length}
            </span>
          </span>
        </button>

        {showBottomBacklinks && (
          <div className="mt-3 space-y-2">
            {backlinks.length === 0 ? (
              <div className="text-xs text-[#8e8e93] dark:text-[#71717a] italic py-2">
                No incoming backlinks found for this note.
              </div>
            ) : (
              backlinks.map((b, idx) => (
                <div
                  key={`${b.filePath}-${idx}`}
                  onClick={() => onNavigateLink(b.filePath)}
                  className="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f9f9fb] dark:bg-[#18181b] hover:bg-[#f4f4f6] dark:hover:bg-[#202023] hover:border-[#384cff]/30 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[#111113] dark:text-[#f4f4f6] group-hover:text-[#384cff] dark:group-hover:text-[#6372ff] mb-1">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff] shrink-0" />
                      <span>{b.fileName.replace(/\.md$/, '')}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#8e8e93] group-hover:text-[#384cff] dark:text-[#71717a] dark:group-hover:text-[#6372ff] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {b.contextSnippet && (
                    <div className="text-[11px] text-[#585860] dark:text-[#a1a1aa] line-clamp-2 italic font-sans pl-5 border-l border-black/[0.1] dark:border-white/[0.1]">
                      "{b.contextSnippet}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Hover Page Preview Popover (page-preview core plugin) */}
      {hoverPreview && (
        <div
          className="fixed z-50 w-80 max-h-60 bg-white/95 dark:bg-[#18181b]/95 border border-black/[0.1] dark:border-white/[0.1] rounded-2xl shadow-2xl p-4 overflow-y-auto backdrop-blur-xl pointer-events-none"
          style={{ left: `${hoverPreview.x}px`, top: `${hoverPreview.y}px` }}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#111113] dark:text-[#f4f4f6] mb-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5">
            <FileText className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
            <span>{hoverPreview.targetFile.name.replace(/\.md$/, '')}</span>
          </div>
          <div className="text-[11px] text-[#585860] dark:text-[#a1a1aa] whitespace-pre-wrap leading-relaxed">
            {hoverPreview.targetFile.content.replace(/^---[\s\S]*?---/, '').trim().slice(0, 350)}
          </div>
        </div>
      )}

      {/* Notion Block Insertion Modal */}
      {showBlockMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowBlockMenu(false);
            setShowTablePickerInBlockMenu(false);
          }}
        >
          <div
            className="w-80 max-h-[80vh] overflow-y-auto bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl p-2 text-xs text-[#111113] dark:text-[#f4f4f6] animate-in fade-in zoom-in-95 duration-100 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08] font-semibold text-[#111113] dark:text-[#f4f4f6] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
                <span>{showTablePickerInBlockMenu ? 'Insert Table' : 'Insert Block'}</span>
              </span>
              <button 
                onClick={() => {
                  setShowBlockMenu(false);
                  setShowTablePickerInBlockMenu(false);
                }} 
                className="text-[#8e8e93] hover:text-[#111113] dark:hover:text-[#f4f4f6] p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {showTablePickerInBlockMenu ? (
              <div className="p-1 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTablePickerInBlockMenu(false)}
                  className="text-[11px] text-[#585860] dark:text-[#a1a1aa] hover:text-[#111113] dark:hover:text-[#f4f4f6] flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer"
                >
                  ← Back to blocks
                </button>
                <TableGridPicker
                  onSelect={(rows, cols) => {
                    const md = generateMarkdownTable(rows, cols);
                    insertNewBlock(md, insertAfterIndex);
                    setShowBlockMenu(false);
                    setShowTablePickerInBlockMenu(false);
                  }}
                  onClose={() => {
                    setShowBlockMenu(false);
                    setShowTablePickerInBlockMenu(false);
                  }}
                />
              </div>
            ) : (
              <div className="p-1 space-y-0.5">
                {[
                  { label: 'Text', desc: 'Just start writing plain text', icon: <FileText className="w-4 h-4 text-zinc-400" />, template: '\nNew paragraph...\n' },
                  { label: 'Heading 1', desc: 'Large section heading', icon: <Heading1 className="w-4 h-4 text-purple-400" />, template: '\n# New Section\n' },
                  { label: 'Heading 2', desc: 'Medium section heading', icon: <Heading2 className="w-4 h-4 text-purple-400" />, template: '\n## New Sub-section\n' },
                  { label: 'Heading 3', desc: 'Small section heading', icon: <Heading3 className="w-4 h-4 text-purple-400" />, template: '\n### Subsection Title\n' },
                  { label: 'To-do List', desc: 'Track tasks with an interactive checklist', icon: <CheckSquare className="w-4 h-4 text-emerald-400" />, template: '\n- [ ] New to-do item\n' },
                  { label: 'Bulleted List', desc: 'Create a simple bulleted list', icon: <List className="w-4 h-4 text-sky-400" />, template: '\n- List item 1\n- List item 2\n' },
                  { label: 'Numbered List', desc: 'Create a list with numbering', icon: <ListOrdered className="w-4 h-4 text-amber-400" />, template: '\n1. First step\n2. Second step\n' },
                  { label: 'Callout Box', desc: 'Make writing stand out with an icon', icon: <Info className="w-4 h-4 text-blue-400" />, template: '\n> [!note]\n> Important highlight or insight goes here.\n' },
                  { label: 'Table', desc: 'Interactive Google Docs style table', icon: <TableIcon className="w-4 h-4 text-orange-400" />, template: '' },
                  { label: 'Code Block', desc: 'Capture code snippet with syntax highlighting', icon: <CodeIcon className="w-4 h-4 text-pink-400" />, template: '\n```typescript\n// Write code here\nconsole.log("Hello Runagon");\n```\n' },
                  { label: 'Quote', desc: 'Capture a quotation', icon: <Quote className="w-4 h-4 text-purple-400" />, template: '\n> "The best way to predict the future is to invent it."\n' },
                  { label: 'Divider', desc: 'Visually divide blocks with a line', icon: <div className="w-4 h-0.5 bg-zinc-500 rounded my-1.5" />, template: '\n---\n' },
                  { label: 'Link to Note', desc: 'Add a wikilink to another note', icon: <LinkIcon className="w-4 h-4 text-purple-400" />, template: ' [[Note Title]] ' }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.label === 'Table') {
                        setShowTablePickerInBlockMenu(true);
                      } else {
                        insertNewBlock(item.template, insertAfterIndex);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-[#f4f4f6] dark:bg-[#202024] border border-black/[0.05] dark:border-white/[0.06] text-[#585860] dark:text-[#a1a1aa] group-hover:text-[#384cff] dark:group-hover:text-[#6372ff]">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-[#111113] dark:text-[#f4f4f6] group-hover:text-[#384cff] dark:group-hover:text-[#6372ff]">{item.label}</div>
                      <div className="text-[11px] text-[#8e8e93] dark:text-[#71717a]">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded File & Wikilink Context Menu */}
      {activeFileContextMenu && (
        <FileContextMenu
          x={activeFileContextMenu.x}
          y={activeFileContextMenu.y}
          file={activeFileContextMenu.file}
          embedContext={activeFileContextMenu.embedContext}
          onClose={() => setActiveFileContextMenu(null)}
          onOpenFile={onOpenFile || (path => onNavigateLink(path))}
          onOpenSplit={onOpenSplit}
          onRenameFile={onRenameFile}
          onDeleteFile={onDeleteFile}
          onBookmarkFile={onBookmarkFile}
          isBookmarked={isBookmarked}
          onDuplicateFile={onDuplicateFile}
          onRevealInNavigation={onRevealInNavigation}
          onOpenLocalGraph={onOpenLocalGraph}
          onExportPdf={onExportPdf}
          allFiles={allFiles}
          folders={folders}
        />
      )}
    </div>
  );
};
