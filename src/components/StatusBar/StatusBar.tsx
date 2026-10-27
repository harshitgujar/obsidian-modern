import React from 'react';
import { VaultFile, EditorViewMode } from '../../types';
import { HardDrive, CheckCircle2, FileText, LayoutDashboard, Share2, Sparkles } from 'lucide-react';

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
  onToggleAIChat?: () => void;
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
  onToggleAIChat,
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
    <footer className="glass-statusbar h-[26px] text-[11px] text-zinc-400 font-sans flex items-center justify-between px-3.5 select-none z-30 shrink-0">
      {/* Left side: Vault and Sync Status */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenVaultSwitcher}
          className="px-2 py-0.5 rounded-md flex items-center gap-1.5 text-zinc-300 hover:text-white bg-[#202028] hover:bg-[#282834] transition-all cursor-pointer border-none shadow-sm"
          title="Click to Switch Vault"
        >
          <HardDrive className="w-3 h-3 text-[#705dcf]" />
          <span className="font-medium truncate max-w-[140px]">{vaultName}</span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] border-none">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Synced to disk</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-zinc-400/80 text-[10px] pl-2 border-l border-white/[0.08]">
          <span>{totalNotesCount} notes</span>
          <span>•</span>
          <span>{totalCanvasesCount} canvases</span>
        </div>

        {onToggleAIChat && (
          <button
            onClick={onToggleAIChat}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#202028] hover:bg-[#282834] text-zinc-300 hover:text-white transition-all cursor-pointer text-[10px] border-none"
            title="Open AI Vault Assistant (RAG Memory)"
          >
            <Sparkles className="w-3 h-3 text-purple-300" />
            <span>Vault Copilot</span>
          </button>
        )}
      </div>

      {/* Right side: Active File or View Metrics */}
      <div className="flex items-center gap-3">
        {isGraphActive ? (
          <div className="flex items-center gap-1.5 text-purple-200 text-[10px] bg-[#202028] px-2 py-0.5 rounded-md border-none">
            <Share2 className="w-3 h-3 text-[#705dcf]" />
            <span>
              {graphStats ? `${graphStats.nodesCount} nodes • ${graphStats.edgesCount} links` : 'Interactive Graph'}
            </span>
          </div>
        ) : activeFile?.extension === 'canvas' ? (
          <div className="flex items-center gap-1.5 text-orange-300 text-[10px] bg-[#202028] px-2 py-0.5 rounded-md border-none">
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
              className="px-2 py-0.5 rounded-md bg-[#202028] hover:bg-[#282834] text-[10px] font-medium text-zinc-200 hover:text-white transition-all cursor-pointer capitalize border-none shadow-sm"
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
