import React from 'react';
import { 
  FileText, 
  Bookmark, 
  LayoutGrid, 
  CircleHelp, 
  Settings
} from 'lucide-react';

export type RibbonMode = 'notes' | 'bookmarks' | 'graph' | 'canvas';

interface RibbonProps {
  activeMode: RibbonMode;
  onSelectMode: (mode: RibbonMode) => void;
  onOpenVaultManager: () => void;
  vaultName: string;
  onOpenFileRecovery: () => void;
  onToggleAIChat: () => void;
  onToggleTheme: () => void;
  isDarkTheme?: boolean;
  onOpenExternalAIConnect?: () => void;
  onOpenSettings: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

export const Ribbon: React.FC<RibbonProps> = ({
  activeMode,
  onSelectMode,
  onOpenVaultManager,
  vaultName,
  onOpenFileRecovery,
  onToggleAIChat,
  onToggleTheme,
  isDarkTheme = true,
  onOpenSettings,
  isSaving = false,
  hasUnsavedChanges = false,
  onSave
}) => {
  return (
    <aside 
      aria-label="Navigation Ribbon"
      className="w-10 h-full bg-transparent flex flex-col items-center py-0.5 justify-between shrink-0 select-none z-20"
    >
      {/* Top: Brand Logo Circle & Core Navigation Rail matching media_1793554376982_a52e62fc.png */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Brand Vault Logo Solid Circle matching Figma */}
        <button
          onClick={onOpenVaultManager}
          title={`Active Vault: ${vaultName} (Click to switch)`}
          className="w-8.5 h-8.5 rounded-full bg-[#384CFF] text-white flex items-center justify-center shadow-lg shadow-blue-600/35 active:scale-95 transition-all cursor-pointer group"
        >
          <img 
            src="/logo-symbol-white.png" 
            alt="Runagon Logo" 
            className="w-5 h-5 object-contain" 
          />
        </button>

        {/* Vertical Pill Container matching Figma */}
        <div className="flex flex-col items-center gap-1.5 w-full p-1 rounded-full bg-[#FFFFFF] dark:bg-[#272727] border border-black/[0.08] dark:border-transparent shadow-xs dark:shadow-none transition-colors">
          {/* 1. Notes / File Explorer Mode */}
          <button
            onClick={() => onSelectMode('notes')}
            title="Notes / File Explorer"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeMode === 'notes'
                ? 'bg-[#384CFF] text-white shadow-md'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* 2. Bookmarks Mode */}
          <button
            onClick={() => onSelectMode('bookmarks')}
            title="Bookmarks"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeMode === 'bookmarks'
                ? 'bg-[#384CFF] text-white shadow-md'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* 3. Interactive Graph View Mode (Git branch/network icon matching Image 2) */}
          <button
            onClick={() => onSelectMode('graph')}
            title="Graph View"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeMode === 'graph'
                ? 'bg-[#384CFF] text-white shadow-md'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </button>

          {/* 4. Canvas Board Mode */}
          <button
            onClick={() => onSelectMode('canvas')}
            title="Canvas Board"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeMode === 'canvas'
                ? 'bg-[#384CFF] text-white shadow-md'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </div>

      {/* Bottom: 3 Circular Buttons + Saved checkmark matching media_1793554376982_5b17e643.png */}
      <div className="flex flex-col items-center gap-2">
        {/* Button 1: Help & File Recovery */}
        <button
          onClick={onOpenFileRecovery}
          title="Help & File Recovery"
          className="w-8 h-8 rounded-full bg-[#FFFFFF] dark:bg-[#3B3B3B] text-[#18181B] dark:text-white border border-black/[0.08] dark:border-transparent hover:bg-[#F2F2F6] dark:hover:bg-[#484848] flex items-center justify-center transition-all cursor-pointer shadow-sm"
        >
          <CircleHelp className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Button 2: Dark / Light Mode Toggle matching media_1793562861006_996d0b72.png */}
        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className="w-8 h-8 rounded-full bg-[#FFFFFF] dark:bg-[#3B3B3B] text-[#18181B] dark:text-white border border-black/[0.08] dark:border-transparent hover:bg-[#F2F2F6] dark:hover:bg-[#484848] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <svg className="w-4 h-4 text-[#18181B] dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="3" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="21" />
            <line x1="5.64" y1="5.64" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="18.36" y2="18.36" />
            <line x1="3" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="21" y2="12" />
            <line x1="5.64" y1="18.36" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="18.36" y2="5.64" />
          </svg>
        </button>

        {/* Button 3: Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          className="w-8 h-8 rounded-full bg-[#FFFFFF] dark:bg-[#3B3B3B] text-[#18181B] dark:text-white border border-black/[0.08] dark:border-transparent hover:bg-[#F2F2F6] dark:hover:bg-[#484848] flex items-center justify-center transition-all cursor-pointer shadow-sm mb-1"
        >
          <Settings className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    </aside>
  );
};

