import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VaultFile, NoteMetadata, EditorViewMode, BacklinkMention } from '../../types';
import { vault } from '../../services/vault';
import { LivePreview } from './LivePreview';
import { CodeMirrorEditor, CodeMirrorEditorRef } from './CodeMirrorEditor';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';
import { EditorContextMenu, ContextMenuPosition } from './EditorContextMenu';
import { FileContextMenu } from '../Common/FileContextMenu';
import { 
  FileText, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  X,
  Image as ImageIcon,
  Music,
  ExternalLink,
  BookOpen,
  Clock,
  Edit3,
  Code,
  Eye,
  Check,
  Sparkles,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Info,
  Table as TableIcon
} from 'lucide-react';

interface EditorProps {
  file: VaultFile;
  allFiles: VaultFile[];
  metadata?: NoteMetadata;
  backlinks?: BacklinkMention[];
  viewMode: EditorViewMode;
  showLineNumbers?: boolean;
  readableLineLength?: boolean;
  strictLineBreaks?: boolean;
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
  onOpenFile?: (path: string) => void;
  onOpenSplit?: (path: string) => void;
  onRenameFile?: (file: VaultFile, newName: string) => void;
  onDeleteFile?: (path: string) => void;
  onDuplicateFile?: (path: string) => void;
  onRevealInNavigation?: (path: string) => void;
  onOpenLocalGraph?: (path: string) => void;
  onExportPdf?: (path: string) => void;
  folders?: string[];
}

