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
    <footer className="glass-statusbar h-[26px] text-[11px] text-[#585860] font-sans flex items-center justify-between px-3.5 select-none z-30 shrink-0 border-t border-black/[0.07] bg-white">
      {/* Left side: Vault and Sync Status */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenVaultSwitcher}
          className="px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[#111113] hover:bg-[#ebebef] bg-[#f4f4f6] border border-black/[0.06] transition-all cursor-pointer shadow-none"
          title="Click to Switch Vault"
        >
          <HardDrive className="w-3 h-3 text-[#384cff]" />
          <span className="font-medium truncate max-w-[140px]">{vaultName}</span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/[0.04] text-[#111113] text-[10px] border border-black/[0.04]">
          <CheckCircle2 className="w-3 h-3 text-[#384cff]" />
          <span>Synced to disk</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[#8e8e93] text-[10px] pl-2 border-l border-black/[0.08]">
          <span>{totalNotesCount} notes</span>
          <span>•</span>
          <span>{totalCanvasesCount} canvases</span>
        </div>

        {onToggleAIChat && (
          <button
            onClick={onToggleAIChat}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f4f4f6] hover:bg-[#ebebef] text-[#111113] border border-black/[0.06] transition-all cursor-pointer text-[10px]"
            title="Open AI Vault Assistant (RAG Memory)"
          >
            <Sparkles className="w-3 h-3 text-[#18181b]" />
            <span>Vault Copilot</span>
          </button>
        )}
      </div>

      {/* Right side: Active File or View Metrics */}
      <div className="flex items-center gap-3">
        {isGraphActive ? (
          <div className="flex items-center gap-1.5 text-[#111113] text-[10px] bg-[#f4f4f6] px-2 py-0.5 rounded-full border border-black/[0.06]">
            <Share2 className="w-3 h-3 text-[#18181b]" />
            <span>
              {graphStats ? `${graphStats.nodesCount} nodes • ${graphStats.edgesCount} links` : 'Interactive Graph'}
            </span>
          </div>
        ) : activeFile?.extension === 'canvas' ? (
          <div className="flex items-center gap-1.5 text-[#111113] text-[10px] bg-[#f4f4f6] px-2 py-0.5 rounded-full border border-black/[0.06]">
            <LayoutDashboard className="w-3 h-3 text-[#18181b]" />
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
                className="flex items-center gap-1 text-[#585860] hover:text-[#111113] transition-colors cursor-pointer text-[10px]"
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
              className="px-2 py-0.5 rounded-md bg-[#384cff] hover:bg-[#2e41ea] text-[10px] font-medium text-white transition-all cursor-pointer capitalize shadow-xs"
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
