import React from 'react';
import { TabItem, VaultFile } from '../../types';
import { FileText, X, Plus, Pin, Share2 } from 'lucide-react';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  files: VaultFile[];
  isGraphViewActive: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onToggleGraphView: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  files,
  isGraphViewActive,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleGraphView
}) => {
  const getFile = (fileId: string) => files.find(f => f.id === fileId);

  return (
    <div className="flex items-center bg-[#101012] border-b border-zinc-800/80 px-2 overflow-x-auto select-none shrink-0 h-9">
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map(tab => {
          const file = getFile(tab.fileId);
          const isActive = tab.id === activeTabId && !isGraphViewActive;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all max-w-[180px] shrink-0 ${
                isActive
                  ? 'bg-[#18181b] text-zinc-100 border-purple-500 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'opacity-60'}`} />
              <span className="truncate">
                {file ? file.name.replace(/\.md$/, '') : 'Untitled'}
              </span>

              {tabs.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-opacity"
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

      {/* Global Graph View Toggle button in Tab bar */}
      <div className="flex items-center gap-1 pl-2 border-l border-zinc-800/60">
        <button
          onClick={onToggleGraphView}
          title="Global Graph View"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
            isGraphViewActive
              ? 'bg-purple-600/30 text-purple-300 font-medium border border-purple-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Graph</span>
        </button>
      </div>
    </div>
  );
};
