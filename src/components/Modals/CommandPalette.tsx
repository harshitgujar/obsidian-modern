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
      className="fixed inset-0 bg-black/65 backdrop-blur-2xl z-50 flex items-start justify-center pt-24 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-panel-elevated w-full max-w-xl rounded-2xl overflow-hidden flex flex-col text-sm shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.18)]"
      >
        {/* Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.03]">
          <Terminal className="w-4 h-4 text-purple-400 mr-3 shrink-0" />
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
            className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-base"
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredCommands.length === 0 ? (
            <div className="text-zinc-500 text-center py-6 text-xs">
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
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors border-none ${
                  idx === selectedIndex
                    ? 'bg-[#705dcf] text-white shadow-sm'
                    : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {cmd.category && (
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${idx === selectedIndex ? 'text-white/70' : 'text-zinc-500'}`}>
                      {cmd.category}:
                    </span>
                  )}
                  <span className="font-medium truncate">{cmd.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  {cmd.shortcut && (
                    <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border-none ${idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                  {idx === selectedIndex && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> navigate</span>
            <span><strong>↵</strong> execute</span>
            <span><strong>esc</strong> close</span>
          </div>
          <span>Command Palette</span>
        </div>
      </div>
    </div>
  );
};
