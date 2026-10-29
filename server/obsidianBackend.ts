import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { exec, execSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import JSZip from 'jszip';
import { RAGEngine } from './rag/ragEngine';
import { VaultMCPServer } from './rag/mcpServer';

export interface VaultEntry {
  id: string;
  path: string;
  name: string;
  ts: number;
  open: boolean;
  noteCount?: number;
}

export interface DiskFileEntry {
  id: string;
  name: string;
  path: string;
  folder: string;
  extension: string;
  content: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  isBinary?: boolean;
}

export interface FileRecoverySnapshot {
  id: string;
  path: string;
  timestamp: number;
  size: number;
}

export interface ObsidianServerOptions {
  rootDir?: string;
  defaultVaultDir?: string;
  sandboxTemplateDir?: string;
}

const DEFAULT_CONFIGS: Record<string, any> = {
  'app': {
    vimMode: false,
    showLineNumber: true,
    spellcheck: true,
    readableLineLength: true,
    strictLineBreaks: false,
    showFrontmatter: true,
    foldHeading: true,
    foldIndent: true,
    defaultViewMode: 'live',
    livePreview: true,
    attachmentFolderPath: 'Attachments',
    newFileLocation: 'root',
    newFileFolderPath: '',
    alwaysUpdateLinks: true,
    trashOption: 'local',
    promptDelete: false
  },
  'appearance': {
    baseFontSize: 16,
    theme: 'moonstone',
    translucency: false,
    cssTheme: '',
    showViewHeader: true,
    nativeMenus: false
  },
  'core-plugins': {
    'file-explorer': true,
    'global-search': true,
    'switcher': true,
    'graph': true,
    'backlink': true,
    'canvas': true,
    'outgoing-link': true,
    'tag-pane': true,
    'properties': true,
    'page-preview': true,
    'daily-notes': true,
    'templates': true,
    'note-composer': true,
    'command-palette': true,
    'slash-command': true,
    'editor-status': true,
    'bookmarks': true,
    'markdown-importer': false,
    'zk-prefixer': true,
    'random-note': true,
    'outline': true,
    'word-count': true,
    'slides': true,
    'audio-recorder': true,
    'workspaces': true,
    'file-recovery': true,
    'publish': false,
    'sync': false
  },
  'bookmarks': {
    items: [
      { type: 'file', path: 'Start here.md', title: 'Start here' },
      { type: 'file', path: 'Obsidian Architecture.canvas', title: 'Obsidian Architecture' },
      { type: 'file', path: 'Vault is just a local folder.md', title: 'Vault is just a local folder' }
    ]
  },
  'graph': {
    'collapse-filter': false,
    search: '',
    showTags: false,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true,
    'collapse-color-groups': false,
    colorGroups: [
      { query: 'path:Formatting', color: '#2563eb' },
      { query: 'path:Guides', color: '#0284c7' },
      { query: 'path:Adventurer', color: '#6366f1' },
      { query: 'path:Templates', color: '#4f46e5' },
      { query: 'path:Daily', color: '#3b82f6' }
    ],
    'collapse-display': false,
    showArrow: true,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1,
    lineSizeMultiplier: 1,
    'collapse-forces': false,
    centerStrength: 0.35,
    repelStrength: 10,
    linkStrength: 1,
    linkDistance: 160
  },
  'daily-notes': {
    folder: 'Daily',
    format: 'YYYY-MM-DD',
    template: 'Templates/Daily Note Template.md',
    autorun: false
  },
  'templates': {
    folder: 'Templates',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm'
  },
  'zk-prefixer': {
    folder: '',
    format: 'YYYYMMDDHHmm',
    template: 'Templates/Zettelkasten Note.md'
  },
  'hotkeys': {},
  'workspaces': {
    active: 'default',
    workspaces: {}
  },
  'workspace': {
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    activeLeftTab: 'files',
    activeRightTab: 'backlinks',
    splitDirection: null,
    panes: [
      {
        id: 'pane-main',
        tabs: [
          { id: 'tab-initial', filePath: 'Start here.md', viewMode: 'live', isPinned: false }
        ],
        activeTabId: 'tab-initial'
      }
    ],
    activePaneId: 'pane-main',
    lastOpenFiles: ['Start here.md'],
    history: {
      stack: ['Start here.md'],
      index: 0
    },
    fileExplorer: {
      sortOrder: 'name-asc',
      collapsedFolders: {},
      activeFilter: 'all'
    }
  }
};

function copyDirectoryRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(s, d);
    } else if (!fs.existsSync(d)) {
      fs.copyFileSync(s, d);
    }
  }
}

export class ObsidianVaultServer {
  private rootDir: string;
  private globalConfigPath: string;
  private sandboxTemplateDir: string;
  private defaultVaultDir: string;
  private activeVaultPath: string;
  private watchers: Set<ServerResponse> = new Set();
  private fsWatcher: fs.FSWatcher | null = null;
  private suppressWatchUntil: number = 0;
  private currentServerPort: number = 5175;
  private ragEngine!: RAGEngine;
  private mcpServer!: VaultMCPServer;
  private ragIndexTimers = new Map<string, NodeJS.Timeout>();

  constructor(options?: ObsidianServerOptions) {
    this.rootDir = options?.rootDir || process.env.RUNAGON_ROOT_DIR || process.env.OBSIDIAN_ROOT_DIR || process.cwd();
    this.globalConfigPath = path.join(this.rootDir, '.obsidian-global.json');
    this.defaultVaultDir = options?.defaultVaultDir || process.env.RUNAGON_DEFAULT_VAULT_DIR || process.env.OBSIDIAN_DEFAULT_VAULT_DIR || path.join(this.rootDir, 'vault');
    this.sandboxTemplateDir = options?.sandboxTemplateDir || process.env.RUNAGON_SANDBOX_DIR || process.env.OBSIDIAN_SANDBOX_DIR || path.join(process.cwd(), 'resources', 'sandbox');
    this.activeVaultPath = this.defaultVaultDir;

    this.initGlobalRegistry();
    this.ensureVaultInitialized(this.activeVaultPath);
    this.initRAG();
    this.startWatchingVault();
  }

