import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VaultFile } from '../../types';
import { vault } from '../../services/vault';
import { 
  Search, 
  FileText, 
  Plus, 
  CornerDownLeft, 
  X, 
  LayoutGrid, 
  AlignLeft,
  ArrowRight
} from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  files: VaultFile[];
  recentPaths: string[];
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
  onSplitFile?: (filePath: string) => void;
  onCreateFile: (title: string) => void;
  onOpenVaultSearch?: (query: string) => void;
}

interface ContentMatch {
  file: VaultFile;
  snippet: string;
  lineNumber: number;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  files,
  recentPaths,
  onClose,
  onSelectFile,
  onSplitFile,
  onCreateFile,
  onOpenVaultSearch
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

  const mdAndCanvas = useMemo(() => files.filter(f => !f.isBinary), [files]);

  // Title / Filename Matches
  const matchedTitles = useMemo(() => {
    if (!query.trim()) {
      const recentMap = new Map(recentPaths.map((p, idx) => [p, idx]));
      return [...mdAndCanvas]
        .sort((a, b) => {
          const rA = recentMap.has(a.path) ? recentMap.get(a.path)! : 9999;
          const rB = recentMap.has(b.path) ? recentMap.get(b.path)! : 9999;
          return rA - rB;
        })
        .slice(0, 10);
    }

    const q = query.toLowerCase();
    return mdAndCanvas
      .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mdAndCanvas, query, recentPaths]);

