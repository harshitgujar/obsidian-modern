import React, { useState } from 'react';
import { VaultFile, SidebarTab } from '../../types';
import { 
  Files, 
  Search, 
  Share2, 
  Tag as TagIcon, 
  Calendar, 
  FolderPlus, 
  FilePlus, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Download, 
  HardDrive, 
  Sun, 
  Moon,
  X
} from 'lucide-react';

interface SidebarProps {
  files: VaultFile[];
  activeFileId?: string;
  activeSidebarTab: SidebarTab;
  isDarkTheme: boolean;
  onSelectTab: (tab: SidebarTab) => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (folder?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newTitle: string) => void;
  onOpenDailyNote: () => void;
  onOpenLocalFolder: () => void;
  onExportZip: () => void;
  onToggleTheme: () => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  activeSidebarTab,
  isDarkTheme,
  onSelectTab,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onOpenDailyNote,
  onOpenLocalFolder,
  onExportZip,
  onToggleTheme,
  searchFilter,
  onSearchChange
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  // Toggle folder collapse
  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Group files into folder tree
  const folderTree = React.useMemo(() => {
    const folders: Record<string, VaultFile[]> = { '': [] };

    files.forEach(file => {
      const f = file.folder || '';
      if (!folders[f]) folders[f] = [];
      folders[f].push(file);
    });

    return folders;
  }, [files]);