  private initRAG() {
    let aiConfig = {};
    const configPath = path.join(this.activeVaultPath, '.obsidian', 'ai-config.json');
    if (fs.existsSync(configPath)) {
      try {
        aiConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {}
    }
    this.ragEngine = new RAGEngine(this.activeVaultPath, aiConfig);
    this.mcpServer = new VaultMCPServer(this.ragEngine);
    // Background incremental sync of vault markdown files
    this.syncVaultRAG().catch(err => {
      console.warn('Initial RAG vault sync error:', err);
    });
  }

  public async syncVaultRAG(force = false) {
    try {
      this.ragEngine.setIndexingStatus(true);
      const { files } = this.scanVault();
      const mdFiles = files.filter(f => f.extension === 'md' && !f.isBinary);
      let count = 0;
      for (const file of mdFiles) {
        count++;
        this.ragEngine.setIndexingStatus(true, mdFiles.length - count);
        await this.ragEngine.getVectorStore().indexFile(file.path, file.content, file.updatedAt, force);
        // Non-blocking yield to keep event loop and UI smooth
        await new Promise(resolve => setImmediate(resolve));
      }
    } catch (err) {
      console.warn('Error syncing vault RAG:', err);
    } finally {
      this.ragEngine.setIndexingStatus(false, 0);
    }
  }

  private initGlobalRegistry() {
    let globalData: { vaults: Record<string, { path: string; ts: number; open?: boolean }> } = { vaults: {} };
    if (fs.existsSync(this.globalConfigPath)) {
      try {
        globalData = JSON.parse(fs.readFileSync(this.globalConfigPath, 'utf8'));
      } catch {
        globalData = { vaults: {} };
      }
    }

    const entries = Object.entries(globalData.vaults || {});
    const openEntry = entries.find(([, v]) => v.open && fs.existsSync(v.path));
    if (openEntry) {
      this.activeVaultPath = openEntry[1].path;
    } else {
      if (!fs.existsSync(this.defaultVaultDir)) {
        fs.mkdirSync(this.defaultVaultDir, { recursive: true });
        copyDirectoryRecursive(this.sandboxTemplateDir, this.defaultVaultDir);
      }
      const id = crypto.createHash('md5').update(this.defaultVaultDir).digest('hex').slice(0, 16);
      globalData.vaults[id] = {
        path: this.defaultVaultDir,
        ts: Date.now(),
        open: true
      };
      this.activeVaultPath = this.defaultVaultDir;
      fs.writeFileSync(this.globalConfigPath, JSON.stringify(globalData, null, 2));
    }
  }

  public getKnownVaults(): VaultEntry[] {
    try {
      const raw = JSON.parse(fs.readFileSync(this.globalConfigPath, 'utf8'));
      return Object.entries(raw.vaults || {}).map(([id, v]: [string, any]) => {
        let noteCount = 0;
        if (fs.existsSync(v.path)) {
          try {
            const countNotes = (dir: string): number => {
              let total = 0;
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const e of entries) {
                if (e.name.startsWith('.')) continue;
                if (e.isDirectory()) total += countNotes(path.join(dir, e.name));
                else if (e.name.endsWith('.md') || e.name.endsWith('.canvas')) total += 1;
              }
              return total;
            };
            noteCount = countNotes(v.path);
          } catch {}
        }
        return {
          id,
          path: v.path,
          name: path.basename(v.path),
          ts: v.ts || Date.now(),
          open: v.path === this.activeVaultPath,
          noteCount
        };
      });
    } catch {
      return [{
        id: 'default',
        path: this.activeVaultPath,
        name: path.basename(this.activeVaultPath),
        ts: Date.now(),
        open: true,
        noteCount: 0
      }];
    }
  }

  private saveKnownVaults(vaults: VaultEntry[]) {
    const obj: Record<string, { path: string; ts: number; open: boolean }> = {};
    for (const v of vaults) {
      obj[v.id] = { path: v.path, ts: v.ts, open: v.path === this.activeVaultPath };
    }
    fs.writeFileSync(this.globalConfigPath, JSON.stringify({ vaults: obj }, null, 2));
  }

  public ensureVaultInitialized(vaultPath: string) {
    fs.mkdirSync(vaultPath, { recursive: true });
    const obsidianDir = path.join(vaultPath, '.obsidian');
    fs.mkdirSync(obsidianDir, { recursive: true });
    fs.mkdirSync(path.join(obsidianDir, 'file-recovery'), { recursive: true });

    for (const [configName, defaultVal] of Object.entries(DEFAULT_CONFIGS)) {
      const cfgPath = path.join(obsidianDir, `${configName}.json`);
      if (!fs.existsSync(cfgPath)) {
        fs.writeFileSync(cfgPath, JSON.stringify(defaultVal, null, 2));
      }
    }
  }

  private sseDebounceTimer: NodeJS.Timeout | null = null;