  // Content Matches (Searching inside note bodies)
  const [backendMatches, setBackendMatches] = useState<ContentMatch[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setBackendMatches([]);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      const res = await vault.searchVault(q);
      if (!isCancelled && res.results) {
        const matches: ContentMatch[] = [];
        const matchedTitlePaths = new Set(matchedTitles.map(f => f.path));
        for (const item of res.results) {
          if (matchedTitlePaths.has(item.path)) continue;
          const fullFile = files.find(f => f.path === item.path);
          if (!fullFile) continue;
          const firstMatch = item.matches && item.matches[0];
          matches.push({
            file: fullFile,
            snippet: firstMatch ? firstMatch.text : item.name,
            lineNumber: firstMatch ? firstMatch.line : 1
          });
          if (matches.length >= 8) break;
        }
        setBackendMatches(matches);
      }
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, files, matchedTitles]);

  const localMatchedContents = useMemo((): ContentMatch[] => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: ContentMatch[] = [];
    const matchedPaths = new Set(matchedTitles.map(f => f.path));

    for (const file of mdAndCanvas) {
      if (file.extension !== 'md' || !file.content) continue;
      const lower = file.content.toLowerCase();
      const matchIdx = lower.indexOf(q);
      if (matchIdx !== -1) {
        // Find line number and snippet
        const before = file.content.slice(0, matchIdx);
        const lineNumber = before.split('\n').length;
        const lineStart = Math.max(0, file.content.lastIndexOf('\n', matchIdx) + 1);
        let lineEnd = file.content.indexOf('\n', matchIdx);
        if (lineEnd === -1) lineEnd = file.content.length;
        const snippet = file.content.slice(lineStart, lineEnd).trim();

        results.push({ file, snippet, lineNumber });
        if (results.length >= 6) break;
      }
    }
    return results;
  }, [mdAndCanvas, query, matchedTitles]);

  const activeContentMatches = useMemo(() => {
    return backendMatches.length > 0 ? backendMatches : localMatchedContents;
  }, [backendMatches, localMatchedContents]);

  const exactMatchExists = useMemo(() => {
    const qClean = query.trim().replace(/\.[^/.]+$/, '').toLowerCase();
    return files.some(
      f =>
        f.name.replace(/\.[^/.]+$/, '').toLowerCase() === qClean ||
        f.path.toLowerCase() === qClean
    );
  }, [files, query]);

  // Combine items for keyboard navigation index
  // 1. matchedTitles
  // 2. activeContentMatches
  // 3. create note (if query & !exactMatchExists)
  // 4. search vault action (if query)
  const hasCreate = !exactMatchExists && query.trim().length > 0;
  const hasVaultSearch = query.trim().length > 0 && Boolean(onOpenVaultSearch);

  const totalItemsCount =
    matchedTitles.length +
    activeContentMatches.length +
    (hasCreate ? 1 : 0) +
    (hasVaultSearch ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItemsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItemsCount) % Math.max(1, totalItemsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const openSplit = e.ctrlKey || e.metaKey || e.shiftKey;

      // Check which section selectedIndex falls into
      if (selectedIndex < matchedTitles.length) {
        const file = matchedTitles[selectedIndex];
        if (openSplit && onSplitFile) onSplitFile(file.path);
        else onSelectFile(file.path);
        onClose();
      } else if (selectedIndex < matchedTitles.length + activeContentMatches.length) {
        const item = activeContentMatches[selectedIndex - matchedTitles.length];
        if (openSplit && onSplitFile) onSplitFile(item.file.path);
        else onSelectFile(item.file.path);
        onClose();
      } else if (hasCreate && selectedIndex === matchedTitles.length + activeContentMatches.length) {
        onCreateFile(query.trim());
        onClose();
      } else if (hasVaultSearch && onOpenVaultSearch) {
        onOpenVaultSearch(query.trim());
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/25 backdrop-blur-md z-50 flex items-start justify-center pt-20 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="skeuo-modal w-full max-w-xl overflow-hidden flex flex-col text-sm text-[#111113] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.05)] border border-black/[0.08]"
      >
        {/* Input Bar with Floating Pill matching Reference */}
        <div className="p-3 pb-2 border-b border-black/[0.06] bg-white">
          <div className="flex items-center px-3.5 py-2 bg-[#f4f4f6] rounded-full border border-black/[0.07] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
            <Search className="w-4 h-4 text-[#18181b] mr-2.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by note title, content, or create new..."
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

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Section 1: Note Titles */}
          {matchedTitles.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-[#8e8e93] tracking-wider">
                Notes & Canvases
              </div>
              {matchedTitles.map(file => {
                const isCanvas = file.extension === 'canvas';
                const idx = currentIndex++;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={file.path}
                    onClick={() => {
                      onSelectFile(file.path);
                      onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#ebebef] text-[#111113] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border-black/[0.05]'
                        : 'border-transparent text-[#585860] hover:bg-[#f4f4f6] hover:text-[#111113]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isCanvas ? (
                        <LayoutGrid className="w-4 h-4 text-[#18181b] shrink-0" />
                      ) : (
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#18181b]' : 'text-[#8e8e93]'}`} />
                      )}
                      <span className="font-medium truncate">
                        {file.name.replace(/\.md$/, '')}
                      </span>
                      {file.folder && (
                        <span className={`text-xs truncate ${isSelected ? 'text-[#585860]' : 'text-[#8e8e93]'}`}>{file.folder}</span>
                      )}
                      {isCanvas && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-[#585860] border border-black/[0.06] font-mono uppercase">
                          canvas
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#18181b] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 2: Content Matches (In-File Search) */}
          {activeContentMatches.length > 0 && (
            <div className="pt-1.5 border-t border-black/[0.06]">
              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-[#8e8e93] tracking-wider flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3 text-[#8e8e93]" />
                <span>Text Matches in Notes</span>
              </div>
              {activeContentMatches.map(match => {
                const idx = currentIndex++;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={`${match.file.path}-${match.lineNumber}`}
                    onClick={() => {
                      onSelectFile(match.file.path);
                      onClose();
                    }}
                    className={`flex flex-col gap-0.5 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#ebebef] text-[#111113] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border-black/[0.05]'
                        : 'border-transparent text-[#585860] hover:bg-[#f4f4f6] hover:text-[#111113]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#111113]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#8e8e93] shrink-0" />
                        <span>{match.file.name.replace(/\.md$/, '')}</span>
                        <span className="text-[10px] text-[#8e8e93] font-mono">
                          line {match.lineNumber}
                        </span>
                      </div>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-[#18181b] shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#585860] truncate font-mono pl-5">
                      {match.snippet}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 3: Option to create note if doesn't exist */}
          {hasCreate && (
            <div className="pt-1.5 border-t border-black/[0.06]">
              {(() => {
                const idx = currentIndex++;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    onClick={() => {
                      onCreateFile(query.trim());
                      onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#ebebef] text-[#111113] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border-black/[0.05]'
                        : 'border-transparent text-[#18181b] hover:bg-[#f4f4f6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className="w-4 h-4 shrink-0 text-[#18181b]" />
                      <span>
                        Create note: <strong>"{query.trim()}"</strong>
                      </span>
                    </div>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#18181b] shrink-0" />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section 4: Full Vault Search Action in Sidebar */}
          {hasVaultSearch && (
            <div className="pt-1.5 border-t border-black/[0.06]">
              {(() => {
                const idx = currentIndex++;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    onClick={() => {
                      if (onOpenVaultSearch) onOpenVaultSearch(query.trim());
                      onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#ebebef] text-[#111113] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border-black/[0.05]'
                        : 'border-transparent text-[#585860] hover:bg-[#f4f4f6] hover:text-[#111113]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-[#8e8e93]" />
                      <span>
                        Search entire vault for <strong>"{query.trim()}"</strong> in sidebar
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8e8e93]" />
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-black/[0.06] bg-[#f8f8fa] text-[11px] text-[#585860] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">⇧↵</kbd> split
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#ebebef] px-1.5 py-0.5 rounded text-[#111113] font-mono border border-black/[0.06]">esc</kbd> close
            </span>
          </div>
          <span className="font-medium text-[#111113]">Universal Switcher</span>
        </div>
      </div>
    </div>
  );
};