  // Extract all tags across vault with frequencies
  const tagsList = React.useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach(f => {
      const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g;
      let m;
      while ((m = tagRegex.exec(f.content)) !== null) {
        const tag = m[1];
        if (!/^\d+$/.test(tag)) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [files]);

  const handleStartRename = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditTitleValue(file.name.replace(/\.md$/, ''));
  };

  const handleFinishRename = (fileId: string) => {
    if (editTitleValue.trim()) {
      onRenameFile(fileId, editTitleValue.trim());
    }
    setEditingFileId(null);
  };

  return (
    <div className="flex h-full bg-[#121214] border-r border-zinc-800/80 select-none shrink-0">
      {/* 1. Left Vertical Ribbon (Obsidian style) */}
      <div className="w-12 bg-[#0e0e10] border-r border-zinc-800/60 flex flex-col items-center py-3 justify-between shrink-0">
        <div className="flex flex-col items-center gap-2">
          {/* Obsidian Vault Logo */}
          <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs mb-2 border border-purple-500/30">
            <Share2 className="w-4 h-4" />
          </div>

          <button
            onClick={() => onSelectTab('files')}
            title="Files (Ctrl+Shift+E)"
            className={`p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'files'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Files className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectTab('search')}
            title="Search Vault (Ctrl+Shift+F)"
            className={`p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'search'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectTab('graph')}
            title="Graph View (Ctrl+G)"
            className={`p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'graph'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectTab('tags')}
            title="Tags Pane"
            className={`p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'tags'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <TagIcon className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-zinc-800 my-1" />

          {/* Daily Note shortcut */}
          <button
            onClick={onOpenDailyNote}
            title="Open Today's Daily Note"
            className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800/60 transition-colors"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Ribbon utilities */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onOpenLocalFolder}
            title="Open Local Folder on Computer (File System Access API)"
            className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60 transition-colors"
          >
            <HardDrive className="w-4 h-4" />
          </button>

          <button
            onClick={onExportZip}
            title="Export Entire Vault as ZIP"
            className="p-2 rounded-lg text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/60 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleTheme}
            title="Toggle Light / Dark Theme"
            className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 transition-colors"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Sidebar Drawer Content */}
      <div className="w-60 flex flex-col h-full bg-[#141416]">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {activeSidebarTab === 'files' && 'Vault Files'}
            {activeSidebarTab === 'search' && 'Search Vault'}
            {activeSidebarTab === 'graph' && 'Graph Overview'}
            {activeSidebarTab === 'tags' && 'Vault Tags'}
          </span>

          {activeSidebarTab === 'files' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onCreateFile()}
                title="New Note in Root"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: File Tree */}
        {activeSidebarTab === 'files' && (
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs">
            {Object.entries(folderTree).map(([folderName, folderFiles]) => {
              if (folderName === '') {
                // Root files
                return folderFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      file.id === activeFileId
                        ? 'bg-purple-600/20 text-purple-200 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      {editingFileId === file.id ? (
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={e => setEditTitleValue(e.target.value)}
                          onBlur={() => handleFinishRename(file.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleFinishRename(file.id);
                            if (e.key === 'Escape') setEditingFileId(null);
                          }}
                          autoFocus
                          className="bg-zinc-900 text-zinc-100 px-1 py-0.5 rounded border border-purple-500 focus:outline-none w-32"
                        />
                      ) : (
                        <span className="truncate">{file.name.replace(/\.md$/, '')}</span>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => handleStartRename(file, e)}
                        title="Rename"
                        className="p-0.5 text-zinc-500 hover:text-zinc-300"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`Delete "${file.name}"?`)) onDeleteFile(file.id);
                        }}
                        title="Delete"
                        className="p-0.5 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ));
              }

              // Subfolder
              const isCollapsed = collapsedFolders[folderName];

              return (
                <div key={folderName} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folderName)}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 cursor-pointer font-medium"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      {isCollapsed ? (
                        <Folder className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span className="truncate">{folderName}</span>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onCreateFile(folderName);
                      }}
                      title={`New note in ${folderName}`}
                      className="opacity-0 hover:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-200"
                    >
                      <FilePlus className="w-3 h-3" />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-4 space-y-0.5 border-l border-zinc-800/60 ml-2">
                      {folderFiles.map(file => (
                        <div
                          key={file.id}
                          onClick={() => onSelectFile(file.id)}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            file.id === activeFileId
                              ? 'bg-purple-600/20 text-purple-200 font-medium'
                              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            {editingFileId === file.id ? (
                              <input
                                type="text"
                                value={editTitleValue}
                                onChange={e => setEditTitleValue(e.target.value)}
                                onBlur={() => handleFinishRename(file.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleFinishRename(file.id);
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                                autoFocus
                                className="bg-zinc-900 text-zinc-100 px-1 py-0.5 rounded border border-purple-500 focus:outline-none w-28"
                              />
                            ) : (
                              <span className="truncate">{file.name.replace(/\.md$/, '')}</span>
                            )}
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                            <button
                              onClick={e => handleStartRename(file, e)}
                              title="Rename"
                              className="p-0.5 text-zinc-500 hover:text-zinc-300"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm(`Delete "${file.name}"?`)) onDeleteFile(file.id);
                              }}
                              title="Delete"
                              className="p-0.5 text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Global Search */}
        {activeSidebarTab === 'search' && (
          <div className="flex flex-col h-full p-2 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search all notes..."
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
              {searchFilter && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 text-xs">
              {files
                .filter(f => {
                  if (!searchFilter.trim()) return true;
                  const q = searchFilter.toLowerCase();
                  return f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q);
                })
                .map(file => {
                  const matchCount = searchFilter.trim()
                    ? (file.content.toLowerCase().match(new RegExp(searchFilter.toLowerCase(), 'g')) || []).length
                    : 0;

                  return (
                    <div
                      key={file.id}
                      onClick={() => onSelectFile(file.id)}
                      className="p-2 rounded bg-zinc-900/50 hover:bg-zinc-800/80 cursor-pointer border border-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-zinc-200 font-medium">
                        <span className="truncate">{file.name.replace(/\.md$/, '')}</span>
                        {matchCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 text-[10px] border border-purple-800/40">
                            {matchCount}
                          </span>
                        )}
                      </div>
                      {file.folder && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">{file.folder}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: Graph Tab button or Quick instructions */}
        {activeSidebarTab === 'graph' && (
          <div className="p-3 text-xs text-zinc-400 space-y-3">
            <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-300 text-[11px]">
              The interactive Graph View is active in the main workspace!
            </div>
            <p>Every note and link is modeled as a physical particle with spring connections.</p>
            <ul className="list-disc pl-4 space-y-1 text-zinc-500 text-[11px]">
              <li>Drag nodes to rearrange</li>
              <li>Hover to highlight links</li>
              <li>Click to open note</li>
              <li>Zoom with mousewheel</li>
            </ul>
          </div>
        )}

        {/* Tab 4: Tags Explorer */}
        {activeSidebarTab === 'tags' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {tagsList.length === 0 ? (
              <div className="text-zinc-500 text-center py-6 text-[11px]">
                No #tags found yet.<br />Add #tag to any note!
              </div>
            ) : (
              tagsList.map(([tag, count]) => (
                <div
                  key={tag}
                  onClick={() => {
                    onSearchChange(`#${tag}`);
                    onSelectTab('search');
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-800/60 cursor-pointer text-zinc-300"
                >
                  <span className="text-sky-400 font-mono">#{tag}</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