  public startWatchingVault() {
    if (this.fsWatcher) {
      try {
        this.fsWatcher.close();
      } catch {}
      this.fsWatcher = null;
    }

    try {
      this.fsWatcher = fs.watch(this.activeVaultPath, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        const normalized = filename.replace(/\\/g, '/');
        // Ignore internal obsidian config files, trash, git, and backups from watch loop
        if (
          normalized.startsWith('.obsidian') || 
          normalized.startsWith('.git') || 
          normalized.startsWith('.trash') ||
          normalized.endsWith('.bak')
        ) return;
        if (Date.now() < this.suppressWatchUntil) return;

        if (this.sseDebounceTimer) {
          clearTimeout(this.sseDebounceTimer);
        }
        this.sseDebounceTimer = setTimeout(() => {
          this.broadcastSSE({ type: 'vault-changed', path: normalized, ts: Date.now() });
          if (normalized.endsWith('.md') && this.ragEngine) {
            const abs = path.join(this.activeVaultPath, normalized);
            if (fs.existsSync(abs)) {
              try {
                const stat = fs.statSync(abs);
                if (stat.isFile() && stat.size < 5 * 1024 * 1024) {
                  const content = fs.readFileSync(abs, 'utf8');
                  this.ragEngine.getVectorStore().indexFile(normalized, content, stat.mtimeMs).catch(() => {});
                }
              } catch {}
            } else {
              this.ragEngine.getVectorStore().removeFile(normalized);
            }
          }
        }, 300);
      });
    } catch (e) {
      console.warn('fs.watch warning:', e);
    }
  }

  private broadcastSSE(payload: any) {
    const msg = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of this.watchers) {
      try {
        res.write(msg);
      } catch {
        this.watchers.delete(res);
      }
    }
  }

  private safeJoinVault(relPath: string): string {
    const cleaned = relPath.replace(/^\/+/, '').replace(/\.\./g, '');
    const resolved = path.resolve(this.activeVaultPath, cleaned);
    if (!resolved.startsWith(path.resolve(this.activeVaultPath))) {
      throw new Error('Path traversal outside vault is not permitted');
    }
    return resolved;
  }

  public scanVault(): { files: DiskFileEntry[]; folders: string[] } {
    const files: DiskFileEntry[] = [];
    const folders: Set<string> = new Set();

    const walk = (dir: string, relDir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // skip .obsidian, .trash, .DS_Store, .git
        if (entry.name === 'node_modules') continue;

        const absPath = path.join(dir, entry.name);
        const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          folders.add(relPath);
          walk(absPath, relPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          const stat = fs.statSync(absPath);
          const isText = ['md', 'canvas', 'txt', 'json', 'css', 'csv', 'yaml', 'yml'].includes(ext);
          const isSupportedBinary = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'webm', 'mp3', 'wav', 'ogg', 'pdf'].includes(ext);

          if (!isText && !isSupportedBinary) continue;

          let content = '';
          if (isText && stat.size < 5 * 1024 * 1024) {
            try {
              content = fs.readFileSync(absPath, 'utf8');
            } catch {
              content = '';
            }
          }

          files.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            folder: relDir,
            extension: ext,
            content,
            size: stat.size,
            createdAt: stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs,
            updatedAt: stat.mtimeMs,
            isBinary: !isText
          });
        }
      }
    };

    walk(this.activeVaultPath, '');
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, folders: Array.from(folders).sort() };
  }

  public getAllConfigs(): Record<string, any> {
    const obsidianDir = path.join(this.activeVaultPath, '.obsidian');
    const result: Record<string, any> = {};
    for (const key of Object.keys(DEFAULT_CONFIGS)) {
      const p = path.join(obsidianDir, `${key}.json`);
      if (fs.existsSync(p)) {
        try {
          result[key] = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch {
          result[key] = DEFAULT_CONFIGS[key];
        }
      } else {
        result[key] = DEFAULT_CONFIGS[key];
      }
    }
    return result;
  }

  public saveConfig(name: string, data: any) {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    const obsidianDir = path.join(this.activeVaultPath, '.obsidian');
    fs.mkdirSync(obsidianDir, { recursive: true });
    this.suppressWatchUntil = Date.now() + 2000;
    fs.writeFileSync(path.join(obsidianDir, `${safeName}.json`), JSON.stringify(data, null, 2));
  }

  public searchVaultFiles(query: string): { results: any[]; totalMatches: number } {
    const q = query.trim();
    if (!q) return { results: [], totalMatches: 0 };

    const { files } = this.scanVault();
    const lower = q.toLowerCase();
    const results: any[] = [];
    let grandTotalMatches = 0;

    const isPathFilter = lower.startsWith('path:');
    const isFileFilter = lower.startsWith('file:');
    const isTagFilter = lower.startsWith('tag:');

    let targetTerm = lower;
    if (isPathFilter) targetTerm = lower.slice(5).trim();
    else if (isFileFilter) targetTerm = lower.slice(5).trim();
    else if (isTagFilter) targetTerm = lower.slice(4).trim().replace(/^#/, '');

    for (const file of files) {
      if (file.isBinary) continue;

      const fileLowerName = file.name.toLowerCase();
      const fileLowerPath = file.path.toLowerCase();
      const fileContent = file.content || '';
      const lines = fileContent.split('\n');
      const matches: Array<{ line: number; text: string; matchText: string }> = [];

      if (isPathFilter) {
        if (!fileLowerPath.includes(targetTerm)) continue;
      } else if (isFileFilter) {
        if (!fileLowerName.includes(targetTerm)) continue;
      } else if (isTagFilter) {
        const tagRegex = new RegExp(`(?:^|\\s)#${targetTerm}\\b`, 'i');
        lines.forEach((lineText, idx) => {
          if (tagRegex.test(lineText)) {
            matches.push({
              line: idx + 1,
              text: lineText.trim().slice(0, 120),
              matchText: `#${targetTerm}`
            });
          }
        });
        if (matches.length === 0 && !fileLowerName.includes(targetTerm)) continue;
      } else {
        // General text search
        const termRegex = new RegExp(targetTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        lines.forEach((lineText, idx) => {
          if (termRegex.test(lineText)) {
            matches.push({
              line: idx + 1,
              text: lineText.trim().slice(0, 120),
              matchText: q
            });
          }
        });
      }

      const pathMatched = isPathFilter && fileLowerPath.includes(targetTerm);
      const fileFilterMatched = isFileFilter && fileLowerName.includes(targetTerm);
      const nameMatched = !isPathFilter && fileLowerName.includes(targetTerm);

      if (matches.length > 0 || nameMatched || pathMatched || fileFilterMatched) {
        grandTotalMatches += Math.max(matches.length, 1);
        results.push({
          path: file.path,
          name: file.name,
          folder: file.folder,
          extension: file.extension,
          size: file.size,
          updatedAt: file.updatedAt,
          matches: matches.slice(0, 10),
          totalMatches: matches.length
        });
      }
    }

    // Sort by relevance (file name matches or highest match counts first)
    results.sort((a, b) => {
      const aName = a.name.toLowerCase().includes(targetTerm) ? 100 : 0;
      const bName = b.name.toLowerCase().includes(targetTerm) ? 100 : 0;
      return (bName + b.totalMatches) - (aName + a.totalMatches);
    });

    return { results, totalMatches: grandTotalMatches };
  }

  public writeFile(relPath: string, content: string): DiskFileEntry {
    const absPath = this.safeJoinVault(relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    this.suppressWatchUntil = Date.now() + 2000;
    fs.writeFileSync(absPath, content, 'utf8');

    // Save snapshot in .obsidian/file-recovery if markdown/canvas
    this.recordFileRecoverySnapshot(relPath, content);

    // Auto-update RAG vector store with a 1200ms debounce to prevent CPU/battery drain during rapid typing
    if (relPath.endsWith('.md')) {
      const existing = this.ragIndexTimers.get(relPath);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.ragIndexTimers.delete(relPath);
        this.ragEngine.getVectorStore().indexFile(relPath, content).catch(err => {
          console.warn('RAG auto-index error:', err);
        });
      }, 1200);
      this.ragIndexTimers.set(relPath, timer);
    }

    const stat = fs.statSync(absPath);
    const ext = path.extname(relPath).slice(1).toLowerCase();
    const folder = path.dirname(relPath) === '.' ? '' : path.dirname(relPath).replace(/\\/g, '/');

    return {
      id: relPath,
      name: path.basename(relPath),
      path: relPath,
      folder,
      extension: ext,
      content,
      size: stat.size,
      createdAt: stat.birthtimeMs || stat.mtimeMs,
      updatedAt: stat.mtimeMs
    };
  }

  private recordFileRecoverySnapshot(relPath: string, content: string) {
    try {
      const recoveryDir = path.join(this.activeVaultPath, '.obsidian', 'file-recovery');
      fs.mkdirSync(recoveryDir, { recursive: true });
      const indexFile = path.join(recoveryDir, 'index.json');
      let list: Array<{ id: string; path: string; timestamp: number; size: number }> = [];
      if (fs.existsSync(indexFile)) {
        try {
          list = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        } catch {
          list = [];
        }
      }
      // Avoid creating a snapshot if the most recent snapshot for this file is < 15 seconds old
      const latestForFile = list.find(item => item.path === relPath);
      if (latestForFile && Date.now() - latestForFile.timestamp < 15000) {
        fs.writeFileSync(path.join(recoveryDir, `${latestForFile.id}.bak`), content, 'utf8');
        latestForFile.timestamp = Date.now();
        latestForFile.size = Buffer.byteLength(content, 'utf8');
        fs.writeFileSync(indexFile, JSON.stringify(list.slice(0, 100), null, 2));
        return;
      }

      const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      fs.writeFileSync(path.join(recoveryDir, `${id}.bak`), content, 'utf8');
      list.unshift({
        id,
        path: relPath,
        timestamp: Date.now(),
        size: Buffer.byteLength(content, 'utf8')
      });
      // Keep max 100 snapshots
      if (list.length > 100) {
        const removed = list.splice(100);
        for (const r of removed) {
          const bakPath = path.join(recoveryDir, `${r.id}.bak`);
          if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
        }
      }
      fs.writeFileSync(indexFile, JSON.stringify(list, null, 2));
    } catch {}
  }

  public getRecoverySnapshots(filterPath?: string): Array<FileRecoverySnapshot & { content?: string }> {
    const recoveryDir = path.join(this.activeVaultPath, '.obsidian', 'file-recovery');
    const indexFile = path.join(recoveryDir, 'index.json');
    if (!fs.existsSync(indexFile)) return [];
    try {
      let list: FileRecoverySnapshot[] = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      if (filterPath) {
        list = list.filter(i => i.path === filterPath);
      }
      return list.slice(0, 50).map(item => {
        const bakPath = path.join(recoveryDir, `${item.id}.bak`);
        const content = fs.existsSync(bakPath) ? fs.readFileSync(bakPath, 'utf8') : '';
        return { ...item, content };
      });
    } catch {
      return [];
    }
  }

  public clearRecoverySnapshots(): boolean {
    const recoveryDir = path.join(this.activeVaultPath, '.obsidian', 'file-recovery');
    if (!fs.existsSync(recoveryDir)) return true;
    try {
      const files = fs.readdirSync(recoveryDir);
      for (const f of files) {
        fs.unlinkSync(path.join(recoveryDir, f));
      }
      fs.writeFileSync(path.join(recoveryDir, 'index.json'), '[]', 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  public revealInSystemExplorer(relPath?: string) {
    const absPath = relPath ? this.safeJoinVault(relPath) : this.activeVaultPath;
    if (process.platform === 'darwin') {
      if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
        exec(`open "${absPath.replace(/"/g, '\\"')}"`);
      } else {
        exec(`open -R "${absPath.replace(/"/g, '\\"')}"`);
      }
    } else if (process.platform === 'win32') {
      if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
        exec(`explorer "${absPath.replace(/"/g, '\\"')}"`);
      } else {
        exec(`explorer /select,"${absPath.replace(/"/g, '\\"')}"`);
      }
    } else {
      const dir = fs.existsSync(absPath) && fs.statSync(absPath).isDirectory() ? absPath : path.dirname(absPath);
      exec(`xdg-open "${dir.replace(/"/g, '\\"')}"`);
    }
  }

  public openInDefaultApp(relPath: string) {
    const absPath = this.safeJoinVault(relPath);
    if (!fs.existsSync(absPath)) return;
    if (process.platform === 'darwin') {
      exec(`open "${absPath.replace(/"/g, '\\"')}"`);
    } else if (process.platform === 'win32') {
      exec(`start "" "${absPath.replace(/"/g, '\\"')}"`);
    } else {
      exec(`xdg-open "${absPath.replace(/"/g, '\\"')}"`);
    }
  }

  public renameFileOrFolder(oldRelPath: string, newRelPath: string): { newPath: string; updatedLinksCount: number } {
    const oldAbs = this.safeJoinVault(oldRelPath);
    const newAbs = this.safeJoinVault(newRelPath);
    if (!fs.existsSync(oldAbs)) {
      throw new Error(`Source path does not exist: ${oldRelPath}`);
    }
    fs.mkdirSync(path.dirname(newAbs), { recursive: true });
    this.suppressWatchUntil = Date.now() + 300;
    fs.renameSync(oldAbs, newAbs);

    // Check if alwaysUpdateLinks is enabled in app.json
    const configs = this.getAllConfigs();
    const alwaysUpdateLinks = configs.app?.alwaysUpdateLinks !== false;
    let updatedLinksCount = 0;

    if (alwaysUpdateLinks && (oldRelPath.endsWith('.md') || oldRelPath.endsWith('.canvas'))) {
      const oldBase = path.basename(oldRelPath).replace(/\.md$/, '');
      const newBase = path.basename(newRelPath).replace(/\.md$/, '');
      const oldPathNoExt = oldRelPath.replace(/\.md$/, '');
      const newPathNoExt = newRelPath.replace(/\.md$/, '');

      if (oldBase !== newBase || oldPathNoExt !== newPathNoExt) {
        const { files } = this.scanVault();
        const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkRe = new RegExp(
          `(!?\\[\\[)(?:${escapeRe(oldPathNoExt)}|${escapeRe(oldBase)})(#[^\\]|]+)?(\\|[^\\]]+)?(\\]\\])`,
          'g'
        );

        for (const f of files) {
          if (f.extension === 'md') {
            let matches = 0;
            const replaced = f.content.replace(linkRe, (_m, prefix, heading = '', alias = '', suffix) => {
              matches++;
              return `${prefix}${newBase}${heading}${alias}${suffix}`;
            });
            if (matches > 0) {
              updatedLinksCount += matches;
              fs.writeFileSync(this.safeJoinVault(f.path), replaced, 'utf8');
            }
          } else if (f.extension === 'canvas') {
            try {
              const canvasObj = JSON.parse(f.content);
              let changed = false;
              if (Array.isArray(canvasObj.nodes)) {
                for (const node of canvasObj.nodes) {
                  if (node.type === 'file' && node.file === oldRelPath) {
                    node.file = newRelPath;
                    changed = true;
                    updatedLinksCount++;
                  }
                }
              }
              if (changed) {
                fs.writeFileSync(this.safeJoinVault(f.path), JSON.stringify(canvasObj, null, 2), 'utf8');
              }
            } catch {}
          }
        }
      }
    }

    if (oldRelPath.endsWith('.md')) {
      this.ragEngine.getVectorStore().renameFile(oldRelPath, newRelPath);
    } else {
      // If folder or directory, cascade rename throughout vector store and graph links
      this.ragEngine.getVectorStore().renameFolder(oldRelPath, newRelPath);
    }

    return { newPath: newRelPath, updatedLinksCount };
  }

  public deleteFileOrFolder(relPath: string): boolean {
    const absPath = this.safeJoinVault(relPath);
    if (!fs.existsSync(absPath)) return false;
    this.suppressWatchUntil = Date.now() + 250;

    const configs = this.getAllConfigs();
    const trashOption = configs.app?.trashOption || 'local';

    if (relPath.endsWith('.md')) {
      this.ragEngine.getVectorStore().removeFile(relPath);
    } else {
      // If folder or directory, remove all indexed chunks and manifest entries
      this.ragEngine.getVectorStore().removeFolder(relPath);
    }

    if (trashOption === 'local') {
      const trashDir = path.join(this.activeVaultPath, '.trash');
      fs.mkdirSync(trashDir, { recursive: true });
      const destTrash = path.join(trashDir, `${Date.now()}_${path.basename(relPath)}`);
      fs.renameSync(absPath, destTrash);
    } else {
      fs.rmSync(absPath, { recursive: true, force: true });
    }
    return true;
  }

  public switchVault(targetVaultPath: string, copySandbox: boolean = false): string {
    const resolved = path.resolve(targetVaultPath);
    fs.mkdirSync(resolved, { recursive: true });
    if (copySandbox) {
      copyDirectoryRecursive(this.sandboxTemplateDir, resolved);
    }
    this.ensureVaultInitialized(resolved);
    this.activeVaultPath = resolved;

    const vaults = this.getKnownVaults();
    const id = crypto.createHash('md5').update(resolved).digest('hex').slice(0, 16);
    const existing = vaults.find(v => v.path === resolved);
    if (existing) {
      existing.ts = Date.now();
      existing.open = true;
    } else {
      vaults.push({
        id,
        path: resolved,
        name: path.basename(resolved),
        ts: Date.now(),
        open: true
      });
    }
    this.saveKnownVaults(vaults);
    this.initRAG();
    this.startWatchingVault();
    return this.activeVaultPath;
  }

  public resetSandboxVault(): string {
    // Recreate sandbox files inside the current or default sandbox vault
    copyDirectoryRecursive(this.sandboxTemplateDir, this.activeVaultPath);
    this.ensureVaultInitialized(this.activeVaultPath);
    return this.activeVaultPath;
  }

  public getClaudeConfigPath(): string {
    const home = os.homedir();
    if (process.platform === 'darwin') {
      return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    }
    return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }

  public getNodeBinary(): string {
    // 1. Try finding active node in PATH via which/where
    try {
      const cmd = process.platform === 'win32' ? 'where.exe node' : 'which node';
      const output = execSync(cmd, { encoding: 'utf8', timeout: 1000 }).trim().split('\n')[0].trim();
      if (output && fs.existsSync(output)) return output;
    } catch {}

    // 2. If running under normal Node, process.execPath is the exact node binary
    if (process.execPath && !process.execPath.toLowerCase().includes('electron') && !process.execPath.toLowerCase().includes('runagon') && !process.execPath.toLowerCase().includes('obsidian')) {
      return process.execPath;
    }

    // 3. Check known directories
    const candidates = [
      path.join(os.homedir(), '.local', 'bin', 'node'),
      '/opt/homebrew/bin/node',
      '/usr/local/bin/node',
      '/usr/bin/node',
      'C:\\Program Files\\nodejs\\node.exe'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'node';
  }

  public getBridgeScriptPath(): string {
    const repoBridge = path.resolve(__dirname, 'rag', 'mcpBridge.cjs');
    if (fs.existsSync(repoBridge)) return repoBridge;

    const vaultBridge = path.join(this.activeVaultPath, '.obsidian', 'mcpBridge.cjs');
    return vaultBridge;
  }

  public handleRequest(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const urlStr = req.url || '';
    if (!urlStr.startsWith('/api/vault')) {
      return next();
    }

    const host = req.headers.host || '127.0.0.1:5175';
    if (host.includes(':')) {
      const p = parseInt(host.split(':')[1], 10);
      if (!isNaN(p) && p !== this.currentServerPort) {
        this.currentServerPort = p;
        try {
          const portFile = path.join(this.activeVaultPath, '.obsidian', 'active-port');
          fs.writeFileSync(portFile, String(p), 'utf8');
        } catch {}
      }
    }

    const parsedUrl = new URL(urlStr, 'http://localhost');
    const pathname = parsedUrl.pathname;

    // SSE real-time watcher endpoint
    if (pathname === '/api/vault/watch' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ type: 'connected', vaultPath: this.activeVaultPath })}\n\n`);
      this.watchers.add(res);
      req.on('close', () => {
        this.watchers.delete(res);
      });
      return;
    }

    // Serve raw binary/attachment files from the vault
    if (pathname === '/api/vault/raw' && (req.method === 'GET' || req.method === 'HEAD')) {
      const relPath = parsedUrl.searchParams.get('path') || '';
      try {
        const absPath = this.safeJoinVault(relPath);
        if (!fs.existsSync(absPath)) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(absPath).slice(1).toLowerCase();
        const mimeMap: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          svg: 'image/svg+xml',
          webp: 'image/webp',
          bmp: 'image/bmp',
          ico: 'image/x-icon',
          webm: 'video/webm',
          mp4: 'video/mp4',
          mov: 'video/quicktime',
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          ogg: 'audio/ogg',
          m4a: 'audio/mp4',
          pdf: 'application/pdf'
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
        fs.createReadStream(absPath).pipe(res);
      } catch (e: any) {
        res.writeHead(400);
        res.end(e.message);
      }
      return;
    }

    // Read JSON body helper
    const readJsonBody = (): Promise<any> =>
      new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            resolve(raw ? JSON.parse(raw) : {});
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });

    const sendJson = (status: number, data: any) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    (async () => {
      try {
        if (pathname === '/api/vault/state' && req.method === 'GET') {
          const { files, folders } = this.scanVault();
          const configs = this.getAllConfigs();
          const vaults = this.getKnownVaults();
          return sendJson(200, {
            vaultPath: this.activeVaultPath,
            vaultName: path.basename(this.activeVaultPath),
            vaults,
            files,
            folders,
            configs
          });
        }

        if (pathname === '/api/vault/config' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.name || body.data === undefined) {
            return sendJson(400, { error: 'Missing config name or data' });
          }
          this.saveConfig(body.name, body.data);
          return sendJson(200, { ok: true });
        }

        if (pathname === '/api/vault/file/write' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path || typeof body.content !== 'string') {
            return sendJson(400, { error: 'Missing path or content' });
          }
          const entry = this.writeFile(body.path, body.content);
          return sendJson(200, { ok: true, file: entry });
        }

        if (pathname === '/api/vault/file/binary' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path || !body.base64) {
            return sendJson(400, { error: 'Missing path or base64 data' });
          }
          const absPath = this.safeJoinVault(body.path);
          fs.mkdirSync(path.dirname(absPath), { recursive: true });
          this.suppressWatchUntil = Date.now() + 250;
          fs.writeFileSync(absPath, Buffer.from(body.base64, 'base64'));
          return sendJson(200, { ok: true, path: body.path });
        }

        if (pathname === '/api/vault/file/raw' && req.method === 'GET') {
          const filePath = parsedUrl.searchParams.get('path');
          if (!filePath) return sendJson(400, { error: 'Missing path query parameter' });
          try {
            const absPath = this.safeJoinVault(filePath);
            if (!fs.existsSync(absPath)) return sendJson(404, { error: 'File not found' });
            const ext = path.extname(absPath).slice(1).toLowerCase();
            const mimeTypes: Record<string, string> = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              svg: 'image/svg+xml',
              pdf: 'application/pdf',
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              webm: 'audio/webm',
              ogg: 'audio/ogg',
              txt: 'text/plain',
              md: 'text/markdown'
            };
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            const stat = fs.statSync(absPath);
            res.writeHead(200, {
              'Content-Type': mimeType,
              'Content-Length': stat.size,
              'Cache-Control': 'no-cache'
            });
            const stream = fs.createReadStream(absPath);
            stream.pipe(res);
            return;
          } catch (e: any) {
            return sendJson(500, { error: e?.message || 'Error serving file' });
          }
        }

        if (pathname === '/api/vault/search' && req.method === 'GET') {
          const q = parsedUrl.searchParams.get('q') || '';
          const searchData = this.searchVaultFiles(q);
          return sendJson(200, { ok: true, ...searchData });
        }

        if (pathname === '/api/vault/folder/create' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path) return sendJson(400, { error: 'Missing folder path' });
          const absPath = this.safeJoinVault(body.path);
          this.suppressWatchUntil = Date.now() + 250;
          fs.mkdirSync(absPath, { recursive: true });
          const { files, folders } = this.scanVault();
          this.broadcastSSE({ type: 'vault-changed', path: body.path, ts: Date.now() });
          return sendJson(200, { ok: true, path: body.path, files, folders });
        }

        if (pathname === '/api/vault/file/rename' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.oldPath || !body.newPath) {
            return sendJson(400, { error: 'Missing oldPath or newPath' });
          }
          const result = this.renameFileOrFolder(body.oldPath, body.newPath);
          const { files, folders } = this.scanVault();
          return sendJson(200, { ok: true, ...result, files, folders });
        }

        if (pathname === '/api/vault/file/duplicate' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path) return sendJson(400, { error: 'Missing path' });
          const srcAbs = this.safeJoinVault(body.path);
          if (!fs.existsSync(srcAbs)) return sendJson(404, { error: 'File not found' });
          const ext = path.extname(body.path);
          const base = body.path.slice(0, -ext.length);
          let copyPath = `${base} 1${ext}`;
          let counter = 1;
          while (fs.existsSync(this.safeJoinVault(copyPath))) {
            counter++;
            copyPath = `${base} ${counter}${ext}`;
          }
          this.suppressWatchUntil = Date.now() + 250;
          fs.copyFileSync(srcAbs, this.safeJoinVault(copyPath));
          const { files, folders } = this.scanVault();
          return sendJson(200, { ok: true, newPath: copyPath, files, folders });
        }

        if (pathname === '/api/vault/file/delete' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path) return sendJson(400, { error: 'Missing path' });
          const deleted = this.deleteFileOrFolder(body.path);
          const { files, folders } = this.scanVault();
          this.broadcastSSE({ type: 'vault-changed', path: body.path, ts: Date.now() });
          return sendJson(200, { ok: deleted, files, folders });
        }

        if (pathname === '/api/vault/recovery' && req.method === 'GET') {
          const filterPath = parsedUrl.searchParams.get('path') || undefined;
          const snapshots = this.getRecoverySnapshots(filterPath);
          return sendJson(200, { snapshots });
        }

        if (pathname === '/api/vault/recovery/clear' && req.method === 'POST') {
          const cleared = this.clearRecoverySnapshots();
          return sendJson(200, { ok: cleared });
        }

        if (pathname === '/api/vault/system/reveal' && req.method === 'POST') {
          const body = await readJsonBody();
          this.revealInSystemExplorer(body.path);
          return sendJson(200, { ok: true });
        }

        if (pathname === '/api/vault/system/open' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path) return sendJson(400, { error: 'Missing file path' });
          this.openInDefaultApp(body.path);
          return sendJson(200, { ok: true });
        }

        if (pathname === '/api/vaults/open' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.path) return sendJson(400, { error: 'Missing vault path' });
          this.switchVault(body.path, Boolean(body.copySandbox));
          const { files, folders } = this.scanVault();
          const configs = this.getAllConfigs();
          return sendJson(200, {
            ok: true,
            vaultPath: this.activeVaultPath,
            vaultName: path.basename(this.activeVaultPath),
            vaults: this.getKnownVaults(),
            files,
            folders,
            configs
          });
        }

        if (pathname === '/api/vaults/sandbox' && req.method === 'POST') {
          this.resetSandboxVault();
          const { files, folders } = this.scanVault();
          const configs = this.getAllConfigs();
          return sendJson(200, {
            ok: true,
            vaultPath: this.activeVaultPath,
            vaultName: path.basename(this.activeVaultPath),
            vaults: this.getKnownVaults(),
            files,
            folders,
            configs
          });
        }

        if (pathname === '/api/vault/export-zip' && (req.method === 'GET' || req.method === 'HEAD')) {
          const zip = new JSZip();
          const addDirRecursive = (currentDir: string, zipFolder: any) => {
            const items = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const item of items) {
              if (item.name === '.git' || item.name === 'node_modules' || item.name === '.trash') continue;
              const fullPath = path.join(currentDir, item.name);
              if (item.isDirectory()) {
                const subZip = zipFolder.folder(item.name);
                addDirRecursive(fullPath, subZip);
              } else {
                const content = fs.readFileSync(fullPath);
                zipFolder.file(item.name, content);
              }
            }
          };
          addDirRecursive(this.activeVaultPath, zip);
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
          const safeName = path.basename(this.activeVaultPath).replace(/[^a-zA-Z0-9_-]/g, '_') || 'Vault';
          const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.zip`;
          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': zipBuffer.length
          });
          res.end(zipBuffer);
          return;
        }

        if (pathname === '/api/vaults/remove' && req.method === 'POST') {
          const body = await readJsonBody();
          const vaults = this.getKnownVaults().filter(v => v.path !== body.path);
          this.saveKnownVaults(vaults);
          return sendJson(200, { ok: true, vaults });
        }

        if (pathname === '/api/vaults/pick-folder' && req.method === 'POST') {
          if (process.platform === 'darwin') {
            try {
              const { exec } = await import('node:child_process');
              const chosenPath = await new Promise<string | null>((resolve) => {
                exec(`osascript -e 'POSIX path of (choose folder with prompt "Select a Runagon Vault folder:")'`, { timeout: 30000 }, (err, stdout) => {
                  if (err || !stdout.trim()) return resolve(null);
                  resolve(stdout.trim());
                });
              });
              if (chosenPath) {
                return sendJson(200, { ok: true, path: chosenPath });
              }
            } catch {}
          } else if (process.platform === 'linux') {
            try {
              const { exec } = await import('node:child_process');
              const chosenPath = await new Promise<string | null>((resolve) => {
                exec(`zenity --file-selection --directory --title="Select Runagon Vault folder" 2>/dev/null`, { timeout: 30000 }, (err, stdout) => {
                  if (err || !stdout.trim()) return resolve(null);
                  resolve(stdout.trim());
                });
              });
              if (chosenPath) {
                return sendJson(200, { ok: true, path: chosenPath });
              }
            } catch {}
          }
          const defaultBase = path.join(os.homedir(), 'Documents', 'RunagonVaults');
          return sendJson(200, { ok: true, path: null, suggestedBase: defaultBase });
        }

        // ==========================================
        // AI & RAG Endpoints
        // ==========================================
        if (pathname === '/api/vault/ai/status' && req.method === 'GET') {
          const { files } = this.scanVault();
          const mdCount = files.filter(f => f.extension === 'md' && !f.isBinary).length;
          const status = await this.ragEngine.getStatus(mdCount);
          return sendJson(200, { ok: true, status });
        }

        if (pathname === '/api/vault/ai/index' && req.method === 'POST') {
          await this.syncVaultRAG(true);
          const { files } = this.scanVault();
          const mdCount = files.filter(f => f.extension === 'md' && !f.isBinary).length;
          const status = await this.ragEngine.getStatus(mdCount);
          return sendJson(200, { ok: true, status });
        }

        if (pathname === '/api/vault/ai/search' && req.method === 'POST') {
          const body = await readJsonBody();
          const query = String(body.query || '');
          const topK = Number(body.topK) || 5;
          const filter = {
            filePath: body.filePath || undefined,
            folder: body.folder || undefined
          };
          const results = await this.ragEngine.search(query, topK, filter);
          return sendJson(200, { ok: true, results });
        }

        if (pathname === '/api/vault/ai/related' && req.method === 'POST') {
          const body = await readJsonBody();
          if (!body.filePath) return sendJson(400, { error: 'Missing filePath' });
          const topK = Number(body.topK) || 4;
          const related = await this.ragEngine.getRelatedNotes(body.filePath, topK);
          return sendJson(200, { ok: true, related });
        }

        if (pathname === '/api/vault/ai/config' && req.method === 'GET') {
          const cfg = this.ragEngine.getEmbeddingProvider().getConfig();
          const safeCfg = {
            ...cfg,
            apiKey: cfg.apiKey ? '••••••••' + cfg.apiKey.slice(-4) : '',
            hasApiKey: Boolean(cfg.apiKey)
          };
          return sendJson(200, { ok: true, config: safeCfg });
        }

        if (pathname === '/api/vault/ai/config' && req.method === 'POST') {
          const body = await readJsonBody();
          const configPath = path.join(this.activeVaultPath, '.obsidian', 'ai-config.json');
          let existingConfig: any = {};
          if (fs.existsSync(configPath)) {
            try {
              existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch {}
          }
          const merged = { ...existingConfig, ...body };
          // Preserve existing API key if incoming body didn't provide a new one
          if (!body.apiKey && existingConfig.apiKey) {
            merged.apiKey = existingConfig.apiKey;
          }
          this.ragEngine.getEmbeddingProvider().updateConfig(merged);
          fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
          return sendJson(200, { ok: true, config: this.ragEngine.getEmbeddingProvider().getConfig() });
        }

        // Streaming Chat endpoint (Server-Sent Events)
        if (pathname === '/api/vault/ai/chat' && req.method === 'POST') {
          const body = await readJsonBody();
          const query = String(body.query || '');
          if (!query.trim()) return sendJson(400, { error: 'Missing query' });

          const topK = Number(body.topK) || 5;
          const filter = {
            filePath: body.filePath || undefined,
            folder: body.folder || undefined
          };
          const history = Array.isArray(body.history) ? body.history : [];

          // 1. Retrieve grounded chunks
          const searchResults = await this.ragEngine.search(query, topK, filter);

          // 2. Set SSE Headers
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive'
          });

          // Send citations metadata event first with GraphRAG connection information
          const sources = searchResults.map(r => ({
            wikilink: r.chunk.wikilink,
            noteTitle: r.chunk.noteTitle,
            filePath: r.chunk.filePath,
            heading: r.chunk.heading,
            score: Math.round(r.score * 100),
            snippet: r.chunk.content.slice(0, 160),
            matchType: r.matchType,
            graphSource: r.graphSource,
            breadcrumbs: r.chunk.breadcrumbs
          }));
          res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);

          try {
            for await (const token of this.ragEngine.streamChat(query, searchResults, history)) {
              res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
            }
          } catch (streamErr: any) {
            res.write(`event: error\ndata: ${JSON.stringify(streamErr.message || 'Stream error')}\n\n`);
          }

          res.write(`event: done\ndata: {}\n\n`);
          res.end();
          return;
        }

        // Model Context Protocol (MCP) endpoint for External AIs (Claude, Cursor, Agents)
        if (pathname === '/api/vault/ai/mcp/status' && req.method === 'GET') {
          const configPath = this.getClaudeConfigPath();
          const isConfigPresent = fs.existsSync(configPath);
          let isClaudeConnected = false;
          let existingServers: string[] = [];

          let connectedVaultPath: string | undefined;
          if (isConfigPresent) {
            try {
              const raw = fs.readFileSync(configPath, 'utf8');
              const clean = raw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1').trim();
              const parsed = JSON.parse(clean);
              const mcpEntry = parsed.mcpServers?.['runagon-vault-memory'] || parsed.mcpServers?.['obsidian-vault-memory'];
              if (mcpEntry) {
                isClaudeConnected = true;
                connectedVaultPath = mcpEntry?.args?.[1];
              }
              if (parsed.mcpServers) {
                existingServers = Object.keys(parsed.mcpServers);
              }
            } catch {}
          }

          const nodeBinary = this.getNodeBinary();
          const bridgePath = this.getBridgeScriptPath();
          const vaultPath = this.activeVaultPath;
          const port = this.currentServerPort;

          const cursorConfig = {
            name: 'runagon-vault-memory',
            command: nodeBinary,
            args: [bridgePath, vaultPath, String(port)]
          };

          const claudeDesktopSnippet = {
            mcpServers: {
              'runagon-vault-memory': {
                command: nodeBinary,
                args: [bridgePath, vaultPath, String(port)]
              }
            }
          };

          const claudeCliCommand = `claude mcp add runagon-vault-memory ${nodeBinary} "${bridgePath}" "${vaultPath}" "${port}"`;

          return sendJson(200, {
            ok: true,
            claudeConfigPath: configPath,
            isConfigPresent,
            isClaudeConnected,
            connectedVaultPath,
            isDifferentVault: Boolean(isClaudeConnected && connectedVaultPath && connectedVaultPath !== vaultPath),
            existingServers,
            nodeBinary,
            bridgePath,
            vaultPath,
            port,
            cursorConfig,
            claudeDesktopSnippet,
            claudeCliCommand
          });
        }

        if (pathname === '/api/vault/ai/mcp/install-claude' && req.method === 'POST') {
          const configPath = this.getClaudeConfigPath();
          const configDir = path.dirname(configPath);
          fs.mkdirSync(configDir, { recursive: true });

          let config: any = { mcpServers: {} };
          if (fs.existsSync(configPath)) {
            try {
              const raw = fs.readFileSync(configPath, 'utf8');
              const clean = raw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1').trim();
              config = JSON.parse(clean) || { mcpServers: {} };
              if (!config.mcpServers) config.mcpServers = {};
              fs.writeFileSync(`${configPath}.bak`, raw, 'utf8');
            } catch {}
          }

          const nodeBinary = this.getNodeBinary();
          const bridgePath = this.getBridgeScriptPath();
          const vaultPath = this.activeVaultPath;

          const vaultBridge = path.join(this.activeVaultPath, '.obsidian', 'mcpBridge.cjs');
          if (fs.existsSync(bridgePath)) {
            try {
              fs.mkdirSync(path.join(this.activeVaultPath, '.obsidian'), { recursive: true });
              fs.copyFileSync(bridgePath, vaultBridge);
            } catch {}
          }

          config.mcpServers['runagon-vault-memory'] = {
            command: nodeBinary,
            args: [bridgePath, vaultPath, String(this.currentServerPort)]
          };
          if (config.mcpServers['obsidian-vault-memory']) {
            delete config.mcpServers['obsidian-vault-memory'];
          }

          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

          return sendJson(200, {
            ok: true,
            message: 'Successfully connected Runagon Vault Memory to Claude Desktop!',
            configPath,
            isClaudeConnected: true
          });
        }

        if (pathname === '/api/vault/ai/mcp/uninstall-claude' && req.method === 'POST') {
          const configPath = this.getClaudeConfigPath();
          if (fs.existsSync(configPath)) {
            try {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              let changed = false;
              if (config.mcpServers?.['runagon-vault-memory']) {
                delete config.mcpServers['runagon-vault-memory'];
                changed = true;
              }
              if (config.mcpServers?.['obsidian-vault-memory']) {
                delete config.mcpServers['obsidian-vault-memory'];
                changed = true;
              }
              if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
              }
            } catch {}
          }
          return sendJson(200, {
            ok: true,
            message: 'Disconnected Runagon Vault Memory from Claude Desktop.',
            isClaudeConnected: false
          });
        }

        if (pathname === '/api/vault/ai/mcp' && req.method === 'POST') {
          const body = await readJsonBody();
          if (body.method === 'tools/list') {
            const tools = this.mcpServer.listTools();
            return sendJson(200, { tools });
          }
          if (body.method === 'tools/call') {
            const result = await this.mcpServer.callTool(body.params?.name, body.params?.arguments || {});
            return sendJson(200, result);
          }
          return sendJson(400, { error: `Unsupported MCP method: ${body.method}` });
        }

        return sendJson(404, { error: `Unknown endpoint: ${pathname}` });
      } catch (err: any) {
        return sendJson(500, { error: err?.message || 'Internal server error' });
      }
    })();
  }
}
