import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VaultFile, SidebarTab, BookmarkItem } from '../../types';
import { vault } from '../../services/vault';
import { FileContextMenu } from '../Common/FileContextMenu';
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
  Trash2, 
  Edit3, 
  Download, 
  HardDrive, 
  Sun, 
  Moon, 
  X, 
  Bookmark, 
  LayoutGrid, 
  Shuffle, 
  Clock, 
  Settings, 
  Mic, 
  Square, 
  Copy, 
  Columns, 
  Link as LinkIcon, 
  History,
  HelpCircle,
  Printer,
  ExternalLink,
  ArrowUpDown,
  Filter,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Image as ImageIcon,
  Music,
  FileCode,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  files: VaultFile[];
  folders: string[];
  bookmarks: BookmarkItem[];
  activeFilePath?: string;
  activeSidebarTab: SidebarTab;
  isDarkTheme: boolean;
  vaultName: string;
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  folders,
  bookmarks,
  activeFilePath,
  activeSidebarTab,
  isDarkTheme,
  vaultName,
  isRecordingAudio = false,
  isGraphViewActive = false,
  activeRibbonTab,
  onOpenCanvasView,
  onOpenFilesView,
  onSelectTab,
  onSelectFile,
  onSplitFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onToggleBookmark,
  onOpenDailyNote,
  onOpenRandomNote,
  onCreateZkNote,
  onToggleAudioRecording,
  onOpenVaultManager,
  onOpenSettings,
  onOpenFileRecovery,
  onToggleGraphView,
  onExportZip,
  onToggleTheme,
  searchFilter,
  onSearchChange,
  corePluginsConfig = {},
  onExportPdf,
  onToggleAIChat,
  isAIChatActive = false
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Right-click Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: VaultFile;
  } | null>(null);

  // Close context menu on window click or escape
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleCloseMenu);
    };
  }, []);

  useEffect(() => {
    if (activeSidebarTab === 'tags') {
      onSelectTab('files');
    }
  }, [activeSidebarTab, onSelectTab]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Sort & Filter state
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'mtime-desc' | 'ctime-desc'>('name-asc');
  const [activeFilter, setActiveFilter] = useState<'all' | 'journal' | 'canvas'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Initialize sort order, filter, and collapsed folders from backend config (workspace.json)
  useEffect(() => {
    const ws = vault.getConfig('workspace') || {};
    if (ws.fileExplorer) {
      if (ws.fileExplorer.sortOrder) setSortOrder(ws.fileExplorer.sortOrder);
      if (ws.fileExplorer.collapsedFolders) setCollapsedFolders(ws.fileExplorer.collapsedFolders);
      if (ws.fileExplorer.activeFilter) setActiveFilter(ws.fileExplorer.activeFilter);
    }
  }, []);

  const isExplorerInit = useRef(true);
  useEffect(() => {
    if (isExplorerInit.current) {
      isExplorerInit.current = false;
      return;
    }
    const ws = vault.getConfig('workspace') || {};
    vault.saveConfig('workspace', {
      ...ws,
      fileExplorer: {
        sortOrder,
        collapsedFolders,
        activeFilter
      }
    });
  }, [sortOrder, collapsedFolders, activeFilter]);

  useEffect(() => {
    const handleOutside = () => {
      setShowSortMenu(false);
      setShowFilterMenu(false);
    };
    if (showSortMenu || showFilterMenu) {
      window.addEventListener('click', handleOutside);
      return () => window.removeEventListener('click', handleOutside);
    }
  }, [showSortMenu, showFilterMenu]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'journal') {
        const isDailyFolder = f.folder === 'Daily' || f.path.startsWith('Daily/');
        const isDatePattern = /^\d{4}-\d{2}-\d{2}/.test(f.name);
        const hasJournalTag = f.content?.includes('#journal') || f.content?.includes('#daily');
        return isDailyFolder || isDatePattern || hasJournalTag;
      }
      if (activeFilter === 'canvas') return f.extension === 'canvas';
      return true;
    });
  }, [files, activeFilter]);

  // Group files and folders into tree with sorting
  const folderTree = useMemo(() => {
    const map: Record<string, VaultFile[]> = { '': [] };
    folders.forEach(f => {
      if (!map[f]) map[f] = [];
    });
    filteredFiles.forEach(file => {
      const f = file.folder || '';
      if (!map[f]) map[f] = [];
      map[f].push(file);
    });

    // Sort files inside each folder
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
        if (sortOrder === 'mtime-desc') return (b.updatedAt || 0) - (a.updatedAt || 0);
        if (sortOrder === 'ctime-desc') return (b.createdAt || 0) - (a.createdAt || 0);
        return 0;
      });
    });

    return map;
  }, [filteredFiles, folders, sortOrder]);

  const allFoldersList = useMemo(() => {
    return Object.keys(folderTree).filter(f => f !== '');
  }, [folderTree]);

  const areAllFoldersCollapsed = useMemo(() => {
    if (allFoldersList.length === 0) return false;
    return allFoldersList.every(f => collapsedFolders[f]);
  }, [allFoldersList, collapsedFolders]);

  const handleToggleCollapseAll = () => {
    if (areAllFoldersCollapsed) {
      // Expand all folders
      setCollapsedFolders({});
    } else {
      // Collapse all folders
      const nextCollapsed: Record<string, boolean> = {};
      allFoldersList.forEach(f => {
        nextCollapsed[f] = true;
      });
      setCollapsedFolders(nextCollapsed);
    }
  };

  const renderFileTypeIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'canvas') {
      return <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-amber-400/90" />;
    }
    if (lower === 'pdf') {
      return <FileText className="w-3.5 h-3.5 shrink-0 text-rose-400/90" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(lower)) {
      return <ImageIcon className="w-3.5 h-3.5 shrink-0 text-sky-400/90" />;
    }
    if (['webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(lower)) {
      return <Music className="w-3.5 h-3.5 shrink-0 text-emerald-400/90" />;
    }
    if (lower === 'base') {
      return <FileCode className="w-3.5 h-3.5 shrink-0 text-purple-400/90" />;
    }
    return <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />;
  };

  const renderFileTypeBadge = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'md') return null;

    let label = lower.toUpperCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(lower)) {
      label = 'PNG';
    } else if (['webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(lower)) {
      label = 'AUDIO';
    }

    return (
      <span className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider shrink-0 select-none ml-auto pl-1.5">
        {label}
      </span>
    );
  };

  // Extract all tags across vault with frequencies
  const tagsList = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach(f => {
      if (f.extension !== 'md') return;
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

  // Search Results & Backend Search Integration
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

  const searchResults = useMemo(() => {
    const q = searchFilter.trim();
    if (!q) return files.filter(f => !f.isBinary);

    const lower = q.toLowerCase();
    return files.filter(f => {
      if (f.isBinary) return false;
      if (lower.startsWith('path:')) {
        const p = lower.slice(5).trim();
        return f.path.toLowerCase().includes(p);
      }
      if (lower.startsWith('file:')) {
        const fn = lower.slice(5).trim();
        return f.name.toLowerCase().includes(fn);
      }
      if (lower.startsWith('tag:')) {
        const tg = lower.slice(4).trim().replace(/^#/, '');
        return f.content.toLowerCase().includes(`#${tg}`) || f.content.toLowerCase().includes(tg);
      }
      return f.name.toLowerCase().includes(lower) || f.content.toLowerCase().includes(lower);
    });
  }, [files, searchFilter]);

  const handleStartRename = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFilePath(file.path);
    setEditTitleValue(file.name.replace(/\.[^/.]+$/, ''));
  };

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

  const currentRibbonPill: 'files' | 'search' | 'bookmarks' | 'graph' | 'canvas' =
    activeRibbonTab ||
    (isGraphViewActive
      ? 'graph'
      : activeSidebarTab === 'search'
      ? 'search'
      : activeSidebarTab === 'bookmarks'
      ? 'bookmarks'
      : activeFilePath?.endsWith('.canvas')
      ? 'canvas'
      : 'files');

  return (
    <div className="flex h-full glass-sidebar select-none shrink-0 relative">
      {/* 1. Left Vertical Ribbon */}
      <div className="w-12 glass-ribbon flex flex-col items-center pt-8 pb-3 justify-between shrink-0">
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => {
              if (onOpenFilesView) {
                onOpenFilesView();
              } else {
                if (isGraphViewActive) onToggleGraphView();
                onSelectTab('files');
              }
            }}
            title="File Explorer (Ctrl+Shift+E)"
            className={`p-2 rounded-lg transition-all duration-200 border-none ${
              currentRibbonPill === 'files'
                ? 'bg-[#2a2b36] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Files className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (isGraphViewActive) {
                onToggleGraphView();
              }
              onSelectTab('search');
            }}
            title="Search Vault (Ctrl+Shift+F)"
            className={`p-2 rounded-lg transition-all duration-200 border-none ${
              currentRibbonPill === 'search'
                ? 'bg-[#2a2b36] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {corePluginsConfig['bookmarks'] !== false && (
            <button
              onClick={() => {
                if (isGraphViewActive) {
                  onToggleGraphView();
                }
                onSelectTab('bookmarks');
              }}
              title="Bookmarks (.obsidian/bookmarks.json)"
              className={`p-2 rounded-lg transition-all duration-200 border-none ${
                currentRibbonPill === 'bookmarks'
                  ? 'bg-[#2a2b36] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}

          <div className="w-6 h-[1px] bg-white/[0.08] my-1" />

          {/* Core Plugin Ribbon Actions */}
          {corePluginsConfig['graph'] !== false && (
            <button
              onClick={onToggleGraphView}
              title={isGraphViewActive ? "Close Graph View (Ctrl+G)" : "Open Interactive Graph View (Ctrl+G)"}
              className={`p-2 rounded-lg transition-all duration-200 border-none ${
                currentRibbonPill === 'graph'
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06]'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {corePluginsConfig['canvas'] !== false && (
            <button
              onClick={() => {
                if (onOpenCanvasView) {
                  onOpenCanvasView();
                } else {
                  if (isGraphViewActive) onToggleGraphView();
                  onCreateFile('', 'canvas');
                }
              }}
              title="Canvas Board (.canvas)"
              className={`p-2 rounded-lg transition-all duration-200 border-none ${
                currentRibbonPill === 'canvas'
                  ? 'bg-[#d97706] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-orange-300 hover:bg-white/[0.06]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          )}

          {onToggleAIChat && (
            <button
              onClick={onToggleAIChat}
              title="AI Vault Assistant (RAG Memory)"
              className={`p-2 rounded-lg transition-all duration-200 border-none ${
                isAIChatActive
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Ribbon Utilities */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onOpenVaultManager}
            title="Manage Vaults on Disk"
            className="p-2 rounded-xl text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.08] transition-all"
          >
            <HardDrive className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleTheme}
            title="Toggle Light / Dark Theme"
            className="p-2 rounded-xl text-zinc-400 hover:text-amber-300 hover:bg-white/[0.08] transition-all"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            title="Settings (Ctrl+,)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Sidebar Drawer Content */}
      <div className="w-64 flex flex-col h-full bg-black/20 backdrop-blur-2xl">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider truncate">
            {activeSidebarTab === 'files' && vaultName}
            {activeSidebarTab === 'search' && 'Search Vault'}
            {activeSidebarTab === 'bookmarks' && 'Bookmarks'}
            {activeSidebarTab === 'tags' && 'Tags'}
          </span>

          {activeSidebarTab === 'files' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onCreateFile('', 'md')}
                title="New Note"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onCreateFile('', 'canvas')}
                title="New Canvas"
                className="p-1 rounded text-zinc-400 hover:text-orange-300 hover:bg-zinc-800 transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCreatingFolder(prev => !prev)}
                title="New Folder"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>

              {/* Sort Menu */}
              <div className="relative">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setShowSortMenu(prev => !prev);
                    setShowFilterMenu(false);
                  }}
                  title="Change sort order"
                  className={`p-1 rounded transition-colors ${
                    showSortMenu ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
                {showSortMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-[#1a1a20]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 text-xs text-zinc-300 flex flex-col gap-0.5"
                  >
                    <button
                      onClick={() => {
                        setSortOrder('name-asc');
                        setShowSortMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${sortOrder === 'name-asc' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span>File name (A to Z)</span>
                      {sortOrder === 'name-asc' && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      onClick={() => {
                        setSortOrder('name-desc');
                        setShowSortMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${sortOrder === 'name-desc' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span>File name (Z to A)</span>
                      {sortOrder === 'name-desc' && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      onClick={() => {
                        setSortOrder('mtime-desc');
                        setShowSortMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${sortOrder === 'mtime-desc' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span>Modified time (new first)</span>
                      {sortOrder === 'mtime-desc' && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      onClick={() => {
                        setSortOrder('ctime-desc');
                        setShowSortMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${sortOrder === 'ctime-desc' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span>Created time (new first)</span>
                      {sortOrder === 'ctime-desc' && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Collapse / Expand All Folders Toggle */}
              <button
                onClick={handleToggleCollapseAll}
                title={areAllFoldersCollapsed ? 'Expand all folders' : 'Collapse all folders'}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                {areAllFoldersCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
              </button>

              {/* Filter Menu */}
              <div className="relative">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setShowFilterMenu(prev => !prev);
                    setShowSortMenu(false);
                  }}
                  title="Filter notes by type or tag"
                  className={`p-1 rounded transition-colors ${
                    activeFilter !== 'all' ? 'text-white bg-[#705dcf]' : showFilterMenu ? 'text-purple-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
                {showFilterMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-[#1a1a20]/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 text-xs text-zinc-300 flex flex-col gap-0.5"
                  >
                    <button
                      onClick={() => {
                        setActiveFilter('all');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${activeFilter === 'all' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span>All Notes</span>
                      {activeFilter === 'all' && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      onClick={() => {
                        setActiveFilter('journal');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${activeFilter === 'journal' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white" />
                        <span>Daily Journals</span>
                      </span>
                      {activeFilter === 'journal' && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      onClick={() => {
                        setActiveFilter('canvas');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left ${activeFilter === 'canvas' ? 'bg-[#705dcf] text-white' : 'hover:bg-zinc-800'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
                        <span>Canvases (.canvas)</span>
                      </span>
                      {activeFilter === 'canvas' && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Indicator */}
        {activeFilter !== 'all' && activeSidebarTab === 'files' && (
          <div className="px-3 py-1.5 bg-[#1e1a2e] border-b border-white/[0.06] text-[11px] text-purple-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 capitalize font-medium">
              <Filter className="w-3 h-3 text-[#705dcf]" />
              <span>Filter: {activeFilter === 'journal' ? 'Daily Journals' : activeFilter}</span>
            </span>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-purple-300 hover:text-white p-0.5 rounded hover:bg-white/[0.08]"
              title="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* New Folder Input */}
        {isCreatingFolder && activeSidebarTab === 'files' && (
          <form onSubmit={handleCreateFolderSubmit} className="p-2 border-b border-zinc-800 bg-zinc-900/60">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="New folder name..."
              autoFocus
              onBlur={() => setIsCreatingFolder(false)}
              className="w-full bg-zinc-950 border border-purple-500 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            />
          </form>
        )}

        {/* Tab 1: File Explorer */}
        {activeSidebarTab === 'files' && (
          <div
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={async e => {
              e.preventDefault();
              const obsData = e.dataTransfer.getData('application/obsidian-file');
              if (obsData) {
                try {
                  const { path: sourcePath, name } = JSON.parse(obsData);
                  const targetPath = name; // root folder
                  if (sourcePath !== targetPath) {
                    await onRenameFile(sourcePath, targetPath);
                  }
                } catch {}
                return;
              }
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                for (let i = 0; i < e.dataTransfer.files.length; i++) {
                  const droppedFile = e.dataTransfer.files[i];
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const relPath = droppedFile.name.endsWith('.md') || droppedFile.name.endsWith('.canvas')
                      ? droppedFile.name
                      : `Attachments/${droppedFile.name}`;
                    await vault.saveBinaryFile(relPath, base64);
                  };
                  reader.readAsDataURL(droppedFile);
                }
              }
            }}
            className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs"
          >
            {Object.entries(folderTree)
              .sort(([a], [b]) => {
                if (a === '') return 1;
                if (b === '') return -1;
                return a.localeCompare(b);
              })
              .map(([folderName, folderFiles]) => {
                const renderFileRow = (file: VaultFile) => {
                  const isCanvas = file.extension === 'canvas';
                  const isActive = file.path === activeFilePath;

                  return (
                    <div
                      key={file.path}
                      draggable={true}
                      onDragStart={e => {
                        e.dataTransfer.setData('application/obsidian-file', JSON.stringify({
                          path: file.path,
                          name: file.name,
                          extension: file.extension
                        }));
                        e.dataTransfer.setData('text/plain', file.extension === 'md' ? `[[${file.name.replace(/\.md$/, '')}]]` : `![[${file.name}]]`);
                      }}
                      onClick={() => onSelectFile(file.path)}
                      onContextMenu={e => handleContextMenuOpen(e, file)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 border-none ${
                        isActive
                          ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                          : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        {renderFileTypeIcon(file.extension)}

                        {editingFilePath === file.path ? (
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={e => setEditTitleValue(e.target.value)}
                            onBlur={() => handleFinishRename(file.path)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleFinishRename(file.path);
                              if (e.key === 'Escape') setEditingFilePath(null);
                            }}
                            autoFocus
                            className="bg-zinc-900 text-zinc-100 px-1 py-0.5 rounded border border-purple-500 focus:outline-none w-32"
                          />
                        ) : (
                          <span className="truncate">{file.name.replace(/\.(md|canvas|png|jpg|jpeg|webp|gif|svg|base|pdf|webm|mp3|wav|ogg|m4a)$/, '')}</span>
                        )}
                      </div>

                      {renderFileTypeBadge(file.extension)}
                    </div>
                  );
                };

                if (folderName === '') {
                  return folderFiles.map(renderFileRow);
                }

                const isCollapsed = collapsedFolders[folderName];

                return (
                  <div key={folderName} className="space-y-0.5">
                    <div
                      onClick={() => toggleFolder(folderName)}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={async e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const obsData = e.dataTransfer.getData('application/obsidian-file');
                        if (obsData) {
                          try {
                            const { path: sourcePath, name } = JSON.parse(obsData);
                            const targetPath = `${folderName}/${name}`;
                            if (sourcePath !== targetPath) {
                              await onRenameFile(sourcePath, targetPath);
                            }
                          } catch {}
                          return;
                        }
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          for (let i = 0; i < e.dataTransfer.files.length; i++) {
                            const droppedFile = e.dataTransfer.files[i];
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = (reader.result as string).split(',')[1];
                              const relPath = `${folderName}/${droppedFile.name}`;
                              await vault.saveBinaryFile(relPath, base64);
                            };
                            reader.readAsDataURL(droppedFile);
                          }
                        }
                      }}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/[0.06] cursor-pointer font-medium transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        {isCollapsed ? (
                          <Folder className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                        <span className="truncate">{folderName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400/80 bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.2 rounded-full font-mono">{folderFiles.length}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onCreateFile(folderName, 'md');
                          }}
                          title={`New note in ${folderName}`}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-100 transition-opacity"
                        >
                          <FilePlus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onCreateFile(folderName, 'canvas');
                          }}
                          title={`New canvas in ${folderName}`}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-orange-400 transition-opacity"
                        >
                          <LayoutGrid className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm(`Move folder "${folderName}" and all its notes to .trash?`)) {
                              onDeleteFile(folderName);
                            }
                          }}
                          title={`Delete folder "${folderName}" to .trash`}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="pl-3.5 space-y-0.5 border-l border-zinc-800/60 ml-2">
                        {folderFiles.map(renderFileRow)}
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
                placeholder="Search (or path:, tag:, file:)..."
                autoFocus
                className="w-full pl-8 pr-6 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
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

            <div className="flex items-center gap-1 text-[10px] text-zinc-500 px-1">
              <button onClick={() => onSearchChange('path:Formatting')} className="hover:text-purple-400">path:</button>
              <span>·</span>
              <button onClick={() => onSearchChange('tag:')} className="hover:text-purple-400">tag:</button>
              <span>·</span>
              <button onClick={() => onSearchChange('file:')} className="hover:text-purple-400">file:</button>
            </div>

            {searchFilter.trim() && (
              <div className="flex items-center justify-between px-1 text-[10px] text-zinc-400 font-mono">
                {isSearchingBackend ? (
                  <span className="text-purple-400 animate-pulse">Searching vault files...</span>
                ) : (
                  <span>
                    {totalBackendMatches} match{totalBackendMatches === 1 ? '' : 'es'} across {backendSearchResults.length} file{backendSearchResults.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5 text-xs">
              {searchFilter.trim() ? (
                backendSearchResults.length === 0 && !isSearchingBackend ? (
                  <div className="p-4 text-center text-zinc-500 italic text-[11px]">
                    No notes match &quot;{searchFilter}&quot;.
                  </div>
                ) : (
                  backendSearchResults.map(res => (
                    <div
                      key={res.path}
                      onClick={() => onSelectFile(res.path)}
                      className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/90 cursor-pointer border border-zinc-800/70 hover:border-purple-500/40 transition-colors group space-y-1"
                    >
                      <div className="flex items-center justify-between text-zinc-200 font-medium">
                        <span className="truncate group-hover:text-purple-300 font-semibold">{res.name.replace(/\.md$/, '')}</span>
                        {res.totalMatches > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40 font-mono">
                            {res.totalMatches}
                          </span>
                        )}
                      </div>
                      {res.folder && (
                        <div className="text-[10px] text-zinc-500 font-mono">{res.folder}</div>
                      )}
                      {res.matches && res.matches.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {res.matches.slice(0, 3).map((m: any, mIdx: number) => (
                            <div key={mIdx} className="text-[10.5px] text-zinc-400 pl-2 border-l-2 border-purple-500/50 italic truncate font-sans">
                              <span className="font-mono text-zinc-500 mr-1.5 not-italic">L{m.line}:</span>
                              <span>{m.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                searchResults.map(file => (
                  <div
                    key={file.path}
                    onClick={() => onSelectFile(file.path)}
                    className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 cursor-pointer border border-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-zinc-200 font-medium">
                      <span className="truncate group-hover:text-purple-300 font-semibold">{file.name.replace(/\.md$/, '')}</span>
                    </div>
                    {file.folder && (
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{file.folder}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Bookmarks */}
        {activeSidebarTab === 'bookmarks' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {bookmarks.length === 0 ? (
              <div className="text-zinc-500 text-center py-8 text-[11px] italic">
                No bookmarked files yet.<br />Click the bookmark icon on any file to save it to <code className="text-zinc-400">.obsidian/bookmarks.json</code>.
              </div>
            ) : (
              bookmarks.map((bm, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectFile(bm.path)}
                  className="group flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-zinc-800/60 cursor-pointer text-zinc-300"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
                    <span className="truncate">{bm.title || bm.path}</span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleBookmark(bm.path, bm.title);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400"
                    title="Remove Bookmark"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
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
                    onSearchChange(`tag:${tag}`);
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

        {/* Bottom Vault Footer matching user screenshot */}
        <div className="px-2.5 py-1.5 border-t border-zinc-800/80 bg-[#121214] flex items-center justify-between text-xs text-zinc-400 select-none shrink-0">
          <button
            onClick={onOpenVaultManager}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 transition-colors truncate max-w-[140px]"
            title="Open Vault Switcher"
          >
            <span className="truncate font-medium">{vaultName}</span>
            <span className="text-[10px] text-zinc-500">▾</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={onOpenFileRecovery}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Help & Recovery"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Settings (Ctrl+,)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Obsidian File Context Menu */}
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
          onRevealInNavigation={path => {
            setContextMenu(null);
          }}
          onOpenLocalGraph={path => {
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
    </div>
  );
};
