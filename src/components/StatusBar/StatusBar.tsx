import React from 'react';
import { VaultFile, EditorViewMode } from '../../types';
import { HardDrive, CheckCircle2, FileText, LayoutDashboard, Share2 } from 'lucide-react';

interface StatusBarProps {
  vaultName: string;
  totalNotesCount: number;
  totalCanvasesCount: number;
  activeFile?: VaultFile;
  activeViewMode?: EditorViewMode;
  backlinksCount?: number;
  isGraphActive?: boolean;
  graphStats?: { nodesCount: number; edgesCount: number };
  canvasStats?: { nodesCount: number; edgesCount: number };
  isZenMode?: boolean;
  onOpenVaultSwitcher?: () => void;
  onCycleViewMode?: () => void;
  onOpenBacklinks?: () => void;
  showWordCount?: boolean;
  showBacklinks?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  vaultName,
  totalNotesCount,
  totalCanvasesCount,
  activeFile,
  activeViewMode = 'live',
  backlinksCount = 0,
  isGraphActive = false,
  graphStats,
  canvasStats,
  isZenMode = false,
  onOpenVaultSwitcher,
  onCycleViewMode,
  onOpenBacklinks,
  showWordCount = true,
  showBacklinks = true
}) => {
  if (isZenMode) return null;
  // Compute word and character counts for active markdown note
  const wordCount = React.useMemo(() => {
    if (!activeFile || activeFile.extension !== 'md') return 0;
    const clean = activeFile.content.replace(/^---[\s\S]*?---/, '').trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  }, [activeFile]);

  const charCount = React.useMemo(() => {
    if (!activeFile || activeFile.extension !== 'md') return 0;
    const clean = activeFile.content.replace(/^---[\s\S]*?---/, '').trim();
    return clean.length;
  }, [activeFile]);

  return (
    <footer className="status-bar h-[22px] bg-[#161619] border-t border-zinc-800/90 text-[11px] text-zinc-400 font-sans flex items-center justify-between px-3 select-none z-30 shrink-0">
      {/* Left side: Vault and Sync Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenVaultSwitcher}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-purple-300 transition-colors cursor-pointer"
          title="Click to Switch Vault"
        >
          <HardDrive className="w-3 h-3 text-purple-400" />
          <span className="font-medium truncate max-w-[140px]">{vaultName}</span>
        </button>

        <div className="flex items-center gap-1.5 text-zinc-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-zinc-300">Synced to disk</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-zinc-500 text-[10px] pl-2 border-l border-zinc-800">
          <span>{totalNotesCount} notes</span>
          <span>•</span>
          <span>{totalCanvasesCount} canvases</span>
        </div>
      </div>

      {/* Right side: Active File or View Metrics */}
      <div className="flex items-center gap-3">
        {isGraphActive ? (
          <div className="flex items-center gap-1.5 text-purple-300 text-[10px]">
            <Share2 className="w-3 h-3 text-purple-400" />
            <span>
              {graphStats ? `${graphStats.nodesCount} nodes • ${graphStats.edgesCount} links` : 'Interactive Graph'}
            </span>
          </div>
        ) : activeFile?.extension === 'canvas' ? (
          <div className="flex items-center gap-1.5 text-orange-300 text-[10px]">
            <LayoutDashboard className="w-3 h-3 text-orange-400" />
            <span>
              {canvasStats ? `${canvasStats.nodesCount} cards • ${canvasStats.edgesCount} edges` : 'Canvas'}
            </span>
          </div>
        ) : activeFile?.extension === 'md' ? (
          <>
            {/* Backlinks */}
            {showBacklinks && (
              <button
                onClick={onOpenBacklinks}
                className="flex items-center gap-1 text-zinc-400 hover:text-purple-300 transition-colors cursor-pointer text-[10px]"
                title="View Backlinks in Inspector"
              >
                <span>{backlinksCount} {backlinksCount === 1 ? 'backlink' : 'backlinks'}</span>
              </button>
            )}

            {showBacklinks && showWordCount && <span className="text-zinc-600">•</span>}

            {/* Word count and char count */}
            {showWordCount && (
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
                <span className="text-zinc-600">•</span>
                <span>{charCount.toLocaleString()} characters</span>
              </div>
            )}

            {/* View mode toggle */}
            <button
              onClick={onCycleViewMode}
              className="px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-purple-600/20 hover:text-purple-300 border border-zinc-700/60 text-[10px] font-medium text-zinc-300 transition-colors cursor-pointer capitalize"
              title="Click to Switch View Mode (Live Preview / Source / Reading)"
            >
              {activeViewMode === 'live' ? 'Live Preview' : activeViewMode === 'source' ? 'Source Mode' : 'Reading View'}
            </button>
          </>
        ) : null}
      </div>
    </footer>
  );
};
