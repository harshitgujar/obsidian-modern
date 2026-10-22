import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VaultFile, NoteMetadata, EditorViewMode, BacklinkMention } from '../../types';
import { vault } from '../../services/vault';
import { LivePreview } from './LivePreview';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { 
  Eye, 
  Code, 
  BookOpen, 
  FileText, 
  Hash, 
  Clock, 
  CheckCircle2, 
  Presentation,
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Code2,
  Table,
  CheckSquare,
  Link,
  Quote,
  Search,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';

interface EditorProps {
  file: VaultFile;
  allFiles: VaultFile[];
  metadata?: NoteMetadata;
  backlinks?: BacklinkMention[];
  viewMode: EditorViewMode;
  showLineNumbers?: boolean;
  showFrontmatter?: boolean;
  foldHeading?: boolean;
  findReplaceOpen?: boolean;
  onCloseFindReplace?: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
  onContentChange: (content: string) => void;
  onNavigateLink: (target: string) => void;
  onTagClick: (tag: string) => void;
  onStartPresentation?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  file,
  allFiles,
  metadata,
  backlinks = [],
  viewMode,
  showLineNumbers = true,
  showFrontmatter = true,
  foldHeading = true,
  findReplaceOpen,
  onCloseFindReplace,
  onViewModeChange,
  onContentChange,
  onNavigateLink,
  onTagClick,
  onStartPresentation
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(findReplaceOpen || false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (findReplaceOpen !== undefined) {
      setShowFindReplace(findReplaceOpen);
      if (findReplaceOpen) {
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
    }
  }, [findReplaceOpen]);

  useEffect(() => {
    if (showFindReplace) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    }
  }, [showFindReplace]);

  // Keyboard shortcut listener for Find (Ctrl+F) and Replace (Ctrl+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
        setIsReplaceMode(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
        setIsReplaceMode(true);
      } else if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
        if (onCloseFindReplace) onCloseFindReplace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace, onCloseFindReplace]);

  // Compute matches
  const matches = useMemo(() => {
    if (!findText) return [];
    try {
      const flags = matchCase ? 'g' : 'gi';
      const pattern = useRegex
        ? findText
        : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      const results: { index: number; length: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(file.content)) !== null) {
        results.push({ index: m.index, length: m[0].length });
        if (!regex.global) break;
      }
      return results;
    } catch {
      return [];
    }
  }, [file.content, findText, matchCase, useRegex]);

  const handleNextMatch = () => {
    if (!matches.length) return;
    setCurrentMatchIndex(i => (i + 1) % matches.length);
  };

  const handlePrevMatch = () => {
    if (!matches.length) return;
    setCurrentMatchIndex(i => (i - 1 + matches.length) % matches.length);
  };

  const handleReplaceCurrent = () => {
    if (!matches.length || currentMatchIndex >= matches.length) return;
    const match = matches[currentMatchIndex];
    const newContent =
      file.content.slice(0, match.index) +
      replaceText +
      file.content.slice(match.index + match.length);
    onContentChange(newContent);
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const pattern = useRegex
        ? findText
        : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      const newContent = file.content.replace(regex, replaceText);
      onContentChange(newContent);
    } catch {}
  };

  // Wikilink Autocomplete State
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);

  // Filter vault files for autocomplete
  const filteredSuggestions = React.useMemo(() => {
    if (!showSuggest) return [];
    const q = suggestQuery.toLowerCase();
    return allFiles
      .filter(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allFiles, suggestQuery, showSuggest]);

  // Wrap selection or insert at end with markdown format
  const wrapSelection = (before: string, after: string = before, placeholder: string = 'text') => {
    const current = file.content;
    const snippet = `\n${before}${placeholder}${after}`;
    onContentChange(current + snippet);
  };

  const insertSuggestion = (noteTitle: string) => {
    const text = file.content;
    const pos = text.lastIndexOf('[[');
    if (pos !== -1) {
      const before = text.slice(0, pos + 2);
      const after = text.slice(pos + 2);
      onContentChange(`${before}${noteTitle}]]${after.replace(/^[^\]]*\]\]?/, '')}`);
      setShowSuggest(false);
    }
  };

  // Toggle checklist task item from Live Preview
  const handleToggleTask = useCallback((lineIndex: number) => {
    const lines = file.content.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const match = line.match(/^(\s*-\s+\[)([ xX])(\]\s+.*)$/);
      if (match) {
        const isDone = match[2].toLowerCase() === 'x';
        lines[lineIndex] = `${match[1]}${isDone ? ' ' : 'x'}${match[3]}`;
        onContentChange(lines.join('\n'));
      }
    }
  }, [file.content, onContentChange]);

  const handleAddProperty = (key: string, value: string) => {
    let content = file.content;
    if (content.startsWith('---')) {
      const endIdx = content.indexOf('\n---', 3);
      if (endIdx !== -1) {
        const before = content.slice(0, endIdx);
        const after = content.slice(endIdx);
        content = `${before}\n${key}: ${value}${after}`;
      }
    } else {
      content = `---\n${key}: ${value}\n---\n\n${content}`;
    }
    onContentChange(content);
  };

  const words = metadata?.wordCount || 0;
  const chars = metadata?.charCount || 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={async e => {
        e.preventDefault();
        // 1. External files dropped from Finder / Desktop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const droppedFile = e.dataTransfer.files[i];
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const relPath = `Attachments/${droppedFile.name}`;
              await vault.saveBinaryFile(relPath, base64);
              const isImg = droppedFile.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i);
              const isMedia = droppedFile.name.match(/\.(mp3|wav|ogg|mp4|webm|pdf)$/i);
              const embedSyntax = isImg || isMedia ? `\n![[${droppedFile.name}]]\n` : `\n[[${droppedFile.name}]]\n`;
              onContentChange(`${file.content}\n${embedSyntax}`);
            };
            reader.readAsDataURL(droppedFile);
          }
          return;
        }

        // 2. Internal notes / files dragged from sidebar
        const rawData = e.dataTransfer.getData('application/obsidian-file') || e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        let filePath = rawData;
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && parsed.path) filePath = parsed.path;
        } catch {}

        const target = allFiles.find(f => f.path === filePath || f.name === filePath);
        if (!target) return;

        const isImage = target.path.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i);
        const isCanvas = target.extension === 'canvas';
        const isMedia = target.path.match(/\.(mp3|wav|ogg|mp4|webm|pdf)$/i);
        const linkSyntax = isImage || isCanvas || isMedia ? `\n![[${target.name}]]\n` : `\n[[${target.name.replace(/\.md$/, '')}]]\n`;

        onContentChange(file.content + linkSyntax);
      }}
      className="flex flex-col h-full bg-[#18181b] overflow-hidden relative"
    >
      {/* Top Note Header Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-800/80 bg-[#161619] select-none shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-xs text-zinc-400 font-mono truncate">
            {file.folder ? `${file.folder}/` : ''}
          </span>
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {file.name.replace(/\.md$/, '')}
          </span>
        </div>

        {/* View Mode Controls & Formatting */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 text-zinc-400">
            <button onClick={() => wrapSelection('**', '**', 'bold text')} title="Bold (Ctrl+B)" className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('*', '*', 'italic text')} title="Italic (Ctrl+I)" className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('==', '==', 'highlighted text')} title="Highlight" className="p-1 hover:text-amber-300 rounded hover:bg-zinc-800 transition-colors">
              <Highlighter className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('`', '`', 'code')} title="Inline Code" className="p-1 hover:text-purple-300 rounded hover:bg-zinc-800 transition-colors">
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('[[', ']]', 'Note Title')} title="Link Note (Ctrl+K)" className="p-1 hover:text-purple-300 rounded hover:bg-zinc-800 transition-colors">
              <Link className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('- [ ] ', '', 'Task item')} title="Checklist Task" className="p-1 hover:text-emerald-400 rounded hover:bg-zinc-800 transition-colors">
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => wrapSelection('> [!note]\n> ', '', 'Callout note')} title="Callout Card" className="p-1 hover:text-blue-400 rounded hover:bg-zinc-800 transition-colors">
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowFindReplace(prev => !prev)}
              title="Find and replace (Ctrl+F / Ctrl+H)"
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ml-0.5 ${showFindReplace ? 'text-purple-400 bg-zinc-800' : 'hover:text-purple-300'}`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800 shadow-sm">
            <button
              onClick={() => onViewModeChange('live')}
              title="Live Preview Mode (Rendered Markdown)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'live'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>

            <button
              onClick={() => onViewModeChange('source')}
              title="Source Mode (High-Fidelity CodeMirror 6 Editor)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'source'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Source</span>
            </button>

            <button
              onClick={() => onViewModeChange('reading')}
              title="Reading View (Clean Presentation)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'reading'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reading</span>
            </button>

            {onStartPresentation && (
              <button
                onClick={onStartPresentation}
                title="Start Slide Presentation (Alt+P)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors bg-purple-950/60 text-purple-300 border border-purple-800/60 hover:bg-purple-900/80 ml-1 font-medium"
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Slides</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto relative bg-[#18181b]">
        {/* Floating Find & Replace Panel (Obsidian-style) */}
        {showFindReplace && (
          <div className="absolute top-3 right-5 z-40 bg-[#1e1e24]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 flex flex-col gap-1.5 min-w-[340px] text-xs text-zinc-200">
            {/* Find Row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 pointer-events-none" />
                <input
                  ref={findInputRef}
                  type="text"
                  value={findText}
                  onChange={e => {
                    setFindText(e.target.value);
                    setCurrentMatchIndex(0);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) handlePrevMatch();
                      else handleNextMatch();
                    }
                  }}
                  placeholder="Find in note..."
                  className="w-full bg-[#141418] border border-zinc-700/70 focus:border-purple-500 rounded-lg pl-7 pr-16 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                />
                <span className="absolute right-2 text-[10px] text-zinc-400 font-mono">
                  {findText
                    ? matches.length > 0
                      ? `${currentMatchIndex + 1}/${matches.length}`
                      : '0 matches'
                    : ''}
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={handlePrevMatch}
                  disabled={matches.length === 0}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous Match (Shift+Enter)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMatch}
                  disabled={matches.length === 0}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next Match (Enter)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 pl-1 border-l border-zinc-700/60">
                <button
                  onClick={() => setMatchCase(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    matchCase
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Match Case (Aa)"
                >
                  Aa
                </button>
                <button
                  onClick={() => setUseRegex(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    useRegex
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Regular Expression (.*)"
                >
                  .*
                </button>
              </div>

              <button
                onClick={() => {
                  setShowFindReplace(false);
                  if (onCloseFindReplace) onCloseFindReplace();
                }}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white ml-0.5"
                title="Close (Escape)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Replace Mode Toggle */}
            <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-zinc-800/80">
              <button
                onClick={() => setIsReplaceMode(prev => !prev)}
                className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 text-[11px]"
              >
                <span>{isReplaceMode ? '▾ Replace Mode' : '▸ Replace'}</span>
              </button>
            </div>

            {/* Replace Row */}
            {isReplaceMode && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleReplaceCurrent();
                  }}
                  placeholder="Replace with..."
                  className="flex-1 bg-[#141418] border border-zinc-700/70 focus:border-purple-500 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                />
                <button
                  onClick={handleReplaceCurrent}
                  disabled={matches.length === 0}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Replace selected match"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={matches.length === 0}
                  className="px-2 py-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Replace all occurrences"
                >
                  All
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'live' || viewMode === 'reading' ? (
          <LivePreview
            file={file}
            allFiles={allFiles}
            metadata={metadata}
            backlinks={backlinks}
            showFrontmatter={showFrontmatter}
            foldHeading={foldHeading}
            onNavigateLink={onNavigateLink}
            onTagClick={onTagClick}
            onToggleTask={handleToggleTask}
            onAddProperty={handleAddProperty}
            onEnterEditMode={() => onViewModeChange('source')}
          />
        ) : (
          /* High-Fidelity CodeMirror 6 Source Mode */
          <div className="w-full h-full flex flex-col overflow-hidden bg-[#18181b]">
            <CodeMirrorEditor
              value={file.content}
              onChange={onContentChange}
              showLineNumbers={showLineNumbers}
              allFiles={allFiles}
              onNavigateLink={onNavigateLink}
            />
          </div>
        )}

        {/* Obsidian-Style Wikilink Autocomplete Dropdown */}
        {showSuggest && filteredSuggestions.length > 0 && (
          <div className="absolute top-16 left-28 w-72 bg-zinc-900/95 border border-zinc-700/80 rounded-lg shadow-2xl backdrop-blur-xl z-50 overflow-hidden text-xs py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold border-b border-zinc-800 flex items-center justify-between">
              <span>Link Note</span>
              <span>[[...]]</span>
            </div>
            {filteredSuggestions.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => insertSuggestion(item.name.replace(/\.[^/.]+$/, ''))}
                className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  idx === suggestIndex
                    ? 'bg-purple-600/30 text-purple-200'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-zinc-200">{item.name.replace(/\.[^/.]+$/, '')}</div>
                  {item.folder && (
                    <div className="text-[10px] text-zinc-500">{item.folder}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status Bar for Note */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-[#141416] border-t border-zinc-800 text-[11px] text-zinc-500 select-none shrink-0 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-zinc-600" />
            {words} words · {chars} chars
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-600" />
            {readingTime} min read
          </span>
          {metadata && metadata.outlinks.length > 0 && (
            <span className="text-purple-400/80">
              {metadata.outlinks.length} outgoing links
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Saved to disk</span>
        </div>
      </div>
    </div>
  );
};
