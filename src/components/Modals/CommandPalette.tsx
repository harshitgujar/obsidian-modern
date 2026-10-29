import React, { useState, useEffect, useRef } from 'react';
import { CommandItem } from '../../types';
import { Terminal, CornerDownLeft, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  commands,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      c => c.title.toLowerCase().includes(q) || (c.category && c.category.toLowerCase().includes(q))
    );
  }, [commands, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/25 backdrop-blur-md z-50 flex items-start justify-center pt-20 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="skeuo-modal w-full max-w-xl overflow-hidden flex flex-col text-sm text-[#111113] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.05)] border border-black/[0.08]"
      >
        {/* Input Bar */}
        <div className="p-3 pb-2 border-b border-black/[0.06] bg-white">
          <div className="flex items-center px-3.5 py-2 bg-[#f4f4f6] rounded-full border border-black/[0.07] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
            <Terminal className="w-4 h-4 text-[#18181b] mr-2.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="flex-1 bg-transparent text-[#111113] placeholder-[#8e8e93] focus:outline-none text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[#8e8e93] hover:text-[#111113] p-0.5 rounded-full mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#8e8e93] hover:text-[#111113] p-1 rounded-full hover:bg-black/[0.05] transition-all"
            >
              <kbd className="text-[10px] bg-[#ebebef] border border-black/[0.06] px-1.5 py-0.5 rounded-full font-mono">esc</kbd>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="text-[#8e8e93] text-center py-6 text-xs">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                  idx === selectedIndex
                    ? 'bg-[rgba(56,76,255,0.08)] text-[#111113] font-medium shadow-xs border border-[rgba(56,76,255,0.2)]'
                    : 'border-transparent text-[#585860] hover:bg-[#f4f4f6] hover:text-[#111113]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {cmd.category && (
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${idx === selectedIndex ? 'text-[#384cff]' : 'text-[#8e8e93]'}`}>
                      {cmd.category}:
                    </span>
                  )}
                  <span className="font-medium truncate">{cmd.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  {cmd.shortcut && (
                    <kbd className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${idx === selectedIndex ? 'bg-white border-[rgba(56,76,255,0.2)] text-[#384cff]' : 'bg-[#ebebef] text-[#585860] border-black/[0.05]'}`}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                  {idx === selectedIndex && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#384cff] shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-black/[0.06] bg-[#f8f8fa] text-[11px] text-[#585860] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">↵</kbd> execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">esc</kbd> close
            </span>
          </div>
          <span className="font-medium text-[#111113]">Command Palette</span>
        </div>
      </div>
    </div>
  );
};
