import React, { useState, useEffect } from 'react';
import { TabItem, VaultFile, EditorViewMode } from '../../types';
import { 
  FileText, 
  X, 
  Plus, 
  Pin, 
  Share2, 
  LayoutGrid, 
  Columns,
  MoreHorizontal,
  Printer,
  Search,
  Eye,
  Code,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Presentation,
  FileCode,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark
} from 'lucide-react';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  files: VaultFile[];
  isPrimary?: boolean;
  isSidebarOpen?: boolean;
  isInspectorOpen?: boolean;
  isZenMode?: boolean;
  activeViewMode?: EditorViewMode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isBookmarked?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleBookmark?: () => void;
  onSave?: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onTogglePin?: (tabId: string) => void;
  onSplitRight?: () => void;
  onClosePane?: () => void;
  canClosePane?: boolean;
  onExportPdf?: () => void;
  onFindReplace?: () => void;
  onToggleViewMode?: (mode?: EditorViewMode) => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
  onToggleZenMode?: () => void;
  onOpenQuickSwitcher?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenTemplates?: () => void;
  onOpenSettings?: () => void;
  onOpenSlides?: () => void;
  onToggleGraph?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  files,
  isPrimary = false,
  isSidebarOpen = true,
  isInspectorOpen = true,
  isZenMode = false,
  activeViewMode = 'live',
  canGoBack = false,
  canGoForward = false,
  isBookmarked = false,
  isSaving = false,
  hasUnsavedChanges = false,
  onGoBack,
  onGoForward,
  onToggleBookmark,
  onSave,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onTogglePin,
  onSplitRight,
  onClosePane,
  canClosePane = false,
  onExportPdf,
  onFindReplace,
  onToggleViewMode,
  onToggleSidebar,
  onToggleInspector,
  onToggleZenMode,
  onOpenQuickSwitcher,
  onOpenCommandPalette,
  onOpenTemplates,
  onOpenSettings,
  onOpenSlides,
  onToggleGraph
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const handleWindowClick = () => setShowMoreMenu(false);
    if (showMoreMenu) {
      window.addEventListener('click', handleWindowClick);
      return () => window.removeEventListener('click', handleWindowClick);
    }
  }, [showMoreMenu]);

  const getFile = (filePath: string) => files.find(f => f.path === filePath);

  return (
    <div className="flex items-center justify-between glass-header px-3 select-none shrink-0 h-11 gap-2.5">
      {/* Left controls: Navigation arrows + Sidebar toggle (only for primary header) */}
      <div className="flex items-center gap-2 shrink-0">
        {isPrimary && (
          <>
            {/* When sidebar is closed on Mac, add graceful spacer for native traffic lights */}
            {!isSidebarOpen && (
              <div className="w-16 shrink-0" />
            )}

            {/* Navigation History Arrows (< and >) */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onGoBack}
                disabled={!canGoBack}
                title="Navigate Back (Alt+← / ⌘[)"
                className="p-1.5 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onGoForward}
                disabled={!canGoForward}
                title="Navigate Forward (Alt+→ / ⌘])"
                className="p-1.5 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarOpen ? 'Collapse Left Sidebar (Cmd+B)' : 'Expand Left Sidebar (Cmd+B)'}
                className="p-1.5 text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] rounded-lg transition-all"
              >
                {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar min-w-0">
        {tabs.map(tab => {
          const file = getFile(tab.filePath);
          const isActive = tab.id === activeTabId;
          const isCanvas = file?.extension === 'canvas';
          const isGraph = tab.filePath === 'graph://main' || tab.filePath === 'Interactive Graph' || tab.filePath === '__graph__';

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all max-w-[200px] shrink-0 border ${
                isActive
                  ? 'bg-white text-[#111113] dark:bg-[#18181b] dark:text-[#f4f4f6] font-medium shadow-xs border border-black/[0.08] dark:border-white/[0.08]'
                  : 'border-transparent text-[#585860] hover:text-[#111113] hover:bg-[#e4e4e9] dark:text-[#a1a1aa] dark:hover:text-[#f4f4f6] dark:hover:bg-white/[0.05]'
              }`}
            >
              {isGraph ? (
                <Share2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#384cff] dark:text-[#6372ff]' : 'text-[#585860] dark:text-[#a1a1aa]'}`} />
              ) : isCanvas ? (
                <LayoutGrid className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#384cff] dark:text-[#6372ff]' : 'text-[#585860] dark:text-[#a1a1aa]'}`} />
              ) : (
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#384cff] dark:text-[#6372ff]' : 'opacity-60'}`} />
              )}

              <span className="truncate">
                {isGraph ? 'Interactive Graph' : file ? file.name.replace(/\.md$/, '') : tab.filePath || 'New Tab'}
              </span>

              {tab.isPinned && (
                <Pin className="w-2.5 h-2.5 text-[#384cff] dark:text-[#6372ff] fill-[#384cff]/30 shrink-0" />
              )}

              {tabs.length > 1 && !tab.isPinned && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#8e8e93] hover:text-[#111113] dark:hover:text-[#f4f4f6] transition-opacity ml-1 cursor-pointer"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          title="New Tab (Ctrl+T)"
          className="p-1.5 text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] rounded-xl transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right controls: Quick Switcher + Save + Bookmark + View Mode + Split + Zen + Inspector + More */}
      <div className="flex items-center gap-2 text-[#585860] shrink-0">
        {/* Quick Switcher Search Pill (on primary) */}
        {isPrimary && onOpenQuickSwitcher && (
          <button
            onClick={onOpenQuickSwitcher}
            title="Quick Switcher (Ctrl+O / Cmd+O)"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-[#fafafc] text-[#111113] border border-black/[0.08] shadow-xs transition-all text-[11px]"
          >
            <Search className="w-3 h-3 text-[#585860]" />
            <span className="text-[11px] font-medium">Jump to...</span>
            <kbd className="text-[9px] bg-[#ececf0] px-1.5 py-0.5 rounded text-[#585860] font-mono border border-black/[0.05]">⌘O</kbd>
          </button>
        )}

        {/* Bookmark Button */}
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark from note (⌘D)' : 'Bookmark note (⌘D)'}
            className={`p-1.5 rounded-xl transition-all skeuo-btn ${
              isBookmarked
                ? 'text-[#18181b] bg-[#ececf0]'
                : 'text-[#585860] hover:text-[#111113]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#18181b] text-[#18181b]' : ''}`} />
          </button>
        )}

        {/* Split Pane Control */}
        {onSplitRight && (
          <button
            onClick={() => onSplitRight()}
            title="Split Right (Ctrl+\)"
            className="p-1.5 text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] rounded-xl transition-all"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        )}

        {canClosePane && onClosePane && (
          <button
            onClick={onClosePane}
            title="Close Split Pane"
            className="p-1.5 text-[#585860] hover:text-rose-600 hover:bg-black/[0.05] rounded-xl transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Right Inspector Toggle */}
        {isPrimary && onToggleInspector && (
          <button
            onClick={onToggleInspector}
            title={isInspectorOpen ? 'Collapse Inspector (Cmd+I)' : 'Expand Inspector (Cmd+I)'}
            className="p-1.5 text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] rounded-xl transition-all"
          >
            {isInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Three-Dot Menu (...) for secondary actions */}
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMoreMenu(prev => !prev);
            }}
            title="More actions"
            className={`p-1.5 rounded-lg transition-colors text-[#585860] hover:text-[#111113] hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 ${
              showMoreMenu ? 'bg-black/[0.08] dark:bg-zinc-800 text-[#111113] dark:text-zinc-100' : ''
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMoreMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 bg-white/95 dark:bg-[#18181e]/95 backdrop-blur-xl border border-black/[0.08] dark:border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 text-xs text-[#585860] dark:text-zinc-300 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
              onClick={e => e.stopPropagation()}
            >
              {onOpenCommandPalette && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenCommandPalette();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#384cff] dark:text-purple-400" />
                    <span>Command Palette</span>
                  </span>
                  <span className="text-[10px] text-[#8e8e93] dark:text-zinc-500 font-mono">⌘P</span>
                </button>
              )}

              {onOpenTemplates && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenTemplates();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-[#384cff] dark:text-purple-400" />
                    <span>Insert Template...</span>
                  </span>
                  <span className="text-[10px] text-[#8e8e93] dark:text-zinc-500 font-mono">⌘T</span>
                </button>
              )}

              {onToggleGraph && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleGraph();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-[#384cff] dark:text-purple-400" />
                    <span>Interactive Graph View</span>
                  </span>
                  <span className="text-[10px] text-[#8e8e93] dark:text-zinc-500 font-mono">⌘G</span>
                </button>
              )}

              {onOpenSlides && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenSlides();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Presentation className="w-3.5 h-3.5 text-[#384cff] dark:text-purple-400" />
                    <span>Start Slide Deck</span>
                  </span>
                  <span className="text-[10px] text-[#8e8e93] dark:text-zinc-500 font-mono">⌥P</span>
                </button>
              )}

              <div className="w-full h-[1px] bg-black/[0.06] dark:bg-zinc-800 my-1" />

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onFindReplace) onFindReplace();
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#8e8e93] dark:text-zinc-400" />
                  <span>Find & Replace in Note</span>
                </span>
                <span className="text-[10px] text-[#8e8e93] dark:text-zinc-500 font-mono">⌘F</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onExportPdf) onExportPdf();
                  else window.print();
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#8e8e93] dark:text-zinc-400" />
                <span className="flex-1">Export to PDF...</span>
              </button>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenSettings();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/[0.05] hover:text-[#111113] dark:hover:bg-zinc-800 dark:hover:text-white text-left transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#8e8e93] dark:text-zinc-400" />
                  <span className="flex-1">Vault Settings...</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
