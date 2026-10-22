import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  VaultFile, 
  TabItem, 
  PaneItem, 
  EditorViewMode, 
  SidebarTab, 
  CommandItem, 
  GraphData, 
  BookmarkItem, 
  VaultInfo 
} from './types';
import { vault } from './services/vault';
import { graphIndexer } from './services/graphIndexer';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { CanvasView } from './components/Canvas/CanvasView';
import { Inspector } from './components/Inspector/Inspector';
import { GraphView } from './components/Graph/GraphView';
import { TabBar } from './components/Tabs/TabBar';
import { QuickSwitcher } from './components/Modals/QuickSwitcher';
import { CommandPalette } from './components/Modals/CommandPalette';
import { SettingsModal } from './components/Modals/SettingsModal';
import { VaultSwitcherModal } from './components/Modals/VaultSwitcherModal';
import { FileRecoveryModal } from './components/Modals/FileRecoveryModal';
import { TemplatePickerModal } from './components/Modals/TemplatePickerModal';
import { ExportPdfModal } from './components/Modals/ExportPdfModal';
import { SlideDeck } from './components/Presentation/SlideDeck';
import { StatusBar } from './components/StatusBar/StatusBar';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen, 
  Share2, 
  Sparkles,
  Columns,
  Presentation,
  Settings,
  LayoutGrid,
  History,
  FileCode
} from 'lucide-react';

function formatDateWithTokens(date: Date, formatStr: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return formatStr
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/YY/g, String(date.getFullYear()).slice(-2))
    .replace(/MMMM/g, months[date.getMonth()])
    .replace(/MMM/g, monthsShort[date.getMonth()])
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/dddd/g, days[date.getDay()])
    .replace(/ddd/g, daysShort[date.getDay()])
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()));
}

