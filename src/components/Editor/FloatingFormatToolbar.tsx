import React, { useEffect, useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Highlighter, 
  Code2, 
  Link, 
  Quote, 
  CheckSquare, 
  Heading1, 
  Heading2, 
  Heading3, 
  Type, 
  Table, 
  Copy, 
  Check,
  Search
} from 'lucide-react';

interface FloatingFormatToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  onFormat: (before: string, after: string, fallback?: string) => void;
  onHeading?: (level: number) => void;
  onInsertBlock: (block: string) => void;
  onFindSelection?: (text: string) => void;
}

export const FloatingFormatToolbar: React.FC<FloatingFormatToolbarProps> = ({
  containerRef,
  onFormat,
  onHeading,
  onInsertBlock,
  onFindSelection
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setCoords(null);
        setSelectedText('');
        setShowHeadingMenu(false);
        return;
      }

      // Check if selection is within our container
      if (containerRef.current) {
        const anchorNode = selection.anchorNode;
        if (anchorNode && !containerRef.current.contains(anchorNode)) {
          setCoords(null);
          return;
        }
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setCoords(null);
          return;
        }

        const selectedStr = selection.toString();
        setSelectedText(selectedStr);

        // Position above the selection, or below if too close to top
        const toolbarHeight = 40;
        let top = rect.top - toolbarHeight - 8;
        if (top < 60) {
          top = rect.bottom + 8;
        }

        let left = rect.left + rect.width / 2;
        // Keep within viewport horizontally
        left = Math.max(160, Math.min(window.innerWidth - 180, left));

        setCoords({ x: left, y: top });
      } catch {
        setCoords(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('scroll', handleSelectionChange, true);
    window.addEventListener('resize', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', handleSelectionChange, true);
      window.removeEventListener('resize', handleSelectionChange);
    };
  }, [containerRef]);

  if (!coords) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999
      }}
      className="flex items-center gap-0.5 skeuo-card px-2 py-1 shadow-[0_12px_36px_rgba(0,0,0,0.12)] text-[#111113] text-xs select-none animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={e => {
        // Prevent losing focus / selection
        e.preventDefault();
      }}
    >
      {/* Headings Selector */}
      <div className="relative">
        <button
          onClick={e => handleAction(e, () => setShowHeadingMenu(prev => !prev))}
          title="Turn into heading"
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#ebebef] transition-colors text-[#111113] font-medium text-[11px]"
        >
          <Type className="w-3.5 h-3.5 text-[#18181b]" />
          <span>H▾</span>
        </button>

        {showHeadingMenu && (
          <div className="absolute left-0 bottom-full mb-1.5 w-32 skeuo-card p-1 flex flex-col gap-0.5 text-xs text-[#111113] shadow-lg">
            <button
              onClick={e =>
                handleAction(e, () => {
                  if (onHeading) onHeading(1);
                  else onFormat('# ', '', selectedText || 'Heading 1');
                  setShowHeadingMenu(false);
                })
              }
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#ebebef] text-left"
            >
              <Heading1 className="w-3.5 h-3.5 text-[#18181b]" />
              <span>Heading 1</span>
            </button>
            <button
              onClick={e =>
                handleAction(e, () => {
                  if (onHeading) onHeading(2);
                  else onFormat('## ', '', selectedText || 'Heading 2');
                  setShowHeadingMenu(false);
                })
              }
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#ebebef] text-left"
            >
              <Heading2 className="w-3.5 h-3.5 text-[#18181b]" />
              <span>Heading 2</span>
            </button>
            <button
              onClick={e =>
                handleAction(e, () => {
                  if (onHeading) onHeading(3);
                  else onFormat('### ', '', selectedText || 'Heading 3');
                  setShowHeadingMenu(false);
                })
              }
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#ebebef] text-left"
            >
              <Heading3 className="w-3.5 h-3.5 text-[#18181b]" />
              <span>Heading 3</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-black/[0.08] mx-1" />

      {/* Bold */}
      <button
        onClick={e => handleAction(e, () => onFormat('**', '**', selectedText || 'bold text'))}
        title="Bold (Ctrl+B)"
        className="p-1.5 rounded-lg hover:bg-[#ebebef] text-[#585860] hover:text-[#111113] transition-colors"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      {/* Italic */}
      <button
        onClick={e => handleAction(e, () => onFormat('*', '*', selectedText || 'italic text'))}
        title="Italic (Ctrl+I)"
        className="p-1.5 rounded-lg hover:bg-[#ebebef] text-[#585860] hover:text-[#111113] transition-colors"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      {/* Strikethrough */}
      <button
        onClick={e => handleAction(e, () => onFormat('~~', '~~', selectedText || 'strikethrough text'))}
        title="Strikethrough"
        className="p-1.5 rounded-lg hover:bg-[#ebebef] text-[#585860] hover:text-[#111113] transition-colors"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      {/* Highlight */}
      <button
        onClick={e => handleAction(e, () => onFormat('==', '==', selectedText || 'highlighted text'))}
        title="Highlight"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>

      {/* Inline Code */}
      <button
        onClick={e => handleAction(e, () => onFormat('`', '`', selectedText || 'code'))}
        title="Inline Code"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        <Code2 className="w-3.5 h-3.5" />
      </button>

      {/* Wikilink */}
      <button
        onClick={e => handleAction(e, () => onFormat('[[', ']]', selectedText || 'Note Title'))}
        title="Link Note (Ctrl+K)"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        <Link className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-black/[0.08] mx-1" />

      {/* Quote */}
      <button
        onClick={e => handleAction(e, () => onInsertBlock(`> ${selectedText || 'Quote'}`))}
        title="Quote Block"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      {/* Checklist */}
      <button
        onClick={e => handleAction(e, () => onInsertBlock(`- [ ] ${selectedText || 'Task'}`))}
        title="Checklist Task"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        <CheckSquare className="w-3.5 h-3.5" />
      </button>

      {/* Search in Note */}
      {onFindSelection && (
        <button
          onClick={e => handleAction(e, () => onFindSelection(selectedText))}
          title="Find this text in note"
          className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Copy */}
      <button
        onClick={handleCopy}
        title="Copy selected text"
        className="p-1.5 hover:text-[#111113] rounded-lg hover:bg-[#ebebef] text-[#585860] transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[#18181b]" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
