import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VaultFile, SidebarTab, BookmarkItem, VaultInfo } from '../../types';
import { vault } from '../../services/vault';
import { FileContextMenu } from '../Common/FileContextMenu';
import { 
  Search, 
  FolderPlus, 
  FilePlus, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Bookmark, 
  LayoutGrid, 
  Filter, 
  Check, 
  ChevronsDownUp, 
  ChevronsUpDown, 
  FileCode, 
  Calendar,
  Layers,
  X
} from 'lucide-react';

interface SidebarProps {
  files: VaultFile[];
  folders: string[];
  bookmarks: BookmarkItem[];
  activeFilePath?: string;
  activeSidebarTab: SidebarTab;
  isDarkTheme: boolean;
  vaultName: string;
  knownVaults?: VaultInfo[];
  onSwitchVault?: (targetPath: string) => void;
  isRecordingAudio?: boolean;
  isGraphViewActive?: boolean;
  activeRibbonTab?: 'files' | 'search' | 'bookmarks' | 'graph' | 'canvas';
  onOpenCanvasView?: () => void;
  onOpenFilesView?: () => void;
  onSelectTab: (tab: SidebarTab) => void;
  onSelectFile: (filePath: string) => void;
  onSplitFile?: (filePath: string) => void;
  onCreateFile: (folder?: string, ext?: string) => void;
  onCreateFolder: (folderPath: string) => void;
  onDeleteFile: (filePath: string) => void;
  onRenameFile: (filePath: string, newTitle: string) => void;
  onDuplicateFile: (filePath: string) => void;
  onToggleBookmark: (filePath: string, title: string) => void;
  onOpenDailyNote: () => void;
  onOpenRandomNote: () => void;
  onCreateZkNote: () => void;
  onToggleAudioRecording: () => void;
  onOpenVaultManager: () => void;
  onOpenSettings: () => void;
  onOpenFileRecovery: () => void;
  onToggleGraphView: () => void;
  onExportZip: () => void;
  onToggleTheme: () => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
  corePluginsConfig?: Record<string, any>;
  onExportPdf?: (filePath: string) => void;
  onToggleAIChat?: () => void;
  isAIChatActive?: boolean;
  onOpenCodeIngest?: () => void;
  onOpenExternalAIConnect?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  folders,
  bookmarks,
  activeFilePath,
  activeSidebarTab,
  onSelectTab,
  onSelectFile,
  onSplitFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onToggleBookmark,
  onToggleGraphView,
  searchFilter,
  onSearchChange,
  corePluginsConfig = {},
  onExportPdf,
  onOpenCodeIngest,
  onOpenVaultManager
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'mtime-desc' | 'ctime-desc'>('name-asc');
  const [activeFilter, setActiveFilter] = useState<'all' | 'journal' | 'canvas'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: VaultFile } | null>(null);

  // Close popup menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSortMenu(false);
      setShowFilterMenu(false);
    };
    if (showSortMenu || showFilterMenu) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [showSortMenu, showFilterMenu]);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const areAllFoldersCollapsed = useMemo(() => {
    if (folders.length === 0) return false;
    return folders.every(f => collapsedFolders[f]);
  }, [folders, collapsedFolders]);

  const handleToggleCollapseAll = () => {
    const nextState = !areAllFoldersCollapsed;
    const updated: Record<string, boolean> = {};
    folders.forEach(f => {
      updated[f] = nextState;
    });
    setCollapsedFolders(updated);
  };

  // Group files into folders and root files
  const { folderTree, rootFiles } = useMemo(() => {
    let filteredFiles = files.filter(f => !f.isBinary);

    if (activeFilter === 'journal') {
      filteredFiles = filteredFiles.filter(f => /^\d{4}-\d{2}-\d{2}/.test(f.name) || f.path.startsWith('Daily/'));
    } else if (activeFilter === 'canvas') {
      filteredFiles = filteredFiles.filter(f => f.extension === 'canvas');
    }

    const tree: Record<string, VaultFile[]> = {};
    const root: VaultFile[] = [];

    folders.forEach(f => {
      tree[f] = [];
    });

    filteredFiles.forEach(file => {
      if (file.folder) {
        if (!tree[file.folder]) tree[file.folder] = [];
        tree[file.folder].push(file);
      } else {
        root.push(file);
      }
    });

    // Sort files in each folder
    const sortFn = (a: VaultFile, b: VaultFile) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'mtime-desc') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortOrder === 'ctime-desc') return (b.createdAt || 0) - (a.createdAt || 0);
      return 0;
    };

    Object.keys(tree).forEach(k => {
      tree[k].sort(sortFn);
    });
    root.sort(sortFn);

    return { folderTree: tree, rootFiles: root };
  }, [files, folders, sortOrder, activeFilter]);

  const renderFileTypeIcon = (ext: string) => {
    if (ext === 'canvas') {
      return <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-blue-400" />;
    }
    if (ext === 'json' || ext === 'ts' || ext === 'js' || ext === 'py') {
      return <FileCode className="w-3.5 h-3.5 shrink-0 text-purple-400" />;
    }
    return <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
  };

  // Search Results Backend
  const [backendSearchResults, setBackendSearchResults] = useState<any[]>([]);
  const [totalBackendMatches, setTotalBackendMatches] = useState(0);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  useEffect(() => {
    const q = searchFilter.trim();
    if (!q) {
      setBackendSearchResults([]);
      setTotalBackendMatches(0);
      setIsSearchingBackend(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingBackend(true);
    const timer = setTimeout(async () => {
      const res = await vault.searchVault(q);
      if (!isCancelled) {
        setBackendSearchResults(res.results || []);
        setTotalBackendMatches(res.totalMatches || 0);
        setIsSearchingBackend(false);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchFilter]);

  const handleFinishRename = (filePath: string) => {
    if (editTitleValue.trim()) {
      onRenameFile(filePath, editTitleValue.trim());
    }
    setEditingFilePath(null);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const isBookmarked = (path: string) => bookmarks.some(b => b.path === path);

  const handleContextMenuOpen = (e: React.MouseEvent, file: VaultFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };

  return (
    <aside 
      aria-label="Files and Bookmarks Sidebar"
      className="w-60 h-full rounded-[24px] bg-[#FFFFFF] dark:bg-[#272727] border border-black/[0.06] dark:border-white/[0.04] flex flex-col overflow-hidden shrink-0 select-none z-10 transition-colors"
    >
      {/* Top Header: Expandable Search pill + Action buttons */}
      <div className="p-2 flex items-center gap-1.5 border-b border-black/[0.06] dark:border-white/[0.04] min-h-[44px]">
        {/* Search Pill: expands horizontally to 100% width when focused or active */}
        <div
          className={`relative transition-all duration-200 ease-in-out ${
            isSearchExpanded || searchFilter ? 'flex-1 w-full' : 'w-24 sm:w-28 shrink-0'
          }`}
        >
          <Search className="w-3 h-3 text-[#71717A] dark:text-[#6D6D6D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchFilter}
            onFocus={() => setIsSearchExpanded(true)}
            onBlur={() => {
              if (!searchFilter.trim()) {
                setIsSearchExpanded(false);
              }
            }}
            onChange={e => {
              onSearchChange(e.target.value);
              if (e.target.value && activeSidebarTab !== 'search') {
                onSelectTab('search');
              } else if (!e.target.value && activeSidebarTab === 'search') {
                onSelectTab('files');
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                onSearchChange('');
                setIsSearchExpanded(false);
                if (activeSidebarTab === 'search') onSelectTab('files');
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search file"
            className={`w-full bg-[#F0F0F4] dark:bg-[#3B3B3B] rounded-full pl-7 text-xs text-[#18181B] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-[#6D6D6D] focus:outline-none focus:ring-1 focus:ring-[#384CFF]/50 border-0 transition-all ${
              isSearchExpanded || searchFilter ? 'pr-7 py-1.5' : 'pr-2 py-1'
            }`}
          />
          {/* Close/Clear Button when search is expanded */}
          {(isSearchExpanded || searchFilter) && (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                onSearchChange('');
                setIsSearchExpanded(false);
                if (activeSidebarTab === 'search') onSelectTab('files');
              }}
              title="Close search (Esc)"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#71717A] dark:text-[#6D6D6D] hover:text-[#18181B] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Action Buttons: Hidden when search expands horizontally matching Image 8 */}
        {!isSearchExpanded && !searchFilter && (
          <div className="flex items-center gap-0.5 ml-auto animate-in fade-in duration-150 shrink-0">
            {/* Action 1: New Note */}
            <button
              onClick={() => onCreateFile('', 'md')}
              title="New Note"
              className="p-1 text-[#71717A] dark:text-[#6D6D6D] hover:text-[#18181B] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>

            {/* Action 2: New Folder */}
            <button
              onClick={() => setIsCreatingFolder(prev => !prev)}
              title="New Folder"
              className="p-1 text-[#71717A] dark:text-[#6D6D6D] hover:text-[#18181B] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            {/* Action 3: Collapse / Expand All */}
            <button
              onClick={handleToggleCollapseAll}
              title={areAllFoldersCollapsed ? 'Expand all folders' : 'Collapse all folders'}
              className="p-1 text-[#71717A] dark:text-[#6D6D6D] hover:text-[#18181B] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            >
              {areAllFoldersCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
            </button>

            {/* Action 4: Sort / Filter Options */}
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowSortMenu(prev => !prev);
                  setShowFilterMenu(false);
                }}
                title="Sort & Vault Options"
                className="p-1 text-[#71717A] dark:text-[#6D6D6D] hover:text-[#18181B] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>

              {showSortMenu && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-52 bg-[#FFFFFF] dark:bg-[#272727] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-1.5 z-50 text-xs text-[#18181B] dark:text-white/80 flex flex-col gap-0.5 shadow-2xl"
                >
                  <div className="text-[10px] uppercase font-semibold text-[#71717A] dark:text-[#6D6D6D] px-2 py-1 tracking-wider">
                    Sort Files
                  </div>
                  <button
                    onClick={() => {
                      setSortOrder('name-asc');
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer ${sortOrder === 'name-asc' ? 'bg-[#384CFF] text-white' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}
                  >
                    <span>A to Z</span>
                    {sortOrder === 'name-asc' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('name-desc');
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer ${sortOrder === 'name-desc' ? 'bg-[#384CFF] text-white' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}
                  >
                    <span>Z to A</span>
                    {sortOrder === 'name-desc' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('mtime-desc');
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer ${sortOrder === 'mtime-desc' ? 'bg-[#384CFF] text-white' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}
                  >
                    <span>Newest modified</span>
                    {sortOrder === 'mtime-desc' && <Check className="w-3 h-3" />}
                  </button>

                  <div className="my-1 border-t border-black/[0.08] dark:border-white/[0.08]" />

                  {/* Container Folder & Import Functionality */}
                  <div className="text-[10px] uppercase font-semibold text-[#71717A] dark:text-[#6D6D6D] px-2 py-1 tracking-wider">
                    Folder & Vault Options
                  </div>
                  <button
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setShowSortMenu(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer text-[#18181B] dark:text-white/90"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    <span>New Folder</span>
                  </button>

                  {onOpenVaultManager && (
                    <button
                      onClick={() => {
                        onOpenVaultManager();
                        setShowSortMenu(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer text-[#18181B] dark:text-white/90"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
                      <span>Import / Switch Vault...</span>
                    </button>
                  )}

                  {onOpenCodeIngest && (
                    <button
                      onClick={() => {
                        onOpenCodeIngest();
                        setShowSortMenu(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer text-[#18181B] dark:text-white/90"
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                      <span>Ingest Codebase Architecture...</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 border-b border-black/[0.06] dark:border-white/[0.04] bg-[#F0F0F4] dark:bg-[#3B3B3B]/50">
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            onBlur={() => setIsCreatingFolder(false)}
            className="w-full bg-[#FFFFFF] dark:bg-[#272727] border border-[#384CFF] rounded-lg px-2.5 py-1 text-xs text-[#18181B] dark:text-white focus:outline-none"
          />
        </form>
      )}

      {/* Sidebar Content Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 text-xs">
        {/* Bookmarks Mode (Screen 2) */}
        {activeSidebarTab === 'bookmarks' && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-[#71717A] dark:text-[#6D6D6D] px-2 uppercase tracking-wider mb-2">
              Bookmarks ({bookmarks.length})
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-[#71717A] dark:text-[#6D6D6D] text-center py-8 text-xs italic px-3">
                No bookmarks yet.<br />Click the bookmark icon on any note to save it here.
              </div>
            ) : (
              bookmarks.map((bm, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectFile(bm.path)}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] border border-black/[0.04] dark:border-white/[0.04] cursor-pointer text-[#18181B] dark:text-white/90 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Bookmark className="w-3.5 h-3.5 text-[#384CFF] shrink-0" />
                    <span className="truncate">{bm.title || bm.path}</span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleBookmark(bm.path, bm.title);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white"
                    title="Remove Bookmark"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Search Results Mode */}
        {activeSidebarTab === 'search' && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-[#71717A] dark:text-[#6D6D6D] px-1 uppercase tracking-wider">
              {isSearchingBackend ? 'Searching...' : `${totalBackendMatches} results`}
            </div>
            {backendSearchResults.map(res => (
              <div
                key={res.path}
                onClick={() => onSelectFile(res.path)}
                className="p-2.5 rounded-xl bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] border border-black/[0.04] dark:border-white/[0.04] cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between text-[#18181B] dark:text-white font-medium">
                  <span className="truncate">{res.name.replace(/\.md$/, '')}</span>
                  {res.totalMatches > 0 && (
                    <span className="text-[10px] px-1.5 rounded-full bg-[#384CFF]/20 text-[#384CFF] font-mono">
                      {res.totalMatches}
                    </span>
                  )}
                </div>
                {res.folder && (
                  <div className="text-[10px] text-[#71717A] dark:text-[#6D6D6D] font-mono">{res.folder}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Files Mode (Screen 1 & 5) */}
        {activeSidebarTab === 'files' && (
          <div className="space-y-3">
            {/* Folder Hierarchy (e.g. Adventure folder) */}
            <div className="space-y-1">
              {Object.entries(folderTree)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([folderName, folderFiles]) => {
                  if (!folderName) return null;
                  const isCollapsed = collapsedFolders[folderName];

                  return (
                    <div key={folderName} className="space-y-0.5">
                      {/* Folder Title Row */}
                      <div
                        onClick={() => toggleFolder(folderName)}
                        className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer text-[#18181B]/80 dark:text-white/80 font-medium transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-[#71717A] dark:text-[#6D6D6D] shrink-0" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#71717A] dark:text-[#6D6D6D] shrink-0" />
                          )}
                          {isCollapsed ? (
                            <Folder className="w-3.5 h-3.5 text-amber-500/80 dark:text-[#6D6D6D] shrink-0" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500/80 dark:text-[#6D6D6D] shrink-0" />
                          )}
                          <span className="truncate text-xs">{folderName}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onCreateFile(folderName, 'md');
                            }}
                            title={`New note in ${folderName}`}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white"
                          >
                            <FilePlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm(`Delete folder "${folderName}"?`)) {
                                onDeleteFile(folderName);
                              }
                            }}
                            title="Delete folder"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717A] dark:text-[#6D6D6D] hover:text-rose-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Files under folder */}
                      {!isCollapsed && (
                        <div className="pl-4 space-y-0.5">
                          {folderFiles.map(file => {
                            const isActive = file.path === activeFilePath;
                            return (
                              <div
                                key={file.path}
                                onClick={() => onSelectFile(file.path)}
                                onContextMenu={e => handleContextMenuOpen(e, file)}
                                className={`px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs truncate ${
                                  isActive
                                    ? 'bg-[#EAEAEE] dark:bg-[#3B3B3B] text-[#18181B] dark:text-white font-medium'
                                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-black/[0.04] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.04]'
                                }`}
                              >
                                {file.name.replace(/\.(md|canvas)$/, '')}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Root / Unorganized Notes as Rounded Pill Cards matching Screen 1 & 5 */}
            {rootFiles.length > 0 && (
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.04] space-y-1.5">
                {rootFiles.map(file => {
                  const isActive = file.path === activeFilePath;
                  const isCanvas = file.extension === 'canvas';

                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelectFile(file.path)}
                      onContextMenu={e => handleContextMenuOpen(e, file)}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-full cursor-pointer transition-all shadow-xs border ${
                        isActive
                          ? 'bg-[#EAEAEE] dark:bg-[#3B3B3B] text-[#18181B] dark:text-white font-medium border-black/[0.06] dark:border-white/10'
                          : 'bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#272727] dark:hover:bg-[#3B3B3B]/60 text-[#18181B]/80 dark:text-white/80 border-black/[0.04] dark:border-white/[0.04]'
                      }`}
                    >
                      {isCanvas ? (
                        <LayoutGrid className="w-3.5 h-3.5 text-[#384CFF] shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#71717A] dark:text-[#6D6D6D] shrink-0" />
                      )}
                      <span className="truncate text-xs">
                        {file.name.replace(/\.(md|canvas)$/, '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onOpenFile={path => {
            onSelectFile(path);
            setContextMenu(null);
          }}
          onOpenSplit={path => {
            onSplitFile?.(path);
            setContextMenu(null);
          }}
          onRenameFile={(f, newName) => {
            onRenameFile(f.path, newName);
            setContextMenu(null);
          }}
          onDeleteFile={path => {
            onDeleteFile(path);
            setContextMenu(null);
          }}
          onBookmarkFile={(path, title) => {
            onToggleBookmark(path, title || path);
            setContextMenu(null);
          }}
          isBookmarked={isBookmarked(contextMenu.file.path)}
          onDuplicateFile={path => {
            onDuplicateFile(path);
            setContextMenu(null);
          }}
          onRevealInNavigation={() => {
            setContextMenu(null);
          }}
          onOpenLocalGraph={() => {
            onToggleGraphView();
            setContextMenu(null);
          }}
          onExportPdf={path => {
            onExportPdf?.(path);
            setContextMenu(null);
          }}
          allFiles={files}
          folders={folders}
        />
      )}
    </aside>
  );
};
