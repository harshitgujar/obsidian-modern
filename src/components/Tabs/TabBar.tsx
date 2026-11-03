import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabItem, VaultFile, EditorViewMode } from '../../types';
import { 
  X, 
  Plus, 
  LayoutPanelLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  files: VaultFile[];
  isPrimary?: boolean;
  isSidebarOpen?: boolean;
  isInspectorOpen?: boolean;
  isZenMode?: boolean;
  isDualMode?: boolean;
  onToggleDualMode?: () => void;
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
  onOpenExternalAIConnect?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  files,
  isPrimary = false,
  isSidebarOpen = true,
  isInspectorOpen = true,
  isDualMode = false,
  onToggleDualMode,
  activeViewMode = 'live',
  onSelectTab,
  onCloseTab,
  onNewTab,
  onSplitRight,
  onClosePane,
  onToggleViewMode,
  onToggleSidebar,
  onToggleInspector
}) => {
  const getFile = (filePath: string) => files.find(f => f.path === filePath);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, tabs]);

  // Scroll active tab into view when active tab changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector(`[data-active-tab="true"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
    setTimeout(checkScroll, 100);
  }, [activeTabId, checkScroll]);

  // Handle horizontal mouse wheel scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleScrollStep = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  };

  const handleDualModeClick = () => {
    if (onToggleDualMode) {
      onToggleDualMode();
    } else if (isDualMode && onClosePane) {
      onClosePane();
    } else if (onSplitRight) {
      onSplitRight();
    }
  };

  return (
    <div className="flex items-center justify-between px-2.5 h-10 border-b border-black/[0.06] dark:border-white/[0.04] bg-[#FFFFFF] dark:bg-[#272727] select-none shrink-0 gap-2 transition-colors">
      {/* Left Icon: Circular Layout / Sidebar toggle button matching media_1793557373862_0b4bb5cc.png */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse Left Sidebar (Cmd+B)" : "Expand Left Sidebar (Cmd+B)"}
          className="w-6.5 h-6.5 rounded-full bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#18181B] dark:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
        >
          {/* LayoutPanelLeft Icon matching Figma left prefix */}
          <LayoutPanelLeft className="w-3.5 h-3.5 text-[#18181B]/80 dark:text-white/90" />
        </button>
      </div>

      {/* Center Tabs with Smooth Left/Right Scrollers */}
      <div className="flex items-center gap-1 flex-1 min-w-0 py-0.5 relative">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => handleScrollStep('left')}
            title="Scroll tabs left"
            className="w-5 h-5 rounded-full bg-[#F0F0F4]/90 hover:bg-[#E8E8EE] dark:bg-[#3B3B3B]/90 dark:hover:bg-[#484848] text-[#18181B] dark:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs z-10"
          >
            <ChevronLeft className="w-3 h-3 stroke-[2.5]" />
          </button>
        )}

        <div
          ref={tabsContainerRef}
          onWheel={handleWheel}
          className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar min-w-0 py-0.5 scroll-smooth"
        >
          {tabs.map(tab => {
            const file = getFile(tab.filePath);
            const isActive = tab.id === activeTabId;
            const isGraph = tab.filePath === 'graph://main' || tab.filePath === 'Interactive Graph' || tab.filePath === '__graph__';
            const title = isGraph 
              ? 'Graph' 
              : file 
              ? file.name.replace(/\.md$/, '') 
              : tab.filePath || 'Untitled';

            return (
              <div
                key={tab.id}
                data-active-tab={isActive ? "true" : "false"}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center justify-between gap-2 px-3 py-1 rounded-full text-xs cursor-pointer transition-all shrink-0 min-w-[90px] max-w-[160px] h-[26px] ${
                  isActive
                    ? 'bg-[#EAEAEE] dark:bg-[#1f1f1f] text-[#18181B] dark:text-white font-medium shadow-xs border border-black/[0.06] dark:border-white/10'
                    : 'bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#71717A] hover:text-[#18181B] dark:text-white/75 dark:hover:text-white'
                }`}
              >
                <span className="truncate text-xs text-[#18181B] dark:text-white">{title}</span>

                {/* Close Tab Icon matching Figma 'X' */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.15] transition-all cursor-pointer shrink-0 ${
                    isActive 
                      ? 'text-[#71717A] hover:text-[#18181B] dark:text-white/70 dark:hover:text-white' 
                      : 'text-[#71717A]/60 dark:text-white/40 group-hover:text-[#18181B] dark:group-hover:text-white/80 opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close tab"
                >
                  <X className="w-3 h-3 stroke-[2]" />
                </button>
              </div>
            );
          })}

          {/* Plus Button to add new note / tab */}
          <button
            onClick={onNewTab}
            title="New Tab (Ctrl+T)"
            className="w-6.5 h-6.5 rounded-full bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#71717A] hover:text-[#18181B] dark:text-white/70 dark:hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Right Scroll Arrow */}
        {canScrollRight && (
          <button
            onClick={() => handleScrollStep('right')}
            title="Scroll tabs right"
            className="w-5 h-5 rounded-full bg-[#F0F0F4]/90 hover:bg-[#E8E8EE] dark:bg-[#3B3B3B]/90 dark:hover:bg-[#484848] text-[#18181B] dark:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs z-10"
          >
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Right Controls: BookOpen for Dual Tab Mode, LayoutPanelLeft to Toggle Right Sidebar */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 1. Dual Tab Mode (Duo Screen / Split View) Toggle Button [📖 BookOpen] */}
        <button
          onClick={handleDualModeClick}
          title={isDualMode ? "Exit Dual Tab Mode (Close Split)" : "Dual Tab Mode (Split Screen - Ctrl+\\)"}
          className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isDualMode
              ? 'bg-[#384CFF] text-white shadow-md shadow-blue-600/30'
              : 'bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#71717A] hover:text-[#18181B] dark:text-white/80 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 stroke-[1.8]" />
        </button>

        {/* 2. Open / Close Right Sidebar (Inspector Panel) Toggle Button [LayoutPanelLeft] */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            title={isInspectorOpen ? "Close Right Sidebar (Inspector)" : "Open Right Sidebar (Inspector)"}
            className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              isInspectorOpen
                ? 'bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#18181B] dark:text-white'
                : 'bg-[#F0F0F4]/60 dark:bg-[#3B3B3B]/60 text-[#71717A]/50 dark:text-white/50 hover:text-[#18181B] dark:hover:text-white hover:bg-[#E8E8EE] dark:hover:bg-[#484848]'
            }`}
          >
            <LayoutPanelLeft className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        )}
      </div>
    </div>
  );
};