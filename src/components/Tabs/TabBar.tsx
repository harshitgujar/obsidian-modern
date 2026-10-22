import React, { useState, useEffect } from 'react';
import { TabItem, VaultFile } from '../../types';
import { 
  FileText, 
  X, 
  Plus, 
  Pin, 
  Share2, 
  LayoutGrid, 
  Split, 
  Columns,
  MoreHorizontal,
  Printer,
  Search,
  Eye
} from 'lucide-react';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  files: VaultFile[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onTogglePin?: (tabId: string) => void;
  onSplitRight?: () => void;
  onClosePane?: () => void;
  canClosePane?: boolean;
  onExportPdf?: () => void;
  onFindReplace?: () => void;
  onToggleViewMode?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  files,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onTogglePin,
  onSplitRight,
  onClosePane,
  canClosePane = false,
  onExportPdf,
  onFindReplace,
  onToggleViewMode
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
    <div className="flex items-center justify-between bg-[#101012] border-b border-zinc-800/80 px-2 select-none shrink-0 h-9">
      {/* Tabs list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map(tab => {
          const file = getFile(tab.filePath);
          const isActive = tab.id === activeTabId;
          const isCanvas = file?.extension === 'canvas';

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all max-w-[200px] shrink-0 ${
                isActive
                  ? 'bg-[#18181b] text-zinc-100 border-purple-500 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent'
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
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-opacity ml-1"
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
          title="New Tab"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pane Split Controls */}
      <div className="flex items-center gap-1 pl-2 border-l border-zinc-800/60 text-zinc-400">
        {onSplitRight && (
          <button
            onClick={onSplitRight}
            title="Split Right (Ctrl+\)"
            className="p-1.5 hover:text-zinc-100 hover:bg-zinc-800/60 rounded transition-colors"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        )}

        {canClosePane && onClosePane && (
          <button
            onClick={onClosePane}
            title="Close Split Pane"
            className="p-1.5 hover:text-rose-300 hover:bg-zinc-800/60 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Three-Dot Menu (...) */}
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMoreMenu(prev => !prev);
            }}
            title="More options..."
            className={`p-1.5 rounded transition-colors ${
              showMoreMenu ? 'text-zinc-100 bg-zinc-800' : 'hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMoreMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 bg-[#1c1c20]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 text-xs text-zinc-300 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
              onClick={e => e.stopPropagation()}
            >
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

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onFindReplace) onFindReplace();
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span className="flex-1">Find & Replace</span>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+H</span>
              </button>

              {onSplitRight && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onSplitRight();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <Columns className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="flex-1">Split right</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ctrl+\</span>
                </button>
              )}

              {onToggleViewMode && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleViewMode();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="flex-1">Toggle view mode</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ctrl+E</span>
                </button>
              )}

              {onTogglePin && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onTogglePin(activeTabId);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-left transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="flex-1">Pin / unpin tab</span>
                </button>
              )}

              <div className="w-full h-[1px] bg-zinc-800/80 my-0.5" />

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onCloseTab(activeTabId);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 text-left transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span className="flex-1">Close tab</span>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+W</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
