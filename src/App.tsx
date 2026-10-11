import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VaultFile, TabItem, EditorViewMode, SidebarTab, CommandItem, GraphData } from './types';
import { vault } from './services/vault';
import { graphIndexer } from './services/graphIndexer';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { Inspector } from './components/Inspector/Inspector';
import { GraphView } from './components/Graph/GraphView';
import { TabBar } from './components/Tabs/TabBar';
import { QuickSwitcher } from './components/Modals/QuickSwitcher';
import { CommandPalette } from './components/Modals/CommandPalette';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen, 
  Share2, 
  Sparkles,
  Columns
} from 'lucide-react';

export const App: React.FC = () => {
  // Vault state
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isVaultLoaded, setIsVaultLoaded] = useState(false);

  // Layout & View states
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isGraphViewActive, setIsGraphViewActive] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Tabs
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Modals
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Initialize vault on startup
  useEffect(() => {
    async function load() {
      const loadedFiles = await vault.init();
      setFiles([...loadedFiles]);
      const recents = vault.getRecentNoteIds();
      setRecentIds(recents);

      if (loadedFiles.length > 0) {
        const firstFile = loadedFiles[0];
        setActiveFileId(firstFile.id);
        const initialTab: TabItem = {
          id: `tab-${Date.now()}`,
          fileId: firstFile.id,
          viewMode: 'live'
        };
        setTabs([initialTab]);
        setActiveTabId(initialTab.id);
        vault.recordRecentNote(firstFile.id);
      }
      setIsVaultLoaded(true);
    }
    load();
  }, []);

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  // Reactive Graph Index
  const graphData: GraphData = useMemo(() => {
    return graphIndexer.indexVault(files);
  }, [files]);

  // Active file & metadata
  const activeFile = useMemo(() => {
    return files.find(f => f.id === activeFileId);
  }, [files, activeFileId]);

  const activeMetadata = useMemo(() => {
    if (!activeFileId) return undefined;
    return graphIndexer.getMetadata(activeFileId);
  }, [activeFileId, files]);

  const activeBacklinks = useMemo(() => {
    if (!activeFileId) return [];
    return graphIndexer.getBacklinks(activeFileId);
  }, [activeFileId, files]);

  const activeUnlinkedMentions = useMemo(() => {
    if (!activeFileId) return [];
    return graphIndexer.getUnlinkedMentions(activeFileId);
  }, [activeFileId, files]);

  const currentTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId);
  }, [tabs, activeTabId]);

  // --- File & Tab Operations ---
  const handleSelectFile = useCallback((fileId: string) => {
    const file = vault.getFile(fileId);
    if (!file) return;

    setActiveFileId(fileId);
    setIsGraphViewActive(false);
    vault.recordRecentNote(fileId);
    setRecentIds(vault.getRecentNoteIds());

    // Check if file is already open in a tab
    const existingTab = tabs.find(t => t.fileId === fileId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      // If current tab is clean or replace, update or add
      const newTab: TabItem = {
        id: `tab-${Date.now()}`,
        fileId,
        viewMode: 'live'
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, [tabs]);

  const handleCreateFile = useCallback((folder: string = '', titleHint?: string) => {
    const defaultName = titleHint || `Untitled Note ${files.length + 1}`;
    const newFile = vault.createNote(defaultName, folder);
    setFiles([...vault.getFiles()]);
    handleSelectFile(newFile.id);
  }, [files.length, handleSelectFile]);

  const handleDeleteFile = useCallback((fileId: string) => {
    vault.deleteNote(fileId);
    const updated = vault.getFiles();
    setFiles([...updated]);

    // Close corresponding tabs
    const remainingTabs = tabs.filter(t => t.fileId !== fileId);
    if (remainingTabs.length > 0) {
      setTabs(remainingTabs);
      if (activeFileId === fileId) {
        handleSelectFile(remainingTabs[0].fileId);
      }
    } else if (updated.length > 0) {
      handleSelectFile(updated[0].id);
    }
  }, [tabs, activeFileId, handleSelectFile]);

  const handleRenameFile = useCallback((fileId: string, newTitle: string) => {
    const renamed = vault.renameNote(fileId, newTitle);
    if (renamed) {
      setFiles([...vault.getFiles()]);
    }
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    if (!activeFileId) return;
    vault.saveNote(activeFileId, newContent);
    setFiles([...vault.getFiles()]);
  }, [activeFileId]);

  // Wikilink click navigation: opens note or creates it if not found!
  const handleNavigateLink = useCallback((targetTitle: string) => {
    const existing = vault.getFileByName(targetTitle) || vault.getFileByPath(targetTitle);
    if (existing) {
      handleSelectFile(existing.id);
    } else {
      // Create and open note
      const newNote = vault.createNote(targetTitle);
      setFiles([...vault.getFiles()]);
      handleSelectFile(newNote.id);
    }
  }, [handleSelectFile]);

  // Convert unlinked mention to a [[Wikilink]] with one click
  const handleLinkMention = useCallback((sourceFileId: string, keyword: string) => {
    const sourceFile = vault.getFile(sourceFileId);
    if (!sourceFile) return;

    // Replace the first occurrence of the keyword that is not already inside [[...]]
    const regex = new RegExp(`(?<!\\[\\[)\\b${keyword}\\b(?!\\]\\])`, 'i');
    const updated = sourceFile.content.replace(regex, `[[${keyword}]]`);
    vault.saveNote(sourceFileId, updated);
    setFiles([...vault.getFiles()]);
  }, []);

  // Daily note
  const handleOpenDailyNote = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyPath = `Daily/${today}.md`;
    const existing = vault.getFileByPath(dailyPath) || vault.getFileByName(today);

    if (existing) {
      handleSelectFile(existing.id);
    } else {
      const template = `---\ntitle: ${today} Daily Note\ntags: [daily, log]\ndate: ${today}\n---\n\n# 📅 Daily Note — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n## 🎯 Priorities for Today\n- [ ] First priority\n- [ ] Second priority\n\n## 💭 Notes & Thoughts\n\n\n## 🔗 Connected Notes\n- [[Welcome to Obsidian]]\n`;
      const newNote = vault.createNote(today, 'Daily', template);
      setFiles([...vault.getFiles()]);
      handleSelectFile(newNote.id);
    }
  }, [handleSelectFile]);

  // Local folder opener (File System Access API)
  const handleOpenLocalFolder = async () => {
    try {
      const res = await vault.openLocalDirectory();
      if (res.success && res.count > 0) {
        setFiles([...vault.getFiles()]);
        const first = vault.getFiles()[0];
        if (first) handleSelectFile(first.id);
      }
    } catch (e: any) {
      alert(e.message || 'Error opening local directory');
    }
  };

  // Export Vault as ZIP
  const handleExportZip = async () => {
    await vault.exportAsZip();
  };

  // Tab operations
  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const nextActive = nextTabs[nextTabs.length - 1];
      setActiveTabId(nextActive.id);
      setActiveFileId(nextActive.fileId);
    }
  };

  const handleNewTab = () => {
    if (!activeFileId) return;
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      fileId: activeFileId,
      viewMode: 'live'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabSelect = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tab.id);
      setActiveFileId(tab.fileId);
      setIsGraphViewActive(false);
    }
  };

  const handleViewModeChange = (mode: EditorViewMode) => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, viewMode: mode } : t))
    );
  };

  // Global Command Registry
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'quick-switcher',
      title: 'Open Quick Switcher',
      category: 'Navigation',
      shortcut: 'Ctrl+O',
      action: () => setIsQuickSwitcherOpen(true)
    },
    {
      id: 'command-palette',
      title: 'Open Command Palette',
      category: 'Navigation',
      shortcut: 'Ctrl+P',
      action: () => setIsCommandPaletteOpen(true)
    },
    {
      id: 'graph-view',
      title: 'Toggle Global Graph View',
      category: 'View',
      shortcut: 'Ctrl+G',
      action: () => setIsGraphViewActive(prev => !prev)
    },
    {
      id: 'new-note',
      title: 'Create New Note',
      category: 'Notes',
      shortcut: 'Ctrl+N',
      action: () => handleCreateFile()
    },
    {
      id: 'daily-note',
      title: "Open Today's Daily Note",
      category: 'Notes',
      shortcut: 'Ctrl+Shift+D',
      action: () => handleOpenDailyNote()
    },
    {
      id: 'toggle-mode-live',
      title: 'Set Editor to Live Preview',
      category: 'Editor',
      action: () => handleViewModeChange('live')
    },
    {
      id: 'toggle-mode-source',
      title: 'Set Editor to Source Mode',
      category: 'Editor',
      action: () => handleViewModeChange('source')
    },
    {
      id: 'toggle-mode-reading',
      title: 'Set Editor to Reading View',
      category: 'Editor',
      action: () => handleViewModeChange('reading')
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Light / Dark Theme',
      category: 'Appearance',
      action: () => setIsDarkTheme(prev => !prev)
    },
    {
      id: 'open-local-vault',
      title: 'Open Local Folder on Disk (File System Access)',
      category: 'Vault',
      action: () => handleOpenLocalFolder()
    },
    {
      id: 'export-vault-zip',
      title: 'Export Entire Vault as ZIP',
      category: 'Vault',
      action: () => handleExportZip()
    },
    {
      id: 'reset-demo-vault',
      title: 'Reset to Default Starter Vault',
      category: 'Vault',
      action: () => {
        if (confirm('Reset all notes back to the default starter vault?')) {
          const reset = vault.resetToDefault();
          setFiles([...reset]);
          handleSelectFile(reset[0].id);
        }
      }
    }
  ], [handleCreateFile, handleOpenDailyNote, handleSelectFile]);

  // Global Keyboard Shortcuts (Ctrl+O, Ctrl+P, Ctrl+G, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsQuickSwitcherOpen(prev => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGraphViewActive(prev => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateFile]);

  if (!isVaultLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121214] text-zinc-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          <span>Loading Obsidian Vault...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#18181b] text-zinc-100 font-sans">
      {/* 1. Left Sidebar (Ribbon + File Tree / Search / Tags) */}
      {isSidebarOpen && (
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          activeSidebarTab={activeSidebarTab}
          isDarkTheme={isDarkTheme}
          onSelectTab={setActiveSidebarTab}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onOpenDailyNote={handleOpenDailyNote}
          onOpenLocalFolder={handleOpenLocalFolder}
          onExportZip={handleExportZip}
          onToggleTheme={() => setIsDarkTheme(prev => !prev)}
          searchFilter={searchFilter}
          onSearchChange={setSearchFilter}
        />
      )}

      {/* 2. Main Center Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Control Strip */}
        <div className="flex items-center justify-between bg-[#121214] border-b border-zinc-800/80 px-3 py-1 text-xs shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title={isSidebarOpen ? 'Collapse Left Sidebar' : 'Expand Left Sidebar'}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded transition-colors"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Switcher Trigger Pill */}
            <button
              onClick={() => setIsQuickSwitcherOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-purple-500/50 transition-all text-[11px]"
            >
              <span>Quick Switcher...</span>
              <kbd className="text-[10px] bg-zinc-800 px-1 rounded text-zinc-500">Ctrl+O</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+P)"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 text-[11px]"
            >
              <span>Commands</span>
              <kbd className="text-[10px] bg-zinc-800 px-1 rounded text-zinc-500">Ctrl+P</kbd>
            </button>

            <button
              onClick={() => setIsInspectorOpen(prev => !prev)}
              title={isInspectorOpen ? 'Collapse Right Inspector' : 'Expand Right Inspector'}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded transition-colors"
            >
              {isInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          files={files}
          isGraphViewActive={isGraphViewActive}
          onSelectTab={handleTabSelect}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
          onToggleGraphView={() => setIsGraphViewActive(prev => !prev)}
        />

        {/* Main Content Area: Editor OR Fullscreen Graph */}
        <div className="flex-1 overflow-hidden relative">
          {isGraphViewActive ? (
            <GraphView
              data={graphData}
              activeFileId={activeFileId}
              onSelectNode={fileId => {
                handleSelectFile(fileId);
                setIsGraphViewActive(false);
              }}
              isMini={false}
            />
          ) : activeFile ? (
            <Editor
              file={activeFile}
              allFiles={files}
              metadata={activeMetadata}
              viewMode={currentTab?.viewMode || 'live'}
              onViewModeChange={handleViewModeChange}
              onContentChange={handleContentChange}
              onNavigateLink={handleNavigateLink}
              onTagClick={tag => {
                setSearchFilter(`#${tag}`);
                setActiveSidebarTab('search');
                setIsSidebarOpen(true);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm select-none">
              No note open. Press Ctrl+O to open a note.
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Inspector (Backlinks, Outline, Local Graph) */}
      {isInspectorOpen && !isGraphViewActive && activeFile && (
        <Inspector
          activeFile={activeFile}
          metadata={activeMetadata}
          backlinks={activeBacklinks}
          unlinkedMentions={activeUnlinkedMentions}
          graphData={graphData}
          onNavigateFile={handleSelectFile}
          onLinkMention={handleLinkMention}
        />
      )}

      {/* Quick Switcher Modal (Cmd+O) */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        files={files}
        recentIds={recentIds}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={handleSelectFile}
        onCreateFile={title => handleCreateFile('', title)}
      />

      {/* Command Palette Modal (Cmd+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commands}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default App;
