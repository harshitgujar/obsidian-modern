import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Search
} from 'lucide-react';
import { TableGridPicker, generateMarkdownTable } from './TableGridPicker';

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
  onCut?: () => void;
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
  onCut,
  onFind,
  onCopyNoteLink,
  onToggleBookmark,
  isBookmarked = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);

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

  // Viewport bounds calculation
  const menuWidth = 224;
  const menuHeight = 440;
  let left = position.x;
  let top = position.y;

  if (left + menuWidth > window.innerWidth - 16) {
    left = window.innerWidth - menuWidth - 16;
  }
  if (top + menuHeight > window.innerHeight - 16) {
    top = window.innerHeight - menuHeight - 16;
  }
  if (left < 16) left = 16;
  if (top < 16) top = 16;

  const sel = position.selectedText || '';

  const runAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-[10000] w-56 skeuo-modal p-1.5 text-xs text-[#111113] dark:text-[#f4f4f6] flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Cut / Copy / Paste Row */}
      <div className="grid grid-cols-3 gap-1 pb-1 mb-1 border-b border-black/[0.06] dark:border-white/[0.08] text-[11px]">
        <button
          onClick={() =>
            runAndClose(() => {
              if (sel) {
                navigator.clipboard.writeText(sel);
                if (onCut) onCut();
                else onFormat('', '', '');
              }
            })
          }
          disabled={!sel}
          className="flex flex-col items-center justify-center py-1 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-[#585860] dark:text-[#a1a1aa] hover:text-[#111113] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
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
          className="flex flex-col items-center justify-center py-1 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-[#585860] dark:text-[#a1a1aa] hover:text-[#111113] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
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
          className="flex flex-col items-center justify-center py-1 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-[#585860] dark:text-[#a1a1aa] hover:text-[#111113] dark:hover:text-white"
          title="Paste (Ctrl+V)"
        >
          <Clipboard className="w-3.5 h-3.5 mb-0.5" />
          <span>Paste</span>
        </button>
      </div>

      {/* Formatting Section */}
      <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-[#8e8e93] dark:text-[#71717a] tracking-wider">
        Format
      </div>

      <button
        onClick={() => runAndClose(() => onFormat('**', '**', sel || 'bold text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#384cff] dark:hover:text-[#6372ff] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Bold className="w-3.5 h-3.5 text-[#585860] dark:text-[#a1a1aa]" />
          <span>Bold</span>
        </span>
        <span className="text-[10px] text-[#8e8e93] font-mono">⌘B</span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('*', '*', sel || 'italic text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#384cff] dark:hover:text-[#6372ff] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Italic className="w-3.5 h-3.5 text-[#585860] dark:text-[#a1a1aa]" />
          <span>Italic</span>
        </span>
        <span className="text-[10px] text-[#8e8e93] font-mono">⌘I</span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('~~', '~~', sel || 'strikethrough text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Strikethrough className="w-3.5 h-3.5 text-[#585860] dark:text-[#a1a1aa]" />
          <span>Strikethrough</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('==', '==', sel || 'highlighted text'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          <span>Highlight</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onFormat('`', '`', sel || 'code'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
          <span>Inline Code</span>
        </span>
      </button>

      <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08] my-1" />

      {/* Insert Blocks Section */}
      <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-[#8e8e93] dark:text-[#71717a] tracking-wider">
        Insert
      </div>

      <button
        onClick={() => runAndClose(() => onFormat('[[', ']]', sel || 'Note Title'))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Link className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
          <span>Link Note (Wikilink)</span>
        </span>
        <span className="text-[10px] text-[#8e8e93] font-mono">[[...]]</span>
      </button>

      <button
        onClick={() => runAndClose(() => onInsertBlock('- [ ] ' + (sel || 'Task item')))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
          <span>Checklist Item</span>
        </span>
      </button>

      <button
        onClick={() => runAndClose(() => onInsertBlock('> [!note]\n> ' + (sel || 'Callout note')))}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Quote className="w-3.5 h-3.5 text-blue-500" />
          <span>Callout Box</span>
        </span>
      </button>

      {/* Google Docs Table Creation Button */}
      <div className="relative">
        <button
          onClick={() => setShowTablePicker(prev => !prev)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
            showTablePicker
              ? 'bg-[#384cff] text-white'
              : 'hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-amber-500" />
            <span>Table (Google Docs Style)</span>
          </span>
          <span className="text-[10px] text-[#8e8e93]">Grid ▾</span>
        </button>

        {showTablePicker && (
          <div className="absolute left-full top-0 ml-1.5 z-50">
            <TableGridPicker
              onSelect={(rows, cols) => {
                const md = generateMarkdownTable(rows, cols);
                onInsertBlock(md);
                onClose();
              }}
              onClose={() => setShowTablePicker(false)}
            />
          </div>
        )}
      </div>

      <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08] my-1" />

      {/* Note Utilities */}
      {onFind && (
        <button
          onClick={() => runAndClose(() => onFind(sel))}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#585860] dark:text-[#a1a1aa]" />
            <span>Find in Note</span>
          </span>
          <span className="text-[10px] text-[#8e8e93] font-mono">⌘F</span>
        </button>
      )}

      {onCopyNoteLink && (
        <button
          onClick={() => runAndClose(onCopyNoteLink)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
            <span>Copy Link to Note</span>
          </span>
        </button>
      )}

      {onToggleBookmark && (
        <button
          onClick={() => runAndClose(onToggleBookmark)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-[#585860] dark:text-[#a1a1aa]'}`} />
            <span>{isBookmarked ? 'Remove Bookmark' : 'Bookmark Note'}</span>
          </span>
          <span className="text-[10px] text-[#8e8e93] font-mono">⌘D</span>
        </button>
      )}
    </div>,
    document.body
  );
};
