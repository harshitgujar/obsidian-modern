import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VaultFile, NoteMetadata, EditorViewMode } from '../../types';
import { LivePreview } from './LivePreview';
import { 
  Eye, 
  Code, 
  BookOpen, 
  Pin, 
  MoreHorizontal, 
  FileText, 
  Hash, 
  Clock, 
  CheckCircle2, 
  Split,
  Plus
} from 'lucide-react';

interface EditorProps {
  file: VaultFile;
  allFiles: VaultFile[];
  metadata?: NoteMetadata;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onContentChange: (content: string) => void;
  onNavigateLink: (target: string) => void;
  onTagClick: (tag: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  file,
  allFiles,
  metadata,
  viewMode,
  onViewModeChange,
  onContentChange,
  onNavigateLink,
  onTagClick
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);

  // Wikilink Autocomplete State
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [suggestCoords, setSuggestCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Filter vault files for autocomplete
  const filteredSuggestions = React.useMemo(() => {
    if (!showSuggest) return [];
    const q = suggestQuery.toLowerCase();
    return allFiles
      .filter(f => f.name.replace(/\.md$/, '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allFiles, suggestQuery, showSuggest]);

  // Handle textarea text change and inspect for `[[` trigger
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const pos = e.target.selectionStart;
    setCursorPos(pos);
    onContentChange(newContent);

    // Check if cursor is right after `[[`
    const textBeforeCursor = newContent.slice(0, pos);
    const lastOpenIndex = textBeforeCursor.lastIndexOf('[[');
    const lastCloseIndex = textBeforeCursor.lastIndexOf(']]');

    if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
      const query = textBeforeCursor.slice(lastOpenIndex + 2);
      if (!query.includes('\n')) {
        setSuggestQuery(query);
        setShowSuggest(true);
        setSuggestIndex(0);
        return;
      }
    }

    setShowSuggest(false);
  };

  // Keyboard navigation inside textarea (autocomplete & indenting)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggest && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex(prev => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(filteredSuggestions[suggestIndex].name.replace(/\.md$/, ''));
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggest(false);
        return;
      }
    }

    // Auto-close brackets: [[ -> [[]]
    if (e.key === '[' && textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      const text = file.content;
      if (pos > 0 && text[pos - 1] === '[') {
        e.preventDefault();
        const before = text.slice(0, pos);
        const after = text.slice(pos);
        const updated = `${before}]]${after}`;
        onContentChange(updated);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = pos;
            textareaRef.current.selectionEnd = pos;
          }
        }, 0);
      }
    }

    // Smart Tab indenting
    if (e.key === 'Tab' && !showSuggest && textareaRef.current) {
      e.preventDefault();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const val = textareaRef.current.value;
      textareaRef.current.value = val.substring(0, start) + '  ' + val.substring(end);
      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
      onContentChange(textareaRef.current.value);
    }
  };

  const insertSuggestion = (noteTitle: string) => {
    if (!textareaRef.current) return;
    const text = file.content;
    const pos = textareaRef.current.selectionStart;
    const textBefore = text.slice(0, pos);
    const lastOpenIndex = textBefore.lastIndexOf('[[');

    if (lastOpenIndex !== -1) {
      const beforeBracket = text.slice(0, lastOpenIndex + 2);
      const afterCursor = text.slice(pos);
      const closingBracket = afterCursor.startsWith(']]') ? '' : ']]';
      const updated = `${beforeBracket}${noteTitle}${closingBracket}${afterCursor.replace(/^\]\]/, '')}`;
      onContentChange(updated);
      setShowSuggest(false);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastOpenIndex + 2 + noteTitle.length + 2;
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
        }
      }, 10);
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

  const words = metadata?.wordCount || 0;
  const chars = metadata?.charCount || 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="flex flex-col h-full bg-[#18181b] overflow-hidden">
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

        {/* View Mode Controls (Live, Source, Reading) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => onViewModeChange('live')}
            title="Live Preview Mode"
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
            title="Source Mode (Raw Markdown)"
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
            title="Reading View"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              viewMode === 'reading'
                ? 'bg-purple-600 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reading</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto relative">
        {viewMode === 'live' || viewMode === 'reading' ? (
          <LivePreview
            file={file}
            metadata={metadata}
            onNavigateLink={onNavigateLink}
            onTagClick={onTagClick}
            onToggleTask={handleToggleTask}
          />
        ) : (
          /* Source Mode */
          <div className="relative w-full h-full flex">
            {/* Line numbers gutter */}
            <div className="w-12 py-6 bg-zinc-900/40 select-none text-right pr-3 font-mono text-xs text-zinc-600 border-r border-zinc-800/40">
              {file.content.split('\n').map((_, i) => (
                <div key={i} className="leading-relaxed">{i + 1}</div>
              ))}
            </div>

            {/* Raw Textarea */}
            <textarea
              ref={textareaRef}
              value={file.content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Start writing in Markdown... (Type [[ to link notes)"
              className="flex-1 h-full p-6 bg-transparent text-zinc-200 font-mono text-[14px] leading-relaxed resize-none focus:outline-none select-text"
              spellCheck={false}
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
                onClick={() => insertSuggestion(item.name.replace(/\.md$/, ''))}
                className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  idx === suggestIndex
                    ? 'bg-purple-600/30 text-purple-200'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-zinc-200">{item.name.replace(/\.md$/, '')}</div>
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
          <span>Saved to local vault</span>
        </div>
      </div>
    </div>
  );
};
