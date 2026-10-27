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
  Maximize2,
  Minimize2,
  Presentation,
  FileCode,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Save,
  CheckCircle2,
  Loader2
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
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onGoForward}
                disabled={!canGoForward}
                title="Navigate Forward (Alt+→ / ⌘])"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarOpen ? 'Collapse Left Sidebar (Cmd+B)' : 'Expand Left Sidebar (Cmd+B)'}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
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

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all max-w-[200px] shrink-0 border-none ${
                isActive
                  ? 'bg-[#2a2b36] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              {isCanvas ? (
                <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-orange-400" />
              ) : (
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'opacity-60'}`} />
              )}

              <span className="truncate">
                {file ? file.name.replace(/\.md$/, '') : tab.filePath || 'New Tab'}
              </span>

              {tab.isPinned && (
                <Pin className="w-2.5 h-2.5 text-purple-400 fill-purple-400/30 shrink-0" />
              )}

              {tabs.length > 1 && !tab.isPinned && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-opacity ml-1"
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
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right controls: Quick Switcher + Save + Bookmark + View Mode + Split + Zen + Inspector + More */}
      <div className="flex items-center gap-2 text-zinc-400 shrink-0">
        {/* Quick Switcher Search Pill (on primary) */}
        {isPrimary && onOpenQuickSwitcher && (
          <button
            onClick={onOpenQuickSwitcher}
            title="Quick Switcher (Ctrl+O / Cmd+O)"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#202028] hover:bg-[#282834] text-zinc-300 hover:text-white transition-all text-[11px] border-none shadow-sm"
          >
            <Search className="w-3 h-3 text-purple-400" />
            <span className="text-[11px]">Jump to...</span>
            <kbd className="text-[9px] bg-white/[0.08] px-1.5 py-0.5 rounded text-zinc-300 font-mono">⌘O</kbd>
          </button>
        )}

        {/* Save Button / Live Disk Status */}
        {onSave && (
          <button
            onClick={onSave}
            title={
              isSaving
                ? 'Writing to disk...'
                : hasUnsavedChanges
                ? 'Save note to disk (⌘S)'
                : 'All changes saved to disk (⌘S)'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border-none ${
              isSaving
                ? 'bg-[#705dcf]/30 text-purple-200 animate-pulse'
                : hasUnsavedChanges
                ? 'bg-[#e5a00d]/20 text-amber-300'
                : 'bg-[#202028] text-zinc-300 hover:text-white hover:bg-[#282834]'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[11px]">
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
            </span>
            {hasUnsavedChanges && (
              <kbd className="hidden lg:inline text-[9px] bg-white/[0.08] px-1 py-0.2 rounded text-zinc-300 font-mono">
                ⌘S
              </kbd>
            )}
          </button>
        )}

        {/* Bookmark Button */}
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark from note (⌘D)' : 'Bookmark note (⌘D)'}
            className={`p-1.5 rounded-lg transition-all border-none ${
              isBookmarked
                ? 'bg-[#e5a00d]/20 text-amber-300'
                : 'bg-[#202028] text-zinc-400 hover:text-amber-300 hover:bg-[#282834]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}

        {/* View Mode Segmented Switcher (Live / Source / Reading) */}
        {onToggleViewMode && (
          <div className="flex items-center p-0.5 rounded-lg bg-[#181820] border-none">
            <button
              onClick={() => onToggleViewMode('live')}
              title="Live Preview Mode: Interactive editing with live styled formatting"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-[11px] font-medium border-none ${
                activeViewMode === 'live'
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Live</span>
            </button>
            <button
              onClick={() => onToggleViewMode('source')}
              title="Source Mode: Raw Markdown code editor with line numbers"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-[11px] font-medium border-none ${
                activeViewMode === 'source'
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Source</span>
            </button>
            <button
              onClick={() => onToggleViewMode('reading')}
              title="Reading View: Pristine read-only publication reader"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-[11px] font-medium border-none ${
                activeViewMode === 'reading'
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reading</span>
            </button>
          </div>
        )}

        {/* Split Pane Control */}
        {onSplitRight && (
          <button
            onClick={() => onSplitRight()}
            title="Split Right (Ctrl+\)"
            className="p-1.5 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all border-none"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        )}

        {canClosePane && onClosePane && (
          <button
            onClick={onClosePane}
            title="Close Split Pane"
            className="p-1.5 hover:text-rose-300 hover:bg-white/[0.08] rounded-lg transition-all border-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Zen Mode / Focus Mode Toggle */}
        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            title={isZenMode ? 'Exit Focus Mode (Cmd+Shift+F)' : 'Focus Mode (Cmd+Shift+F)'}
            className={`p-1.5 rounded-lg transition-all border-none ${
              isZenMode ? 'text-white bg-[#705dcf] shadow-sm' : 'hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Right Inspector Toggle */}
        {isPrimary && onToggleInspector && (
          <button
            onClick={onToggleInspector}
            title={isInspectorOpen ? 'Collapse Inspector (Cmd+I)' : 'Expand Inspector (Cmd+I)'}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all"
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
            className={`p-1.5 rounded-lg transition-colors ${
              showMoreMenu ? 'text-zinc-100 bg-zinc-800' : 'hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMoreMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 bg-[#18181e]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 text-xs text-zinc-300 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
              onClick={e => e.stopPropagation()}
            >
              {onOpenCommandPalette && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenCommandPalette();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Command Palette</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘P</span>
                </button>
              )}

              {onOpenTemplates && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenTemplates();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-purple-400" />
                    <span>Insert Template...</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘T</span>
                </button>
              )}

              {onToggleGraph && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleGraph();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Interactive Graph View</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘G</span>
                </button>
              )}

              {onOpenSlides && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenSlides();
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Presentation className="w-3.5 h-3.5 text-purple-400" />
                    <span>Start Slide Deck</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌥P</span>
                </button>
              )}

              <div className="w-full h-[1px] bg-zinc-800 my-1" />

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onFindReplace) onFindReplace();
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Find & Replace in Note</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">⌘F</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onExportPdf) onExportPdf();
                  else window.print();
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-400" />
                <span className="flex-1">Export to PDF...</span>
              </button>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenSettings();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
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
