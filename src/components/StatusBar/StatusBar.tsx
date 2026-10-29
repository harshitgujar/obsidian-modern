import React from 'react';
import { VaultFile } from '../../types';
import { 
  CheckCircle2, 
  FileText, 
  LayoutDashboard, 
  Share2, 
  Loader2, 
  Save, 
  FolderGit2 
} from 'lucide-react';

interface StatusBarProps {
  vaultName: string;
  totalNotesCount: number;
  totalCanvasesCount: number;
  activeFile?: VaultFile;
  backlinksCount?: number;
  isGraphActive?: boolean;
  graphStats?: { nodesCount: number; edgesCount: number };
  canvasStats?: { nodesCount: number; edgesCount: number };
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  onOpenVaultSwitcher?: () => void;
  onOpenBacklinks?: () => void;
  showWordCount?: boolean;
  showBacklinks?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  vaultName,
  totalNotesCount,
  totalCanvasesCount,
  activeFile,
  backlinksCount = 0,
  isGraphActive = false,
  graphStats,
  canvasStats,
  isSaving = false,
  hasUnsavedChanges = false,
  onSave,
  onOpenVaultSwitcher,
  onOpenBacklinks,
  showWordCount = true,
  showBacklinks = true
}) => {
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
    <footer className="glass-statusbar h-[26px] text-[11px] text-[#585860] dark:text-[#a1a1aa] font-sans flex items-center justify-between px-3.5 select-none z-30 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#111113]">
      {/* Left side: Active Vault & Live Disk Syncing Pill & Note Stats */}
      <div className="flex items-center gap-2">
        {/* Active Vault Pill */}
        <div 
          onClick={onOpenVaultSwitcher}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/[0.03] dark:bg-white/[0.04] text-[#111113] dark:text-[#f4f4f6] border border-black/[0.04] dark:border-white/[0.05] ${
            onOpenVaultSwitcher ? 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer transition-colors' : ''
          }`}
          title="Active Vault (click to switch)"
        >
          <FolderGit2 className="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" />
          <span>{vaultName || 'Vault'}</span>
        </div>

        {/* Syncing / Save Disk Status Pill */}
        <button
          onClick={onSave}
          title={
            isSaving
              ? 'Writing changes to disk...'
              : hasUnsavedChanges
              ? 'Save note to disk (⌘S)'
              : 'All changes synced to disk (⌘S)'
          }
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
            isSaving
              ? 'bg-[#ececf0] dark:bg-[#27272a] text-[#111113] dark:text-[#f4f4f6] animate-pulse border border-black/[0.08] dark:border-white/[0.08]'
              : hasUnsavedChanges
              ? 'bg-[#384cff] hover:bg-[#2c3ee0] text-white shadow-xs cursor-pointer'
              : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#585860] dark:text-[#a1a1aa] border border-black/[0.04] dark:border-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#384cff] dark:text-[#6372ff]" />
          ) : hasUnsavedChanges ? (
            <Save className="w-3 h-3 text-white" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" />
          )}
          <span>{isSaving ? 'Syncing...' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
          {hasUnsavedChanges && (
            <kbd className="hidden lg:inline text-[9px] bg-white/20 px-1 py-0.2 rounded text-white font-mono">
              ⌘S
            </kbd>
          )}
        </button>

        {/* Note & Canvas Counts */}
        <div className="hidden sm:flex items-center gap-1.5 text-[#8e8e93] dark:text-[#71717a] text-[10px] pl-2 border-l border-black/[0.08] dark:border-white/[0.08]">
          <span>{totalNotesCount} notes</span>
          <span>•</span>
          <span>{totalCanvasesCount} canvases</span>
        </div>
      </div>

      {/* Right side: Active File or View Metrics */}
      <div className="flex items-center gap-3">
        {isGraphActive ? (
          <div className="flex items-center gap-1.5 text-[#111113] dark:text-[#f4f4f6] text-[10px] bg-[#f4f4f6] dark:bg-[#1c1c20] px-2 py-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
            <Share2 className="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" />
            <span>
              {graphStats ? `${graphStats.nodesCount} nodes • ${graphStats.edgesCount} links` : 'Interactive Graph'}
            </span>
          </div>
        ) : activeFile?.extension === 'canvas' ? (
          <div className="flex items-center gap-1.5 text-[#111113] dark:text-[#f4f4f6] text-[10px] bg-[#f4f4f6] dark:bg-[#1c1c20] px-2 py-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
            <LayoutDashboard className="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" />
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
                className="flex items-center gap-1 text-[#585860] hover:text-[#111113] dark:text-[#a1a1aa] dark:hover:text-[#f4f4f6] transition-colors cursor-pointer text-[10px]"
                title="View Backlinks in Inspector"
              >
                <span>{backlinksCount} {backlinksCount === 1 ? 'backlink' : 'backlinks'}</span>
              </button>
            )}

            {showBacklinks && showWordCount && <span className="text-[#8e8e93] dark:text-[#71717a]">•</span>}

            {/* Word count and char count */}
            {showWordCount && (
              <div className="flex items-center gap-1.5 text-[#8e8e93] dark:text-[#71717a] text-[10px]">
                <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
                <span>•</span>
                <span>{charCount.toLocaleString()} characters</span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </footer>
  );
};
