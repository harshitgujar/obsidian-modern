import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VaultFile } from '../../types';
import { Search, FileText, Plus, CornerDownLeft, X, LayoutGrid } from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  files: VaultFile[];
  recentPaths: string[];
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
  onSplitFile?: (filePath: string) => void;
  onCreateFile: (title: string) => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  files,
  recentPaths,
  onClose,
  onSelectFile,
  onSplitFile,
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

  const matchedFiles = useMemo(() => {
    const mdAndCanvas = files.filter(f => !f.isBinary);
    if (!query.trim()) {
      const recentMap = new Map(recentPaths.map((p, idx) => [p, idx]));
      return [...mdAndCanvas].sort((a, b) => {
        const rA = recentMap.has(a.path) ? recentMap.get(a.path)! : 9999;
        const rB = recentMap.has(b.path) ? recentMap.get(b.path)! : 9999;
        return rA - rB;
      }).slice(0, 12);
    }

    const q = query.toLowerCase();
    return mdAndCanvas
      .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 12);
  }, [files, query, recentPaths]);

  const exactMatchExists = useMemo(() => {
    const qClean = query.trim().replace(/\.[^/.]+$/, '').toLowerCase();
    return files.some(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase() === qClean || f.path.toLowerCase() === qClean);
  }, [files, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    const totalCount = matchedFiles.length + (!exactMatchExists && query.trim() ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalCount) % Math.max(1, totalCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const openSplit = e.ctrlKey || e.metaKey || e.shiftKey;
      if (selectedIndex < matchedFiles.length) {
        if (openSplit && onSplitFile) {
          onSplitFile(matchedFiles[selectedIndex].path);
        } else {
          onSelectFile(matchedFiles[selectedIndex].path);
        }
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
            placeholder="Type note or canvas name to open or create..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-base"
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {matchedFiles.map((file, idx) => {
            const isCanvas = file.extension === 'canvas';
            return (
              <div
                key={file.path}
                onClick={() => {
                  onSelectFile(file.path);
                  onClose();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-purple-600/30 text-purple-200'
                    : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {isCanvas ? (
                    <LayoutGrid className="w-4 h-4 text-orange-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <span className="font-medium truncate">{file.name.replace(/\.md$/, '')}</span>
                  {file.folder && (
                    <span className="text-xs text-zinc-500 truncate">{file.folder}</span>
                  )}
                  {isCanvas && (
                    <span className="text-[9px] px-1 rounded bg-orange-950/80 text-orange-300 border border-orange-700/40 font-mono uppercase">
                      canvas
                    </span>
                  )}
                </div>

                {idx === selectedIndex && (
                  <CornerDownLeft className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                )}
              </div>
            );
          })}

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
            <span><strong>↑↓</strong> navigate</span>
            <span><strong>↵</strong> open</span>
            <span><strong>Shift+↵</strong> open to right</span>
            <span><strong>esc</strong> close</span>
          </div>
          <span>Quick Switcher (Ctrl+O)</span>
        </div>
      </div>
    </div>
  );
};
