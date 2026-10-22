import React, { useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Highlighter, 
  Code2, 
  Link, 
  CheckSquare, 
  Quote, 
  Table, 
  Copy, 
  Scissors, 
  Clipboard, 
  Bookmark, 
  Share2, 
  Search, 
  Heading1, 
  Heading2, 
  FileText,
  List,
  Sparkles
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
  selectedText?: string;
}

interface EditorContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  onFormat: (before: string, after: string, fallback?: string) => void;
  onInsertBlock: (block: string) => void;
  onFind?: (text: string) => void;
  onCopyNoteLink?: () => void;
  onToggleBookmark?: () => void;
  isBookmarked?: boolean;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  position,
  onClose,
  onFormat,
  onInsertBlock,
  onFind,
  onCopyNoteLink,
  onToggleBookmark,
  isBookmarked = false
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay on screen
  const menuWidth = 220;
  const menuHeight = 360;
  let left = position.x;
  let top = position.y;

  if (left + menuWidth > window.innerWidth) {
    left = Math.max(10, window.innerWidth - menuWidth - 10);
  }
  if (top + menuHeight > window.innerHeight) {
    top = Math.max(10, window.innerHeight - menuHeight - 10);
  }

  const sel = position.selectedText || '';

  const runAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-[10000] w-56 bg-[#18181e]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-300 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      {/* Cut / Copy / Paste Row */}
      <div className="grid grid-cols-3 gap-1 pb-1 mb-1 border-b border-zinc-800 text-[11px]">
        <button
          onClick={() =>
            runAndClose(() => {
              if (sel) {
                navigator.clipboard.writeText(sel);
                onFormat('', '', '');
              }
            })
          }
          disabled={!sel}
          className="flex flex-col items-center justify-center py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Cut (Ctrl+X)"
        >
          <Scissors className="w-3.5 h-3.5 mb-0.5" />
          <span>Cut</span>
        </button>

        <button
          onClick={() =>
            runAndClose(() => {
              if (sel) navigator.clipboard.writeText(sel);
            })
          }
          disabled={!sel}
          className="flex flex-col items-center justify-center py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Copy (Ctrl+C)"
        >
          <Copy className="w-3.5 h-3.5 mb-0.5" />
          <span>Copy</span>
        </button>

        <button
          onClick={() =>
            runAndClose(async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) onInsertBlock(text);
              } catch {}
            })
          }
          className="flex flex-col items-center justify-center py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
          title="Paste (Ctrl+V)"
        >
          <Clipboard className="w-3.5 h-3.5 mb-0.5" />
          <span>Paste</span>
        </button>
      </div>

      {/* Formatting Section */}
      <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
        Format
      </div>

      <button
        onClick={() => runAndClose(() => onFormat('**', '**', sel || 'bold text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Bold className="w-3.5 h-3.5 text-zinc-400" />
          <span>Bold</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">Ctrl+B</span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('*', '*', sel || 'italic text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Italic className="w-3.5 h-3.5 text-zinc-400" />
          <span>Italic</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">Ctrl+I</span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('~~', '~~', sel || 'strikethrough text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Strikethrough className="w-3.5 h-3.5 text-zinc-400" />
          <span>Strikethrough</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('==', '==', sel || 'highlighted text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Highlighter className="w-3.5 h-3.5 text-amber-400" />
          <span>Highlight</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('`', '`', sel || 'code'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Inline Code</span>
        </span>
      </button>

      <div className="w-full h-[1px] bg-zinc-800 my-1" />

      {/* Insert Blocks Section */}
      <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
        Insert
      </div>

      <button
        onClick={() => runAndClose(() => onFormat('[[', ']]', sel || 'Note Title'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Link className="w-3.5 h-3.5 text-purple-400" />
          <span>Link Note (Wikilink)</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">[[...]]</span>
      </button>

      <button
        onClick={() => runAndClose(() => onInsertBlock('- [ ] ' + (sel || 'Task item')))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Checklist Item</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onInsertBlock('> [!note]\n> ' + (sel || 'Callout note')))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Quote className="w-3.5 h-3.5 text-blue-400" />
          <span>Callout Box</span>
        </span>
      </button>

      <button
        onClick={() =>
          runAndClose(() =>
            onInsertBlock(
              '| Column 1 | Column 2 |\n| -------- | -------- |\n| Item 1   | Item 2   |'
            )
          )
        }
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Table className="w-3.5 h-3.5 text-orange-400" />
          <span>Markdown Table</span>
        </span>
      </button>

      <div className="w-full h-[1px] bg-zinc-800 my-1" />

      {/* Note Utilities */}
      {onFind && (
        <button
          onClick={() => runAndClose(() => onFind(sel))}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span>Find in Note</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Ctrl+F</span>
        </button>
      )}

      {onCopyNoteLink && (
        <button
          onClick={() => runAndClose(onCopyNoteLink)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy Link to Note</span>
          </span>
        </button>
      )}

      {onToggleBookmark && (
        <button
          onClick={() => runAndClose(onToggleBookmark)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-purple-400 fill-purple-400' : 'text-zinc-400'}`} />
            <span>{isBookmarked ? 'Remove Bookmark' : 'Bookmark Note'}</span>
          </span>
        </button>
      )}
    </div>
  );
};