export const Editor: React.FC<EditorProps> = ({
  file,
  allFiles,
  metadata,
  backlinks = [],
  viewMode,
  showLineNumbers = true,
  readableLineLength = true,
  strictLineBreaks = false,
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
  onCopyNoteLink,
  onOpenFile,
  onOpenSplit,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onRevealInNavigation,
  onOpenLocalGraph,
  onExportPdf,
  folders = []
}) => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<CodeMirrorEditorRef | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(findReplaceOpen || false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  // Notion-Style Editable Title & Block Inserter
  const [inlineTitle, setInlineTitle] = useState(file.name.replace(/\.md$/, ''));
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  useEffect(() => {
    setInlineTitle(file.name.replace(/\.md$/, ''));
  }, [file.path, file.name]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [activeFileContextMenu, setActiveFileContextMenu] = useState<{
    x: number;
    y: number;
    file: VaultFile;
    embedContext?: {
      rawEmbedText: string;
      onRemoveEmbed: () => void;
    };
  } | null>(null);

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

  // Reading view statistics
  const readingStats = useMemo(() => {
    const text = file.content || '';
    const clean = text.replace(/^---[\s\S]*?---/, '').replace(/`[^`]*`/g, '').trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, readingTime };
  }, [file.content]);

  const handleNextMatch = () => {
    if (!matches.length) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    const m = matches[nextIdx];
    if (m && editorRef.current) {
      editorRef.current.selectRange(m.index, m.index + m.length);
    }
  };

  const handlePrevMatch = () => {
    if (!matches.length) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    const m = matches[prevIdx];
    if (m && editorRef.current) {
      editorRef.current.selectRange(m.index, m.index + m.length);
    }
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
      if (viewMode === 'reading') {
        onViewModeChange('live');
        setTimeout(() => {
          editorRef.current?.formatSelection(before, after, fallback);
        }, 50);
        return;
      }

      if (editorRef.current) {
        editorRef.current.formatSelection(before, after, fallback);
      }
    },
    [viewMode, onViewModeChange]
  );

  const handleMediaContextMenu = useCallback(
    (e: MouseEvent | any, targetFile: VaultFile | undefined, rawText: string) => {
      setActiveFileContextMenu({
        x: e.clientX,
        y: e.clientY,
        file: targetFile || {
          id: `file-${Date.now()}`,
          name: rawText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim().split('/').pop() || 'media',
          path: rawText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim(),
          folder: '',
          extension: rawText.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '',
          content: '',
          size: 0,
          updatedAt: Date.now(),
          createdAt: Date.now()
        },
        embedContext: {
          rawEmbedText: rawText,
          onRemoveEmbed: () => {
            const newContent = file.content.replace(rawText, '').replace(/\n\n\n+/g, '\n\n');
            onContentChange(newContent);
          }
        }
      });
    },
    [file.content, onContentChange]
  );

  const handleInsertBlock = useCallback(
    (block: string) => {
      if (viewMode === 'reading') {
        onViewModeChange('live');
      }

      if (editorRef.current) {
        editorRef.current.insertBlock(block);
        return;
      }

      const current = file.content;
      onContentChange(current + `\n${block}\n`);
    },
    [viewMode, onViewModeChange, file.content, onContentChange]
  );

  const handleInsertHeading = useCallback(
    (level: number) => {
      if (viewMode === 'reading') {
        onViewModeChange('live');
      }

      if (editorRef.current) {
        editorRef.current.insertHeading(level);
        return;
      }

      const prefix = '#'.repeat(level) + ' ';
      onContentChange(file.content + `\n${prefix}Heading\n`);
    },
    [viewMode, onViewModeChange, file.content, onContentChange]
  );

  const handleDeleteSelection = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.deleteSelection();
      return;
    }

    const selection = window.getSelection();
    const selText = selection ? selection.toString() : '';
    if (selText && file.content.includes(selText)) {
      const idx = file.content.indexOf(selText);
      if (idx !== -1) {
        onContentChange(file.content.slice(0, idx) + file.content.slice(idx + selText.length));
      }
    }
  }, [file.content, onContentChange]);

  const handleCopyNoteLinkAction = useCallback(() => {
    if (onCopyNoteLink) {
      onCopyNoteLink();
      showToast(`Copied [[${file.name.replace(/\.md$/, '')}]] to clipboard`);
    } else {
      navigator.clipboard.writeText(`[[${file.name.replace(/\.md$/, '')}]]`);
      showToast(`Copied [[${file.name.replace(/\.md$/, '')}]] to clipboard`);
    }
  }, [onCopyNoteLink, file.name, showToast]);

  const handleToggleBookmarkAction = useCallback(() => {
    if (onToggleBookmark) {
      onToggleBookmark();
      showToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    }
  }, [onToggleBookmark, isBookmarked, showToast]);

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
    if (editorRef.current) {
      editorRef.current.setCursorPos({ x: e.clientX, y: e.clientY });
    }
    const selection = window.getSelection();
    const selectedText = (editorRef.current ? editorRef.current.getSelection() : '') || (selection ? selection.toString() : '');
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
        onHeading={handleInsertHeading}
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
          onCut={handleDeleteSelection}
          onFind={text => {
            if (text) setFindText(text);
            setShowFindReplace(true);
          }}
          onCopyNoteLink={handleCopyNoteLinkAction}
          onToggleBookmark={handleToggleBookmarkAction}
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

          if (viewMode === 'reading') {
            return (
              <div className="w-full h-full flex flex-col overflow-y-auto bg-transparent">
                {/* Reading View Header Bar */}
                <div className="flex items-center justify-between px-6 py-2.5 glass-header text-xs text-zinc-300 shrink-0 sticky top-0 z-30">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-white font-medium bg-purple-600/35 border border-purple-400/40 px-3 py-1 rounded-xl shadow-[0_2px_8px_rgba(168,85,247,0.3)] backdrop-blur-md">
                      <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                      <span>Reading View</span>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="w-3 h-3 text-purple-400/80" />
                      <span>{readingStats.readingTime} min read</span>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{readingStats.words} words</span>
                  </div>
                  <button
                    onClick={() => onViewModeChange('live')}
                    className="glass-pill flex items-center gap-2 px-3 py-1.5 rounded-xl text-zinc-200 hover:text-white transition-all text-xs font-medium shadow-sm"
                    title="Switch to Live Preview to edit (⌘E)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Edit Note</span>
                    <kbd className="text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded text-zinc-300 font-mono">⌘E</kbd>
                  </button>
                </div>

                <div className={`flex-1 p-6 md:p-8 w-full ${readableLineLength ? 'max-w-4xl mx-auto' : 'max-w-none'}`}>
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
                    onEnterEditMode={() => onViewModeChange('live')}
                    isEditable={false}
                    onContentChange={onContentChange}
                    onOpenFile={onOpenFile}
                    onOpenSplit={onOpenSplit}
                    onRenameFile={onRenameFile}
                    onDeleteFile={onDeleteFile}
                    onBookmarkFile={onToggleBookmark}
                    isBookmarked={isBookmarked}
                    onDuplicateFile={onDuplicateFile}
                    onRevealInNavigation={onRevealInNavigation}
                    onOpenLocalGraph={onOpenLocalGraph}
                    onExportPdf={onExportPdf}
                    folders={folders}
                  />
                </div>
              </div>
            );
          }

          if (viewMode === 'live') {
            return (
              /* Live Preview Mode (Interactive Notion-Style High-Fidelity Editing) */
              <div 
                className="w-full h-full flex flex-col overflow-y-auto bg-transparent"
                onClick={e => {
                  if (e.target === e.currentTarget) {
                    editorRef.current?.focus();
                  }
                }}
              >
                <div className="flex items-center justify-between px-6 py-2 glass-header text-xs text-zinc-300 shrink-0 sticky top-0 z-30">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-white font-medium bg-purple-600/35 border border-purple-400/40 px-3 py-1 rounded-xl shadow-[0_2px_8px_rgba(168,85,247,0.3)] backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>Live Preview</span>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">Click anywhere to type & edit</span>
                  </div>
                  <div className="glass-segment-container flex items-center p-0.5 rounded-xl gap-1">
                    <button
                      onClick={() => onViewModeChange('reading')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all text-xs"
                      title="Switch to Reading View"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Reading</span>
                    </button>
                    <button
                      onClick={() => onViewModeChange('source')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-all text-xs"
                      title="Switch to Raw Markdown Source Mode"
                    >
                      <Code className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Source</span>
                    </button>
                  </div>
                </div>

                <div className={`flex-1 flex flex-col p-6 md:p-10 w-full ${readableLineLength ? 'max-w-4xl mx-auto' : 'max-w-none'}`}>
                  {/* Notion-Style Editable Title */}
                  <div className="group relative flex items-center mb-6 pb-2 border-b border-zinc-800/50">
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
                          editorRef.current?.focus();
                        }
                      }}
                      placeholder="Untitled Note"
                      className="inline-title font-bold text-3xl md:text-4xl text-zinc-100 tracking-tight bg-transparent w-full focus:outline-none border-b border-transparent focus:border-purple-500"
                    />
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 font-mono ml-2 shrink-0">
                      Click to rename
                    </span>
                  </div>

                  {/* Notion-Style High-Fidelity CodeMirror Editor */}
                  <div className="flex-1 min-h-[450px]">
                    <CodeMirrorEditor
                      ref={editorRef}
                      value={file.content}
                      onChange={onContentChange}
                      livePreview={true}
                      showLineNumbers={false}
                      readableLineLength={false}
                      allFiles={allFiles}
                      onNavigateLink={onNavigateLink}
                      onMediaContextMenu={handleMediaContextMenu}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Notion-Style Add Block Button */}
                  <div className="mt-8 pt-4 border-t border-dashed border-zinc-800/80">
                    <button
                      onClick={() => setShowBlockMenu(true)}
                      className="flex items-center gap-2 text-zinc-500 hover:text-purple-400 text-xs py-2 px-3 rounded-lg hover:bg-zinc-800/40 transition-colors w-full text-left group"
                    >
                      <Plus className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                      <span className="font-medium">Add block (Heading, Checklist, Table, Callout, Media...)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          /* Source Mode (Raw CodeMirror 6 with Line Numbers) */
          return (
            <div className="w-full h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
              <div className="px-4 py-1.5 bg-[#181818] border-b border-[#282828] flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
                <div className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-mono text-zinc-300">Source Mode</span>
                  <span className="text-zinc-600">•</span>
                  <span>Raw Markdown & Line Numbers</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px]">
                  <span>{file.content.split('\n').length} lines</span>
                  <span>•</span>
                  <span>{file.content.length} chars</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeMirrorEditor
                  ref={editorRef}
                  value={file.content}
                  onChange={onContentChange}
                  showLineNumbers={showLineNumbers}
                  readableLineLength={readableLineLength}
                  allFiles={allFiles}
                  onNavigateLink={onNavigateLink}
                />
              </div>
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

      {/* Notion-Style Quick Block Inserter Modal */}
      {showBlockMenu && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowBlockMenu(false)}
        >
          <div 
            className="w-full max-w-sm bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950/60 text-xs">
              <span className="font-semibold text-zinc-300">Insert Block</span>
              <button 
                onClick={() => setShowBlockMenu(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-1.5 max-h-80 overflow-y-auto space-y-0.5 text-xs">
              {[
                { label: 'Paragraph Text', desc: 'Plain text paragraph', icon: <FileText className="w-4 h-4 text-zinc-400" />, template: '\nNew paragraph text...\n' },
                { label: 'Heading 1', desc: 'Large section heading', icon: <Heading1 className="w-4 h-4 text-purple-400" />, template: '\n# New Section\n' },
                { label: 'Heading 2', desc: 'Medium section heading', icon: <Heading2 className="w-4 h-4 text-purple-400" />, template: '\n## New Sub-section\n' },
                { label: 'Heading 3', desc: 'Small section heading', icon: <Heading3 className="w-4 h-4 text-purple-400" />, template: '\n### Subsection Title\n' },
                { label: 'To-do List', desc: 'Track tasks with an interactive checklist', icon: <CheckSquare className="w-4 h-4 text-emerald-400" />, template: '\n- [ ] New to-do item\n' },
                { label: 'Bulleted List', desc: 'Create a simple bulleted list', icon: <List className="w-4 h-4 text-sky-400" />, template: '\n- List item 1\n- List item 2\n' },
                { label: 'Numbered List', desc: 'Create a list with numbering', icon: <ListOrdered className="w-4 h-4 text-amber-400" />, template: '\n1. First step\n2. Second step\n' },
                { label: 'Callout Box', desc: 'Make writing stand out with an icon', icon: <Info className="w-4 h-4 text-blue-400" />, template: '\n> [!note]\n> Important highlight or insight goes here.\n' },
                { label: 'Table', desc: 'Add a clean markdown table', icon: <TableIcon className="w-4 h-4 text-orange-400" />, template: '\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Item 1   | Item 2   |\n' },
                { label: 'Code Block', desc: 'Syntax highlighted code', icon: <Code className="w-4 h-4 text-pink-400" />, template: '\n```ts\nconsole.log("Hello, Obsidian!");\n```\n' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    editorRef.current?.insertBlock(item.template);
                    setShowBlockMenu(false);
                    editorRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left transition-colors group"
                >
                  <div className="w-7 h-7 rounded-md bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-700/50 group-hover:border-purple-500/50">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-zinc-200 group-hover:text-purple-200">{item.label}</div>
                    <div className="text-[11px] text-zinc-500">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File / Embed Context Menu */}
      {activeFileContextMenu && (
        <FileContextMenu
          x={activeFileContextMenu.x}
          y={activeFileContextMenu.y}
          file={activeFileContextMenu.file}
          embedContext={activeFileContextMenu.embedContext}
          onClose={() => setActiveFileContextMenu(null)}
          onOpenFile={path => {
            onOpenFile?.(path);
            setActiveFileContextMenu(null);
          }}
          onOpenSplit={path => {
            onOpenSplit?.(path);
            setActiveFileContextMenu(null);
          }}
          onRenameFile={(f, newName) => {
            onRenameFile?.(f, newName);
            setActiveFileContextMenu(null);
          }}
          onDeleteFile={path => {
            onDeleteFile?.(path);
            setActiveFileContextMenu(null);
          }}
          onBookmarkFile={(path, title) => {
            onToggleBookmark?.();
            setActiveFileContextMenu(null);
          }}
          isBookmarked={isBookmarked}
          onDuplicateFile={path => {
            onDuplicateFile?.(path);
            setActiveFileContextMenu(null);
          }}
          onRevealInNavigation={path => {
            onRevealInNavigation?.(path);
            setActiveFileContextMenu(null);
          }}
          onOpenLocalGraph={path => {
            onOpenLocalGraph?.(path);
            setActiveFileContextMenu(null);
          }}
          onExportPdf={path => {
            onExportPdf?.(path);
            setActiveFileContextMenu(null);
          }}
          allFiles={allFiles}
          folders={folders}
        />
      )}

      {/* Quick Action Toast Feedback */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 z-50 bg-[#1e1e24]/95 text-zinc-100 text-xs px-3.5 py-2 rounded-xl border border-purple-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