export const App: React.FC = () => {
  // Vault & Disk states
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [knownVaults, setKnownVaults] = useState<VaultInfo[]>([]);
  const [vaultPath, setVaultPath] = useState<string>('');
  const [vaultName, setVaultName] = useState<string>('Vault');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [isVaultLoaded, setIsVaultLoaded] = useState(false);

  // .obsidian/ JSON Config states
  const [appConfig, setAppConfig] = useState<Record<string, any>>({});
  const [appearanceConfig, setAppearanceConfig] = useState<Record<string, any>>({});
  const [corePluginsConfig, setCorePluginsConfig] = useState<Record<string, any>>({});
  const [hotkeysConfig, setHotkeysConfig] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [graphConfig, setGraphConfig] = useState<Record<string, any>>({});

  // Layout & View states
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isGraphViewActive, setIsGraphViewActive] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const prevSidebarStateRef = useRef({ sidebar: true, inspector: true });

  const handleToggleZenMode = useCallback(() => {
    setIsZenMode(prev => {
      const next = !prev;
      if (next) {
        prevSidebarStateRef.current = { sidebar: isSidebarOpen, inspector: isInspectorOpen };
        setIsSidebarOpen(false);
        setIsInspectorOpen(false);
      } else {
        setIsSidebarOpen(prevSidebarStateRef.current.sidebar);
        setIsInspectorOpen(prevSidebarStateRef.current.inspector);
      }
      return next;
    });
  }, [isSidebarOpen, isInspectorOpen]);

  // Split Panes & Tabs State
  const [panes, setPanes] = useState<PaneItem[]>([]);
  const [activePaneId, setActivePaneId] = useState<string>('pane-main');
  const [findReplacePaneId, setFindReplacePaneId] = useState<string | null>(null);

  // Modals
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfTargetFile, setPdfTargetFile] = useState<VaultFile | undefined>(undefined);

  // Audio Recorder State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-Save Debounce & Flush Refs for 60 FPS Lag-free Typing
  const saveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingContentRef = useRef<Map<string, string>>(new Map());

  const flushPendingSave = useCallback((filePath?: string) => {
    if (filePath) {
      const timer = saveTimersRef.current.get(filePath);
      if (timer) clearTimeout(timer);
      saveTimersRef.current.delete(filePath);
      const content = pendingContentRef.current.get(filePath);
      if (content !== undefined) {
        pendingContentRef.current.delete(filePath);
        vault.saveNote(filePath, content);
      }
    } else {
      saveTimersRef.current.forEach(timer => clearTimeout(timer));
      saveTimersRef.current.clear();
      pendingContentRef.current.forEach((content, p) => {
        vault.saveNote(p, content);
      });
      pendingContentRef.current.clear();
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  // Synchronize state from VaultManager without triggering unnecessary re-renders
  const syncFromVaultManager = useCallback(() => {
    const currentFiles = vault.getFiles();
    setFiles(prev => {
      if (prev.length === currentFiles.length && prev.every((p, i) => p.path === currentFiles[i]?.path && p.updatedAt === currentFiles[i]?.updatedAt)) {
        return prev;
      }
      return [...currentFiles];
    });
    setFolders(prev => {
      const cur = vault.getFolders();
      return prev.length === cur.length && prev.every((f, i) => f === cur[i]) ? prev : cur;
    });
    setKnownVaults(vault.getKnownVaults());
    setVaultPath(vault.getActiveVaultPath());
    setVaultName(vault.getActiveVaultName() || 'Vault');
    setRecentPaths(vault.getRecentNotePaths());

    const configs = vault.getConfigs();
    setAppConfig(prev => JSON.stringify(prev) === JSON.stringify(configs.app) ? prev : (configs.app || {}));
    setAppearanceConfig(prev => JSON.stringify(prev) === JSON.stringify(configs.appearance) ? prev : (configs.appearance || {}));
    setCorePluginsConfig(prev => JSON.stringify(prev) === JSON.stringify(configs['core-plugins']) ? prev : (configs['core-plugins'] || {}));
    setHotkeysConfig(prev => JSON.stringify(prev) === JSON.stringify(configs.hotkeys) ? prev : (configs.hotkeys || {}));
    setBookmarks(prev => JSON.stringify(prev) === JSON.stringify(configs.bookmarks?.items) ? prev : (configs.bookmarks?.items || []));
    setGraphConfig(prev => JSON.stringify(prev) === JSON.stringify(configs.graph) ? prev : (configs.graph || {}));
    setIsDarkTheme(configs.appearance?.theme !== 'moonstone');
  }, []);

  // Initialize vault from real disk backend
  useEffect(() => {
    async function load() {
      const loadedFiles = await vault.init();
      syncFromVaultManager();

      const ws = vault.getConfig('workspace');
      if (ws && Array.isArray(ws.panes) && ws.panes.length > 0) {
        setPanes(ws.panes);
        setActivePaneId(ws.activePaneId || ws.panes[0].id);
        if (typeof ws.leftSidebarOpen === 'boolean') setIsSidebarOpen(ws.leftSidebarOpen);
        if (typeof ws.rightSidebarOpen === 'boolean') setIsInspectorOpen(ws.rightSidebarOpen);
      } else if (loadedFiles.length > 0) {
        const startNote = loadedFiles.find(f => f.path === 'Start here.md') || loadedFiles[0];
        const initialTab: TabItem = {
          id: `tab-${Date.now()}`,
          filePath: startNote.path,
          viewMode: 'live'
        };
        setPanes([{
          id: 'pane-main',
          tabs: [initialTab],
          activeTabId: initialTab.id
        }]);
        setActivePaneId('pane-main');
      }

      setIsVaultLoaded(true);
    }

    load();
    const unsub = vault.subscribe(() => {
      syncFromVaultManager();
    });
    return () => {
      unsub();
    };
  }, [syncFromVaultManager]);

  // Persist workspace.json debounced by 800ms to avoid re-save loops
  const isWorkspaceInit = useRef(true);
  const saveWorkspaceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isVaultLoaded || panes.length === 0) return;
    if (isWorkspaceInit.current) {
      isWorkspaceInit.current = false;
      return;
    }

    if (saveWorkspaceTimer.current) {
      clearTimeout(saveWorkspaceTimer.current);
    }

    saveWorkspaceTimer.current = window.setTimeout(() => {
      const ws = vault.getConfig('workspace') || {};
      vault.saveConfig('workspace', {
        ...ws,
        leftSidebarOpen: isSidebarOpen,
        rightSidebarOpen: isInspectorOpen,
        panes,
        activePaneId
      });
    }, 800);

    return () => {
      if (saveWorkspaceTimer.current) clearTimeout(saveWorkspaceTimer.current);
    };
  }, [panes, activePaneId, isSidebarOpen, isInspectorOpen, isVaultLoaded]);

  // Theme, Fonts & Custom CSS Snippets synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    if (appearanceConfig.baseFontSize) {
      document.documentElement.style.fontSize = `${appearanceConfig.baseFontSize}px`;
    }
    if (appearanceConfig.accentColor) {
      document.documentElement.style.setProperty('--accent-color', appearanceConfig.accentColor);
    }
    if (appearanceConfig.interfaceFontFamily) {
      document.documentElement.style.setProperty('--font-interface', appearanceConfig.interfaceFontFamily);
    }
    if (appearanceConfig.textFontFamily) {
      document.documentElement.style.setProperty('--font-text', appearanceConfig.textFontFamily);
    }
    if (appearanceConfig.monospaceFontFamily) {
      document.documentElement.style.setProperty('--font-monospace', appearanceConfig.monospaceFontFamily);
    }

    // Dynamic CSS snippets injection
    const enabledSnippets: string[] = appearanceConfig.enabledCssSnippets || [];
    vault.getSnippets().then(allSnippets => {
      const activeCss = allSnippets
        .filter(s => enabledSnippets.includes(s.name))
        .map(s => `/* Snippet: ${s.name} */\n${s.content}`)
        .join('\n\n');

      let styleEl = document.getElementById('obsidian-custom-snippets') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'obsidian-custom-snippets';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = activeCss;
    });
  }, [isDarkTheme, appearanceConfig]);

  // Active Pane & Active File
  const activePane = useMemo(() => {
    return panes.find(p => p.id === activePaneId) || panes[0];
  }, [panes, activePaneId]);

  const activeTab = useMemo(() => {
    if (!activePane) return undefined;
    return activePane.tabs.find(t => t.id === activePane.activeTabId) || activePane.tabs[0];
  }, [activePane]);

  const activeFilePath = activeTab?.filePath || '';

  const activeFile = useMemo(() => {
    return files.find(f => f.path === activeFilePath);
  }, [files, activeFilePath]);

  const activeCanvasStats = useMemo(() => {
    if (!activeFile || activeFile.extension !== 'canvas') return undefined;
    try {
      const parsed = JSON.parse(activeFile.content);
      return {
        nodesCount: Array.isArray(parsed.nodes) ? parsed.nodes.length : 0,
        edgesCount: Array.isArray(parsed.edges) ? parsed.edges.length : 0
      };
    } catch {
      return { nodesCount: 0, edgesCount: 0 };
    }
  }, [activeFile]);

  // Reactive Graph Index with 500ms debounce (prevents typing stutter & CPU lockup)
  const [graphData, setGraphData] = useState<GraphData>(() =>
    graphIndexer.indexVault(files, graphConfig.colorGroups)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setGraphData(graphIndexer.indexVault(files, graphConfig.colorGroups));
    }, 500);
    return () => clearTimeout(timer);
  }, [files, graphConfig.colorGroups]);

  const activeMetadata = useMemo(() => {
    if (!activeFilePath) return undefined;
    return graphIndexer.getMetadata(activeFilePath);
  }, [activeFilePath, graphData]);

  const activeBacklinks = useMemo(() => {
    if (!activeFilePath) return [];
    return graphIndexer.getBacklinks(activeFilePath);
  }, [activeFilePath, graphData]);

  const activeUnlinkedMentions = useMemo(() => {
    if (!activeFilePath) return [];
    return graphIndexer.getUnlinkedMentions(activeFilePath);
  }, [activeFilePath, graphData]);

  // --- File & Pane Operations ---
  const handleSelectFile = useCallback((filePathOrName: string, targetPaneId?: string) => {
    flushPendingSave();
    const file = vault.getFileByPath(filePathOrName) || vault.getFileByName(filePathOrName);
    if (!file) return;

    setIsGraphViewActive(false);
    vault.recordRecentNote(file.path);
    setRecentPaths(vault.getRecentNotePaths());

    const pId = targetPaneId || activePaneId;

    setPanes(prevPanes =>
      prevPanes.map(pane => {
        if (pane.id !== pId) return pane;
        const existingTab = pane.tabs.find(t => t.filePath === file.path);
        if (existingTab) {
          return { ...pane, activeTabId: existingTab.id };
        }
        const defaultMode: EditorViewMode = appConfig.defaultViewMode || 'live';
        const newTab: TabItem = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          filePath: file.path,
          viewMode: defaultMode
        };
        return {
          ...pane,
          tabs: [...pane.tabs, newTab],
          activeTabId: newTab.id
        };
      })
    );
  }, [activePaneId, appConfig.defaultViewMode]);

  const handleCreateFile = useCallback(async (folder: string = '', ext: string = 'md', titleHint?: string) => {
    const prefix = ext === 'canvas' ? 'Untitled Canvas' : 'Untitled Note';
    let num = 1;
    let candidate = titleHint || `${prefix} ${num}`;
    while (vault.getFileByName(candidate)) {
      num++;
      candidate = `${prefix} ${num}`;
    }

    const newFile = await vault.createNote(candidate, folder, '', ext);
    syncFromVaultManager();
    handleSelectFile(newFile.path);
  }, [handleSelectFile, syncFromVaultManager]);

  const handleCreateFolder = useCallback(async (folderPath: string) => {
    await vault.createFolder(folderPath);
    syncFromVaultManager();
  }, [syncFromVaultManager]);

  const handleDeleteFile = useCallback(async (filePath: string) => {
    await vault.deleteNote(filePath);
    syncFromVaultManager();

    const updatedFiles = vault.getFiles();
    setPanes(prevPanes =>
      prevPanes.map(pane => {
        const remaining = pane.tabs.filter(t => t.filePath !== filePath);
        if (remaining.length === 0 && updatedFiles.length > 0) {
          const fallbackTab: TabItem = {
            id: `tab-${Date.now()}`,
            filePath: updatedFiles[0].path,
            viewMode: 'live'
          };
          return { ...pane, tabs: [fallbackTab], activeTabId: fallbackTab.id };
        }
        const nextActive = pane.activeTabId && remaining.some(t => t.id === pane.activeTabId)
          ? pane.activeTabId
          : remaining[remaining.length - 1]?.id || '';
        return { ...pane, tabs: remaining, activeTabId: nextActive };
      })
    );
  }, [syncFromVaultManager]);

  const handleRenameFile = useCallback(async (oldPath: string, newTitle: string) => {
    const res = await vault.renameNote(oldPath, newTitle);
    if (res) {
      syncFromVaultManager();
      setPanes(prevPanes =>
        prevPanes.map(pane => ({
          ...pane,
          tabs: pane.tabs.map(t => (t.filePath === oldPath ? { ...t, filePath: res.newPath } : t))
        }))
      );
    }
  }, [syncFromVaultManager]);

  const handleDuplicateFile = useCallback(async (filePath: string) => {
    const copyPath = await vault.duplicateNote(filePath);
    if (copyPath) {
      syncFromVaultManager();
      handleSelectFile(copyPath);
    }
  }, [handleSelectFile, syncFromVaultManager]);

  const handleContentChange = useCallback((filePath: string, newContent: string) => {
    // 1. Instant in-memory update in vault singleton
    vault.updateInMemory(filePath, newContent);

    // 2. Optimistic update of local `files` state for instant 60 FPS response
    setFiles(prev => prev.map(f => f.path === filePath ? { ...f, content: newContent, updatedAt: Date.now() } : f));

    // 3. Track pending content for flush
    pendingContentRef.current.set(filePath, newContent);

    // 4. Debounced save to disk (350ms)
    const existing = saveTimersRef.current.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      saveTimersRef.current.delete(filePath);
      const latest = pendingContentRef.current.get(filePath);
      if (latest !== undefined) {
        pendingContentRef.current.delete(filePath);
        await vault.saveNote(filePath, latest);
      }
    }, 350);

    saveTimersRef.current.set(filePath, timer);
  }, []);

  // Wikilink navigation: opens note or creates it on disk if not found
  const handleNavigateLink = useCallback(async (targetTitle: string) => {
    const existing = vault.getFileByName(targetTitle) || vault.getFileByPath(targetTitle);
    if (existing) {
      handleSelectFile(existing.path);
    } else {
      const newNote = await vault.createNote(targetTitle);
      syncFromVaultManager();
      handleSelectFile(newNote.path);
    }
  }, [handleSelectFile, syncFromVaultManager]);

  // Convert unlinked mention to [[Wikilink]]
  const handleLinkMention = useCallback(async (sourceFilePath: string, keyword: string) => {
    const sourceFile = vault.getFile(sourceFilePath);
    if (!sourceFile) return;

    const regex = new RegExp(`(?<!\\[\\[)\\b${keyword}\\b(?!\\]\\])`, 'i');
    const updated = sourceFile.content.replace(regex, `[[${keyword}]]`);
    await vault.saveNote(sourceFilePath, updated);
    syncFromVaultManager();
  }, [syncFromVaultManager]);

  // Bookmarks toggle (.obsidian/bookmarks.json)
  const handleToggleBookmark = useCallback((filePath: string, title: string) => {
    const exists = bookmarks.some(b => b.path === filePath);
    const nextBookmarks: BookmarkItem[] = exists
      ? bookmarks.filter(b => b.path !== filePath)
      : [...bookmarks, { type: 'file', path: filePath, title }];

    setBookmarks(nextBookmarks);
    vault.saveConfig('bookmarks', { items: nextBookmarks });
  }, [bookmarks]);

  // Daily Note (daily-notes.json)
  const handleOpenDailyNote = useCallback(async () => {
    const dailyCfg = vault.getConfig('daily-notes') || { folder: 'Daily', format: 'YYYY-MM-DD', template: 'Templates/Daily Note Template.md' };
    const now = new Date();
    const formattedTitle = formatDateWithTokens(now, dailyCfg.format || 'YYYY-MM-DD');
    const today = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);
    const folder = dailyCfg.folder || 'Daily';
    const dailyPath = folder ? `${folder}/${formattedTitle}.md` : `${formattedTitle}.md`;

    const existing = vault.getFileByPath(dailyPath) || vault.getFileByName(formattedTitle);
    if (existing) {
      handleSelectFile(existing.path);
    } else {
      let templateText = `---\ntitle: "${formattedTitle}"\ndate: "${today}"\ntags:\n  - daily\n---\n\n# ${formattedTitle}\n\n## Priorities\n- [ ] \n\n## Notes\n- \n`;
      if (dailyCfg.template) {
        const tplFile = vault.getFileByPath(dailyCfg.template);
        if (tplFile) {
          templateText = tplFile.content
            .replace(/\{\{title\}\}/g, formattedTitle)
            .replace(/\{\{date\}\}/g, today)
            .replace(/\{\{time\}\}/g, nowTime);
        }
      }
      const newNote = await vault.createNote(formattedTitle, folder, templateText, 'md');
      syncFromVaultManager();
      handleSelectFile(newNote.path);
    }
  }, [handleSelectFile, syncFromVaultManager]);

  // Zettelkasten Prefixer Note (zk-prefixer.json)
  const handleCreateZkNote = useCallback(async () => {
    const zkCfg = vault.getConfig('zk-prefixer') || { folder: '', format: 'YYYYMMDDHHmm', template: 'Templates/Zettelkasten Note.md' };
    const now = new Date();
    const zkId = formatDateWithTokens(now, zkCfg.format || 'YYYYMMDDHHmm');
    const today = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const title = `${zkId} Zettelkasten Note`;

    let tplContent = `---\nid: "${zkId}"\ncreated: "${today} ${timeStr}"\ntags:\n  - zettel\n---\n\n# ${title}\n\n`;
    if (zkCfg?.template) {
      const tplFile = vault.getFileByPath(zkCfg.template);
      if (tplFile) {
        tplContent = tplFile.content
          .replace(/\{\{title\}\}/g, title)
          .replace(/\{\{date\}\}/g, today)
          .replace(/\{\{time\}\}/g, timeStr);
      }
    }

    const newNote = await vault.createNote(title, zkCfg?.folder || '', tplContent, 'md');
    syncFromVaultManager();
    handleSelectFile(newNote.path);
  }, [handleSelectFile, syncFromVaultManager]);

  // Workspaces core plugin: save and load layouts
  const handleSaveWorkspace = useCallback((name: string) => {
    const wsConfig = vault.getConfig('workspaces') || { active: 'default', workspaces: {} };
    const savedLayout = {
      panes,
      activePaneId,
      isSidebarOpen,
      isInspectorOpen
    };
    const nextWorkspaces = {
      ...wsConfig.workspaces,
      [name]: savedLayout
    };
    const updated = {
      ...wsConfig,
      active: name,
      workspaces: nextWorkspaces
    };
    vault.saveConfig('workspaces', updated);
  }, [panes, activePaneId, isSidebarOpen, isInspectorOpen]);

  const handleLoadWorkspace = useCallback((name: string) => {
    const wsConfig = vault.getConfig('workspaces') || { active: 'default', workspaces: {} };
    const target = wsConfig.workspaces?.[name];
    if (target) {
      if (Array.isArray(target.panes) && target.panes.length > 0) {
        setPanes(target.panes);
        setActivePaneId(target.activePaneId || target.panes[0].id);
      }
      if (typeof target.isSidebarOpen === 'boolean') setIsSidebarOpen(target.isSidebarOpen);
      if (typeof target.isInspectorOpen === 'boolean') setIsInspectorOpen(target.isInspectorOpen);
      vault.saveConfig('workspaces', { ...wsConfig, active: name });
    }
  }, []);

  // Random Note (random-note plugin)
  const handleOpenRandomNote = useCallback(() => {
    const mdFiles = files.filter(f => f.extension === 'md');
    if (mdFiles.length === 0) return;
    const randomFile = mdFiles[Math.floor(Math.random() * mdFiles.length)];
    handleSelectFile(randomFile.path);
  }, [files, handleSelectFile]);

  // Insert Template into Active Note
  const handleInsertTemplate = useCallback(async (templateContent: string) => {
    if (!activeFile) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const expanded = templateContent
      .replace(/\{\{title\}\}/g, activeFile.name.replace(/\.md$/, ''))
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{time\}\}/g, timeStr);

    const nextContent = `${activeFile.content}\n\n${expanded}`;
    await handleContentChange(activeFile.path, nextContent);
  }, [activeFile, handleContentChange]);

  // Audio Recorder Core Plugin (records real .webm audio to disk)
  const handleToggleAudioRecording = useCallback(async () => {
    if (isRecordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const fileName = `Recording ${timestamp}.webm`;
          const attachFolder = appConfig.attachmentFolderPath || 'Attachments';
          const relPath = attachFolder ? `${attachFolder}/${fileName}` : fileName;

          await vault.saveBinaryFile(relPath, base64);
          syncFromVaultManager();

          if (activeFile && activeFile.extension === 'md') {
            const updatedContent = `${activeFile.content}\n\n![[${relPath}]]\n`;
            await handleContentChange(activeFile.path, updatedContent);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
    } catch (err: any) {
      alert('Microphone permission is required to record voice notes: ' + (err?.message || ''));
    }
  }, [isRecordingAudio, appConfig.attachmentFolderPath, activeFile, handleContentChange, syncFromVaultManager]);

  // Split Pane Operations
  const handleSplitPaneRight = useCallback((targetPath?: string) => {
    const fileToOpen = targetPath || activeFilePath || files[0]?.path;
    if (!fileToOpen) return;
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      filePath: fileToOpen,
      viewMode: 'live'
    };
    const newPane: PaneItem = {
      id: `pane-${Date.now()}`,
      tabs: [newTab],
      activeTabId: newTab.id
    };
    setPanes(prev => [...prev, newPane]);
    setActivePaneId(newPane.id);
  }, [activeFilePath, files]);

  const handleClosePane = useCallback((paneId: string) => {
    if (panes.length <= 1) return;
    const next = panes.filter(p => p.id !== paneId);
    setPanes(next);
    if (activePaneId === paneId) {
      setActivePaneId(next[next.length - 1].id);
    }
  }, [panes, activePaneId]);

  const handleSelectTabInPane = (paneId: string, tabId: string) => {
    setActivePaneId(paneId);
    setIsGraphViewActive(false);
    setPanes(prev =>
      prev.map(p => (p.id === paneId ? { ...p, activeTabId: tabId } : p))
    );
  };

  const handleCloseTabInPane = useCallback((paneId: string, tabId: string) => {
    setPanes(prev => {
      const pane = prev.find(p => p.id === paneId);
      if (!pane) return prev;
      if (pane.tabs.length <= 1) {
        if (prev.length > 1) {
          const nextPanes = prev.filter(p => p.id !== paneId);
          if (activePaneId === paneId) {
            setActivePaneId(nextPanes[nextPanes.length - 1].id);
          }
          return nextPanes;
        }
        return prev;
      }
      const nextTabs = pane.tabs.filter(t => t.id !== tabId);
      const nextActive = pane.activeTabId === tabId
        ? nextTabs[nextTabs.length - 1].id
        : pane.activeTabId;
      return prev.map(p => (p.id === paneId ? { ...p, tabs: nextTabs, activeTabId: nextActive } : p));
    });
  }, [activePaneId]);

  const handleNewTabInPane = (paneId: string) => {
    const defaultFile = activeFilePath || files[0]?.path || '';
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      filePath: defaultFile,
      viewMode: 'live'
    };
    setPanes(prev =>
      prev.map(p => (p.id === paneId ? { ...p, tabs: [...p.tabs, newTab], activeTabId: newTab.id } : p))
    );
    setActivePaneId(paneId);
  };

  const handleViewModeChangeInPane = (paneId: string, mode: EditorViewMode) => {
    setPanes(prev =>
      prev.map(p => {
        if (p.id !== paneId) return p;
        return {
          ...p,
          tabs: p.tabs.map(t => (t.id === p.activeTabId ? { ...t, viewMode: mode } : t))
        };
      })
    );
  };

  const handleCycleActiveViewMode = useCallback(() => {
    if (!activeTab || !activePaneId) return;
    const modes: EditorViewMode[] = ['live', 'source', 'reading'];
    const currentIndex = modes.indexOf(activeTab.viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    handleViewModeChangeInPane(activePaneId, nextMode);
  }, [activeTab, activePaneId]);

  // Comprehensive Obsidian Command Registry (from app.js)
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'app:toggle-zen-mode',
      title: 'View: Toggle Focus / Zen Mode',
      category: 'View',
      shortcut: 'Ctrl+Shift+F',
      action: () => handleToggleZenMode()
    },
    {
      id: 'switcher:open',
      title: 'Quick switcher: Open quick switcher',
      category: 'Quick switcher',
      shortcut: 'Ctrl+O',
      action: () => setIsQuickSwitcherOpen(true)
    },
    {
      id: 'command-palette:open',
      title: 'Command palette: Open command palette',
      category: 'Command palette',
      shortcut: 'Ctrl+P',
      action: () => setIsCommandPaletteOpen(true)
    },
    {
      id: 'file:export-pdf',
      title: 'Export to PDF...',
      category: 'File',
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        if (activeFile) {
          setPdfTargetFile(activeFile);
          setIsPdfModalOpen(true);
        }
      }
    },
    {
      id: 'workspaces:save',
      title: 'Workspaces: Save layout',
      category: 'Workspaces',
      action: () => {
        const name = prompt('Enter workspace name:');
        if (name && name.trim()) handleSaveWorkspace(name.trim());
      }
    },
    {
      id: 'workspaces:manage',
      title: 'Workspaces: Manage workspaces',
      category: 'Workspaces',
      action: () => setIsSettingsOpen(true)
    },
    {
      id: 'note-composer:extract',
      title: 'Note composer: Extract selection to new note',
      category: 'Note composer',
      action: async () => {
        const selection = window.getSelection()?.toString();
        if (!selection || !selection.trim()) {
          alert('Select some text in the note first to extract it into a new note.');
          return;
        }
        const title = prompt('Enter title for extracted note:');
        if (!title || !title.trim()) return;
        const newFile = await vault.createNote(title.trim(), '', selection.trim(), 'md');
        syncFromVaultManager();
        if (activeFile) {
          const updated = activeFile.content.replace(selection, `[[${title.trim()}]]`);
          await handleContentChange(activeFile.path, updated);
        }
        handleSelectFile(newFile.path);
      }
    },
    {
      id: 'note-composer:merge',
      title: 'Note composer: Merge current note with another note',
      category: 'Note composer',
      action: async () => {
        if (!activeFile) return;
        const targetTitle = prompt('Enter target note name to merge into:');
        if (!targetTitle) return;
        const target = vault.getFileByName(targetTitle) || vault.getFileByPath(targetTitle);
        if (!target) {
          alert(`Target note "${targetTitle}" not found.`);
          return;
        }
        const cleanName = activeFile.name.replace(/\.md$/, '');
        const merged = `${target.content}\n\n---\n\n# Merged from [[${cleanName}]]\n\n${activeFile.content}`;
        await handleContentChange(target.path, merged);
        await handleDeleteFile(activeFile.path);
        handleSelectFile(target.path);
      }
    },
    {
      id: 'system:reveal',
      title: 'System: Show in system explorer',
      category: 'System',
      action: () => {
        if (activeFile) vault.revealInSystemExplorer(activeFile.path);
      }
    },
    {
      id: 'system:open-default',
      title: 'System: Open in default app',
      category: 'System',
      action: () => {
        if (activeFile) vault.openInDefaultApp(activeFile.path);
      }
    },
    {
      id: 'editor:find-replace',
      title: 'Editor: Find and replace in note',
      category: 'Editor',
      shortcut: 'Ctrl+H',
      action: () => setFindReplacePaneId(activePaneId)
    },
    {
      id: 'graph:open',
      title: 'Graph view: Open graph view',
      category: 'Graph view',
      shortcut: 'Ctrl+G',
      action: () => setIsGraphViewActive(prev => !prev)
    },
    {
      id: 'file-explorer:new-file',
      title: 'Create new note',
      category: 'Files',
      shortcut: 'Ctrl+N',
      action: () => handleCreateFile('', 'md')
    },
    {
      id: 'canvas:new-file',
      title: 'Canvas: Create new canvas (.canvas)',
      category: 'Canvas',
      action: () => handleCreateFile('', 'canvas')
    },
    {
      id: 'daily-notes',
      title: 'Daily notes: Open today\'s daily note',
      category: 'Daily notes',
      shortcut: 'Ctrl+Shift+D',
      action: () => handleOpenDailyNote()
    },
    {
      id: 'zk-prefixer',
      title: 'Unique note creator: Create new unique Zettelkasten note',
      category: 'Unique note creator',
      action: () => handleCreateZkNote()
    },
    {
      id: 'random-note',
      title: 'Random note: Open random note',
      category: 'Random note',
      action: () => handleOpenRandomNote()
    },
    {
      id: 'templates:insert-template',
      title: 'Templates: Insert template',
      category: 'Templates',
      shortcut: 'Ctrl+T',
      action: () => setIsTemplateModalOpen(true)
    },
    {
      id: 'workspace:split-vertical',
      title: 'Split right',
      category: 'Workspace',
      shortcut: 'Ctrl+\\',
      action: () => handleSplitPaneRight()
    },
    {
      id: 'workspace:toggle-left-sidebar',
      title: 'Toggle left sidebar',
      category: 'Workspace',
      action: () => setIsSidebarOpen(prev => !prev)
    },
    {
      id: 'workspace:toggle-right-sidebar',
      title: 'Toggle right sidebar',
      category: 'Workspace',
      action: () => setIsInspectorOpen(prev => !prev)
    },
    {
      id: 'editor:toggle-source',
      title: 'Toggle Live Preview / Source mode',
      category: 'Editor',
      action: () => {
        if (activePane && activeTab) {
          handleViewModeChangeInPane(activePane.id, activeTab.viewMode === 'source' ? 'live' : 'source');
        }
      }
    },
    {
      id: 'markdown:toggle-preview',
      title: 'Toggle reading view',
      category: 'Editor',
      shortcut: 'Ctrl+E',
      action: () => {
        if (activePane && activeTab) {
          handleViewModeChangeInPane(activePane.id, activeTab.viewMode === 'reading' ? 'live' : 'reading');
        }
      }
    },
    {
      id: 'bookmarks:bookmark-current-view',
      title: 'Bookmarks: Bookmark active file',
      category: 'Bookmarks',
      action: () => {
        if (activeFile) {
          handleToggleBookmark(activeFile.path, activeFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
    },
    {
      id: 'file-recovery:open',
      title: 'File recovery: Open local snapshots',
      category: 'File recovery',
      action: () => setIsRecoveryModalOpen(true)
    },
    {
      id: 'audio-recorder:toggle',
      title: isRecordingAudio ? 'Audio recorder: Stop recording' : 'Audio recorder: Start recording audio',
      category: 'Audio recorder',
      action: () => handleToggleAudioRecording()
    },
    {
      id: 'slides:start',
      title: 'Slides: Start presentation',
      category: 'Slides',
      shortcut: 'Alt+P',
      action: () => setIsPresentationOpen(true)
    },
    {
      id: 'app:open-vault',
      title: 'Manage / Open another vault on disk',
      category: 'Vault',
      action: () => setIsVaultModalOpen(true)
    },
    {
      id: 'app:open-settings',
      title: 'Open settings',
      category: 'App',
      shortcut: 'Ctrl+,',
      action: () => setIsSettingsOpen(true)
    },
    {
      id: 'theme:toggle',
      title: 'Toggle Dark / Light theme',
      category: 'Appearance',
      action: () => {
        const nextTheme = isDarkTheme ? 'moonstone' : 'obsidian';
        setIsDarkTheme(!isDarkTheme);
        vault.saveConfig('appearance', { ...appearanceConfig, theme: nextTheme });
      }
    },
    {
      id: 'vault:export-zip',
      title: 'Export vault as ZIP archive',
      category: 'Vault',
      action: () => vault.exportAsZip()
    }
  ], [
    handleCreateFile,
    handleOpenDailyNote,
    handleCreateZkNote,
    handleOpenRandomNote,
    handleSplitPaneRight,
    activePane,
    activeTab,
    activeFile,
    handleToggleBookmark,
    isRecordingAudio,
    handleToggleAudioRecording,
    isDarkTheme,
    appearanceConfig,
    handleSaveWorkspace,
    handleDeleteFile,
    handleContentChange,
    handleSelectFile,
    syncFromVaultManager
  ]);

  const enabledCommands = useMemo(() => {
    return commands.filter(cmd => {
      if (cmd.id.startsWith('graph:') && corePluginsConfig['graph'] === false) return false;
      if (cmd.id.startsWith('canvas:') && corePluginsConfig['canvas'] === false) return false;
      if (cmd.id === 'daily-notes' && corePluginsConfig['daily-notes'] === false) return false;
      if (cmd.id === 'zk-prefixer' && corePluginsConfig['zk-prefixer'] === false) return false;
      if (cmd.id === 'random-note' && corePluginsConfig['random-note'] === false) return false;
      if (cmd.id.startsWith('templates:') && corePluginsConfig['templates'] === false) return false;
      if (cmd.id.startsWith('file-recovery:') && corePluginsConfig['file-recovery'] === false) return false;
      if (cmd.id.startsWith('audio-recorder:') && corePluginsConfig['audio-recorder'] === false) return false;
      if (cmd.id.startsWith('slides:') && corePluginsConfig['slides'] === false) return false;
      if (cmd.id.startsWith('bookmarks:') && corePluginsConfig['bookmarks'] === false) return false;
      if (cmd.id.startsWith('workspaces:') && corePluginsConfig['workspaces'] === false) return false;
      if (cmd.id.startsWith('note-composer:') && corePluginsConfig['note-composer'] === false) return false;
      return true;
    });
  }, [commands, corePluginsConfig]);

  // Dynamic Hotkeys & Global Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGraphViewActive) {
          e.preventDefault();
          setIsGraphViewActive(false);
          return;
        } else if (isPresentationOpen) {
          e.preventDefault();
          setIsPresentationOpen(false);
          return;
        }
      }

      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key);
      if (isModifierOnly) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activePane && activeTab) {
          handleCloseTabInPane(activePane.id, activeTab.id);
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput && !isCmdOrCtrl && !e.altKey) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key.toUpperCase();
      if (key === ' ') key = 'Space';
      if (key === 'ARROWUP') key = 'Up';
      if (key === 'ARROWDOWN') key = 'Down';
      if (key === 'ARROWLEFT') key = 'Left';
      if (key === 'ARROWRIGHT') key = 'Right';
      parts.push(key);

      const eventKeyCombo = parts.join('+').toLowerCase();

      for (const cmd of commands) {
        const customBinding = hotkeysConfig[cmd.id];
        const activeBinding = customBinding !== undefined ? customBinding : cmd.shortcut;
        if (!activeBinding) continue;

        const normalizedBinding = activeBinding
          .replace(/CmdOrCtrl|Mod/gi, 'Ctrl')
          .replace(/\s+/g, '')
          .toLowerCase();

        const matchesBinding = eventKeyCombo === normalizedBinding ||
          eventKeyCombo === normalizedBinding.replace('ctrl', 'meta');

        if (matchesBinding) {
          // Verify core plugin gating
          if (cmd.id.startsWith('graph:') && corePluginsConfig['graph'] === false) return;
          if (cmd.id.startsWith('canvas:') && corePluginsConfig['canvas'] === false) return;
          if (cmd.id === 'daily-notes' && corePluginsConfig['daily-notes'] === false) return;
          if (cmd.id === 'zk-prefixer' && corePluginsConfig['zk-prefixer'] === false) return;
          if (cmd.id === 'random-note' && corePluginsConfig['random-note'] === false) return;
          if (cmd.id.startsWith('templates:') && corePluginsConfig['templates'] === false) return;
          if (cmd.id.startsWith('file-recovery:') && corePluginsConfig['file-recovery'] === false) return;
          if (cmd.id.startsWith('audio-recorder:') && corePluginsConfig['audio-recorder'] === false) return;
          if (cmd.id.startsWith('slides:') && corePluginsConfig['slides'] === false) return;
          if (cmd.id.startsWith('switcher:') && corePluginsConfig['switcher'] === false) return;
          if (cmd.id.startsWith('command-palette:') && corePluginsConfig['command-palette'] === false) return;

          e.preventDefault();
          cmd.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commands,
    hotkeysConfig,
    corePluginsConfig,
    isGraphViewActive,
    isPresentationOpen,
    activePane,
    activeTab,
    handleCloseTabInPane
  ]);

  if (!isVaultLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121214] text-zinc-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          <span>Loading Obsidian Vault from disk...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#18181b] text-zinc-100 font-sans">
      {/* Main Row: Sidebar + Workspace + Inspector */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* 1. Left Sidebar (Ribbon + File Explorer / Search / Bookmarks / Tags) */}
      {isSidebarOpen && (
        <Sidebar
          files={files}
          folders={folders}
          bookmarks={bookmarks}
          activeFilePath={activeFilePath}
          activeSidebarTab={activeSidebarTab}
          isDarkTheme={isDarkTheme}
          vaultName={vaultName}
          isRecordingAudio={isRecordingAudio}
          corePluginsConfig={corePluginsConfig}
          onSelectTab={setActiveSidebarTab}
          onSelectFile={handleSelectFile}
          onSplitFile={filePath => handleSplitPaneRight(filePath)}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onDuplicateFile={handleDuplicateFile}
          onToggleBookmark={handleToggleBookmark}
          onOpenDailyNote={handleOpenDailyNote}
          onOpenRandomNote={handleOpenRandomNote}
          onCreateZkNote={handleCreateZkNote}
          onToggleAudioRecording={handleToggleAudioRecording}
          onOpenVaultManager={() => setIsVaultModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenFileRecovery={() => setIsRecoveryModalOpen(true)}
          onToggleGraphView={() => setIsGraphViewActive(prev => !prev)}
          onExportZip={() => vault.exportAsZip()}
          onExportPdf={filePath => {
            const f = vault.getFileByPath(filePath);
            if (f) {
              setPdfTargetFile(f);
              setIsPdfModalOpen(true);
            }
          }}
          onToggleTheme={() => {
            const nextTheme = isDarkTheme ? 'moonstone' : 'obsidian';
            setIsDarkTheme(!isDarkTheme);
            vault.saveConfig('appearance', { ...appearanceConfig, theme: nextTheme });
          }}
          searchFilter={searchFilter}
          onSearchChange={setSearchFilter}
        />
      )}

      {/* 2. Main Center Workspace (Supports Split Panes) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Main Workspace Body: Fullscreen Graph OR Split Panes */}
        <div className="flex-1 flex overflow-hidden relative">
          {isGraphViewActive ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <TabBar
                tabs={[{ id: 'tab-graph', filePath: 'Interactive Graph', isPinned: true, viewMode: 'live' }]}
                activeTabId="tab-graph"
                files={files}
                isPrimary={true}
                isSidebarOpen={isSidebarOpen}
                isInspectorOpen={false}
                isZenMode={isZenMode}
                onSelectTab={() => setIsGraphViewActive(false)}
                onCloseTab={() => setIsGraphViewActive(false)}
                onNewTab={() => {
                  setIsGraphViewActive(false);
                  handleNewTabInPane(activePaneId);
                }}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                onToggleZenMode={handleToggleZenMode}
                onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onToggleGraph={() => setIsGraphViewActive(false)}
              />
              <div className="flex-1 overflow-hidden relative">
                <GraphView
                  data={graphData}
                  activeFileId={activeFilePath}
                  onSelectNode={filePath => {
                    handleNavigateLink(filePath);
                    setIsGraphViewActive(false);
                  }}
                  isMini={false}
                  initialSettings={graphConfig}
                  onSettingsChange={settings => {
                    setGraphConfig(settings);
                    vault.saveConfig('graph', settings);
                  }}
                  onClose={() => setIsGraphViewActive(false)}
                  onSplitRight={filePath => {
                    setIsGraphViewActive(false);
                    handleSplitPaneRight(filePath);
                  }}
                />
              </div>
            </div>
          ) : (
            panes.map((pane, idx) => {
              const currentPaneTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
              const paneFile = files.find(f => f.path === currentPaneTab?.filePath);
              const paneMeta = paneFile ? graphIndexer.getMetadata(paneFile.path) : undefined;
              const paneBacklinks = paneFile ? graphIndexer.getBacklinks(paneFile.path) : [];
              const isPaneActive = pane.id === activePaneId;

              return (
                <div
                  key={pane.id}
                  onClick={() => setActivePaneId(pane.id)}
                  className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
                    idx > 0 ? 'border-l border-zinc-800' : ''
                  } ${panes.length > 1 && isPaneActive ? 'ring-1 ring-inset ring-purple-500/30' : ''}`}
                >
                  <TabBar
                    tabs={pane.tabs}
                    activeTabId={pane.activeTabId}
                    files={files}
                    isPrimary={idx === 0}
                    isSidebarOpen={isSidebarOpen}
                    isInspectorOpen={isInspectorOpen}
                    isZenMode={isZenMode}
                    activeViewMode={currentPaneTab?.viewMode || 'live'}
                    onSelectTab={tabId => handleSelectTabInPane(pane.id, tabId)}
                    onCloseTab={tabId => handleCloseTabInPane(pane.id, tabId)}
                    onNewTab={() => handleNewTabInPane(pane.id)}
                    onSplitRight={handleSplitPaneRight}
                    onClosePane={() => handleClosePane(pane.id)}
                    canClosePane={panes.length > 1}
                    onExportPdf={() => {
                      if (paneFile) {
                        setPdfTargetFile(paneFile);
                        setIsPdfModalOpen(true);
                      }
                    }}
                    onFindReplace={() => setFindReplacePaneId(pane.id)}
                    onToggleViewMode={mode =>
                      mode ? handleViewModeChangeInPane(pane.id, mode) : handleCycleActiveViewMode()
                    }
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
                    onToggleZenMode={handleToggleZenMode}
                    onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
                    onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                    onOpenTemplates={() => setIsTemplateModalOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenSlides={() => setIsPresentationOpen(true)}
                    onToggleGraph={() => setIsGraphViewActive(prev => !prev)}
                  />

                  <div className="flex-1 overflow-hidden relative">
                    {!paneFile ? (
                      <div className="flex items-center justify-center h-full text-zinc-500 text-sm select-none">
                        No file open. Press Ctrl+O to open a note or canvas.
                      </div>
                    ) : paneFile.extension === 'canvas' ? (
                      <CanvasView
                        file={paneFile}
                        allFiles={files}
                        onSaveContent={content => handleContentChange(paneFile.path, content)}
                        onNavigateFile={target => handleSelectFile(target, pane.id)}
                      />
                    ) : (
                      <Editor
                        file={paneFile}
                        allFiles={files}
                        metadata={paneMeta}
                        backlinks={paneBacklinks}
                        viewMode={currentPaneTab?.viewMode || 'live'}
                        showLineNumbers={appConfig.showLineNumber !== false}
                        showFrontmatter={appConfig.showFrontmatter !== false}
                        foldHeading={appConfig.foldHeading !== false}
                        findReplaceOpen={findReplacePaneId === pane.id}
                        isBookmarked={bookmarks.some(b => b.path === paneFile.path)}
                        onCloseFindReplace={() => setFindReplacePaneId(null)}
                        onViewModeChange={mode => handleViewModeChangeInPane(pane.id, mode)}
                        onContentChange={content => handleContentChange(paneFile.path, content)}
                        onNavigateLink={handleNavigateLink}
                        onTagClick={tag => {
                          setSearchFilter(`tag:${tag}`);
                          setActiveSidebarTab('search');
                          setIsSidebarOpen(true);
                        }}
                        onStartPresentation={() => setIsPresentationOpen(true)}
                        onToggleBookmark={() => handleToggleBookmark(paneFile.path, paneFile.name.replace(/\.md$/, ''))}
                        onCopyNoteLink={() => {
                          navigator.clipboard.writeText(`[[${paneFile.name.replace(/\.md$/, '')}]]`);
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Right Inspector (Backlinks, Outgoing Links, Outline, Local Graph) */}
      {isInspectorOpen && !isGraphViewActive && activeFile && (
        <Inspector
          activeFile={activeFile}
          metadata={activeMetadata}
          backlinks={activeBacklinks}
          unlinkedMentions={activeUnlinkedMentions}
          graphData={graphData}
          corePluginsConfig={corePluginsConfig}
          onNavigateFile={handleNavigateLink}
          onLinkMention={handleLinkMention}
        />
      )}
      </div>

      {/* 4. Bottom Native Status Bar */}
      <StatusBar
        vaultName={vaultName}
        totalNotesCount={files.filter(f => f.extension === 'md').length}
        totalCanvasesCount={files.filter(f => f.extension === 'canvas').length}
        activeFile={activeFile}
        activeViewMode={activeTab?.viewMode || 'live'}
        backlinksCount={activeBacklinks.length}
        isGraphActive={isGraphViewActive}
        graphStats={{ nodesCount: graphData.nodes.length, edgesCount: graphData.edges.length }}
        canvasStats={activeCanvasStats}
        isZenMode={isZenMode}
        showWordCount={corePluginsConfig['word-count'] !== false}
        showBacklinks={corePluginsConfig['backlink'] !== false}
        onOpenVaultSwitcher={() => setIsVaultModalOpen(true)}
        onCycleViewMode={handleCycleActiveViewMode}
        onOpenBacklinks={() => setIsInspectorOpen(true)}
      />

      {/* Quick Switcher Modal (Ctrl+O) */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        files={files}
        recentPaths={recentPaths}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={handleSelectFile}
        onSplitFile={filePath => handleSplitPaneRight(filePath)}
        onCreateFile={title => handleCreateFile('', 'md', title)}
      />

      {/* Command Palette Modal (Ctrl+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={enabledCommands}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Settings Modal (Ctrl+,) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appConfig={appConfig}
        appearanceConfig={appearanceConfig}
        corePluginsConfig={corePluginsConfig}
        hotkeysConfig={hotkeysConfig}
        vaultPath={vaultPath}
        files={files}
        commands={commands}
        onSaveAppConfig={cfg => {
          setAppConfig(cfg);
          vault.saveConfig('app', cfg);
        }}
        onSaveAppearanceConfig={cfg => {
          setAppearanceConfig(cfg);
          setIsDarkTheme(cfg.theme !== 'moonstone');
          vault.saveConfig('appearance', cfg);
        }}
        onSaveCorePluginsConfig={cfg => {
          setCorePluginsConfig(cfg);
          vault.saveConfig('core-plugins', cfg);
        }}
        onSaveHotkeysConfig={cfg => {
          setHotkeysConfig(cfg);
          vault.saveConfig('hotkeys', cfg);
        }}
        onOpenFileRecoveryModal={() => setIsRecoveryModalOpen(true)}
        onLoadWorkspace={handleLoadWorkspace}
        onSaveCurrentWorkspace={handleSaveWorkspace}
      />

      {/* Export to PDF Modal */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        file={pdfTargetFile || activeFile}
      />

      {/* Vault Switcher & Manager Modal */}
      <VaultSwitcherModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        knownVaults={knownVaults}
        activeVaultPath={vaultPath}
        onOpenVault={async targetPath => {
          await vault.openVault(targetPath, false);
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onCreateVault={async targetPath => {
          await vault.openVault(targetPath, true);
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onResetSandbox={async () => {
          await vault.resetSandboxVault();
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onRemoveVault={async targetPath => {
          await vault.removeVaultFromList(targetPath);
          syncFromVaultManager();
        }}
      />

      {/* File Recovery Modal */}
      <FileRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        activeFilePath={activeFilePath}
        onRestoreSnapshot={async (path, content) => {
          await handleContentChange(path, content);
          handleSelectFile(path);
        }}
      />

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        files={files}
        onSelectTemplate={handleInsertTemplate}
      />

      {/* Fullscreen Slide Deck Presentation */}
      {activeFile && (
        <SlideDeck
          file={activeFile}
          isOpen={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          onNavigateLink={handleNavigateLink}
        />
      )}

      {/* Vault Switcher & Manager Modal */}
      <VaultSwitcherModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        knownVaults={knownVaults}
        activeVaultPath={vaultPath}
        onOpenVault={async targetPath => {
          await vault.openVault(targetPath, false);
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onCreateVault={async targetPath => {
          await vault.openVault(targetPath, true);
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onResetSandbox={async () => {
          await vault.resetSandboxVault();
          syncFromVaultManager();
          setIsVaultModalOpen(false);
        }}
        onRemoveVault={async targetPath => {
          await vault.removeVaultFromList(targetPath);
          syncFromVaultManager();
        }}
      />

      {/* File Recovery Modal */}
      <FileRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        activeFilePath={activeFilePath}
        onRestoreSnapshot={async (path, content) => {
          await handleContentChange(path, content);
          handleSelectFile(path);
        }}
      />

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        files={files}
        onSelectTemplate={handleInsertTemplate}
      />

      {/* Fullscreen Slide Deck Presentation */}
      {activeFile && (
        <SlideDeck
          file={activeFile}
          isOpen={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          onNavigateLink={handleNavigateLink}
        />
      )}
    </div>
  );
};

export default App;
