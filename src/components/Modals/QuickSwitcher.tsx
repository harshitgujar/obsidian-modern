import React, { useState, useEffect, useRef } from 'react';
import { VaultFile } from '../../types';
import { Search, FileText, Plus, CornerDownLeft, X } from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  files: VaultFile[];
  recentIds: string[];
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (title: string) => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  files,
  recentIds,
  onClose,
  onSelectFile,
  onCreateFile
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

  // Compute matched items
  const matchedFiles = React.useMemo(() => {
    if (!query.trim()) {
      // Show recent files first, then the rest
      const recentMap = new Map(recentIds.map((id, idx) => [id, idx]));
      return [...files].sort((a, b) => {
        const rA = recentMap.has(a.id) ? recentMap.get(a.id)! : 9999;
        const rB = recentMap.has(b.id) ? recentMap.get(b.id)! : 9999;
        return rA - rB;
      }).slice(0, 10);
    }

    const q = query.toLowerCase();
    return files
      .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 10);
  }, [files, query, recentIds]);

  const exactMatchExists = React.useMemo(() => {
    const qClean = query.trim().replace(/\.md$/, '').toLowerCase();
    return files.some(f => f.name.replace(/\.md$/, '').toLowerCase() === qClean);
  }, [files, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    const totalCount = matchedFiles.length + (!exactMatchExists && query.trim() ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchedFiles.length) {
        onSelectFile(matchedFiles[selectedIndex].id);
        onClose();
      } else if (!exactMatchExists && query.trim()) {
        onCreateFile(query.trim());
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-sm"
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type note name to open or create..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-base"
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {matchedFiles.map((file, idx) => (
            <div
              key={file.id}
              onClick={() => {
                onSelectFile(file.id);
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                idx === selectedIndex
                  ? 'bg-purple-600/30 text-purple-200'
                  : 'text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-medium truncate">{file.name.replace(/\.md$/, '')}</span>
                {file.folder && (
                  <span className="text-xs text-zinc-500 truncate">{file.folder}</span>
                )}
              </div>

              {idx === selectedIndex && (
                <CornerDownLeft className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              )}
            </div>
          ))}

          {/* Option to create note if doesn't exist */}
          {!exactMatchExists && query.trim() && (
            <div
              onClick={() => {
                onCreateFile(query.trim());
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedIndex === matchedFiles.length
                  ? 'bg-purple-600/30 text-purple-200'
                  : 'text-emerald-400 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Create note: <strong>"{query.trim()}"</strong></span>
              </div>
              <CornerDownLeft className="w-3.5 h-3.5 text-purple-400" />
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> to navigate</span>
            <span><strong>↵</strong> to open</span>
            <span><strong>esc</strong> to close</span>
          </div>
          <span>Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
