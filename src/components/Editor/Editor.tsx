import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VaultFile, NoteMetadata, EditorViewMode, BacklinkMention } from '../../types';
import { vault } from '../../services/vault';
import { LivePreview } from './LivePreview';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';
import { EditorContextMenu, ContextMenuPosition } from './EditorContextMenu';
import { 
  FileText, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  X,
  Image as ImageIcon,
  Music,
  ExternalLink
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
  isBookmarked?: boolean;
  onCloseFindReplace?: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
  onContentChange: (content: string) => void;
  onNavigateLink: (target: string) => void;
  onTagClick: (tag: string) => void;
  onStartPresentation?: () => void;
  onToggleBookmark?: () => void;
  onCopyNoteLink?: () => void;
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
  isBookmarked = false,
  onCloseFindReplace,
  onViewModeChange,
  onContentChange,
  onNavigateLink,
  onTagClick,
  onStartPresentation,
  onToggleBookmark,
  onCopyNoteLink
}) => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(findReplaceOpen || false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

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
  const filteredSuggestions = useMemo(() => {
    if (!showSuggest) return [];
    const q = suggestQuery.toLowerCase();
    return allFiles
      .filter(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allFiles, suggestQuery, showSuggest]);

  // Contextual Selection Formatting
  const handleFormatSelection = useCallback(
    (before: string, after: string = before, fallback: string = 'text') => {
      const selection = window.getSelection();
      const selText = selection ? selection.toString() : '';

      if (selText && file.content.includes(selText)) {
        const idx = file.content.indexOf(selText);
        if (idx !== -1) {
          const newContent =
            file.content.slice(0, idx) +
            before +
            selText +
            after +
            file.content.slice(idx + selText.length);
          onContentChange(newContent);
          return;
        }
      }

      // Fallback: append snippet cleanly
      const current = file.content;
      const snippet = `\n${before}${fallback}${after}\n`;
      onContentChange(current + snippet);
    },
    [file.content, onContentChange]
  );

  const handleInsertBlock = useCallback(
    (block: string) => {
      const current = file.content;
      onContentChange(current + `\n${block}\n`);
    },
    [file.content, onContentChange]
  );

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
  const handleToggleTask = useCallback(
    (lineIndex: number) => {
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
    },
    [file.content, onContentChange]
  );

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selectedText
    });
  };

  return (
    <div
      ref={editorContainerRef}
      onContextMenu={handleContextMenu}
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
              const embedSyntax =
                isImg || isMedia
                  ? `\n![[${droppedFile.name}]]\n`
                  : `\n[[${droppedFile.name}]]\n`;
              onContentChange(`${file.content}\n${embedSyntax}`);
            };
            reader.readAsDataURL(droppedFile);
          }
          return;
        }

        // 2. Internal notes / files dragged from sidebar
        const rawData =
          e.dataTransfer.getData('application/obsidian-file') ||
          e.dataTransfer.getData('text/plain');
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
        const linkSyntax =
          isImage || isCanvas || isMedia
            ? `\n![[${target.name}]]\n`
            : `\n[[${target.name.replace(/\.md$/, '')}]]\n`;

        onContentChange(file.content + linkSyntax);
      }}
      className="flex-1 flex flex-col h-full bg-[#18181b] overflow-hidden relative select-text"
    >
      {/* Floating Contextual Formatting Toolbar on Selection */}
      <FloatingFormatToolbar
        containerRef={editorContainerRef}
        onFormat={handleFormatSelection}
        onInsertBlock={handleInsertBlock}
        onFindSelection={text => {
          setFindText(text);
          setShowFindReplace(true);
        }}
      />

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <EditorContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onFormat={handleFormatSelection}
          onInsertBlock={handleInsertBlock}
          onFind={text => {
            if (text) setFindText(text);
            setShowFindReplace(true);
          }}
          onCopyNoteLink={onCopyNoteLink}
          onToggleBookmark={onToggleBookmark}
          isBookmarked={isBookmarked}
        />
      )}

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
                <button
                  onClick={() => {
                    setShowFindReplace(false);
                    if (onCloseFindReplace) onCloseFindReplace();
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  title="Close (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Replace Row */}
            {isReplaceMode && (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  placeholder="Replace with..."
                  className="flex-1 bg-[#141418] border border-zinc-700/70 focus:border-purple-500 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                />
                <button
                  onClick={handleReplaceCurrent}
                  disabled={matches.length === 0}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Replace current occurrence"
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

        {(() => {
          const lowerExt = file.extension.toLowerCase();
          const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(lowerExt);
          const isAudio = ['webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(lowerExt);
          const isPdf = lowerExt === 'pdf';

          if (isImage) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center p-6 h-full bg-[#141416] overflow-auto select-none">
                <div className="max-w-4xl max-h-[80vh] flex flex-col items-center gap-4 bg-[#18181b] p-4 rounded-xl border border-zinc-800 shadow-2xl">
                  <img
                    src={`/api/vault/file/raw?path=${encodeURIComponent(file.path)}`}
                    alt={file.name}
                    className="max-h-[66vh] max-w-full object-contain rounded-lg"
                  />
                  <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-mono text-zinc-300">{file.name}</span>
                      <span>•</span>
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => vault.openInDefaultApp(file.path)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in default app</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (isAudio) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center p-6 h-full bg-[#141416] select-none">
                <div className="w-full max-w-md bg-[#18181b] p-6 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Music className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-zinc-100 text-sm">{file.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Audio recording • {(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <audio
                    controls
                    src={`/api/vault/file/raw?path=${encodeURIComponent(file.path)}`}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            );
          }

          if (isPdf) {
            return (
              <div className="flex-1 flex flex-col h-full bg-[#141416]">
                <iframe
                  src={`/api/vault/file/raw?path=${encodeURIComponent(file.path)}`}
                  title={file.name}
                  className="w-full h-full border-0"
                />
              </div>
            );
          }

          if (viewMode === 'live' || viewMode === 'reading') {
            return (
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
            );
          }

          return (
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
          );
        })()}

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
                  <div className="font-medium text-zinc-200">
                    {item.name.replace(/\.[^/.]+$/, '')}
                  </div>
                  {item.folder && <div className="text-[10px] text-zinc-500">{item.folder}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
