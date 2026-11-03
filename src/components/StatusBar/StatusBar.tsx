import React from 'react';
import { VaultFile } from '../../types';
import { Check } from 'lucide-react';

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
  totalNotesCount,
  totalCanvasesCount,
  activeFile,
  backlinksCount = 0,
  isGraphActive = false,
  graphStats,
  canvasStats,
  isSaving = false,
  hasUnsavedChanges = false,
  onSave
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

  const isCanvasActive = activeFile?.extension === 'canvas';

  return (
    <footer className="h-6 text-[11px] text-[#71717A] dark:text-[#8E8E93] font-sans flex items-center justify-between px-3 select-none shrink-0 bg-transparent border-t-0 transition-colors">
      {/* Left: Saved indicator + Total counts matching Figma img5 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          title={isSaving ? "Saving changes to disk..." : hasUnsavedChanges ? "Unsaved changes (Cmd+S)" : "All changes saved to disk"}
          className="flex items-center gap-1 text-[#18181B] dark:text-white/85 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
        >
          <span>Saved</span>
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <span className="text-[#71717A] dark:text-[#8E8E93]">
          {totalNotesCount} notes , {totalCanvasesCount} canvas
        </span>
      </div>

      {/* Right: Context-Aware Dynamic Metrics matching Figma img5 */}
      <div className="flex items-center gap-2 text-[#71717A] dark:text-[#8E8E93]">
        {isGraphActive ? (
          <span>
            {graphStats?.nodesCount || 0} nodes , {graphStats?.edgesCount || 0} links
          </span>
        ) : isCanvasActive ? (
          <span>
            {canvasStats?.nodesCount || 0} cards , {canvasStats?.edgesCount || 0} edges
          </span>
        ) : activeFile ? (
          <span>
            {wordCount} words , {charCount} characters
          </span>
        ) : (
          <span>Ready</span>
        )}
      </div>
    </footer>
  );
};
