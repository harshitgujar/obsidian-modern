import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import JSZip from 'jszip';

export interface VaultEntry {
  id: string;
  path: string;
  name: string;
  ts: number;
  open: boolean;
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
    defaultViewMode: 'reading',
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
    theme: 'obsidian',
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
      { query: 'path:Formatting', color: '#8b5cf6' },
      { query: 'path:Guides', color: '#10b981' },
      { query: 'path:Adventurer', color: '#f59e0b' },
      { query: 'path:Templates', color: '#06b6d4' },
      { query: 'path:Daily', color: '#ec4899' }
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

  constructor(options?: ObsidianServerOptions) {
    this.rootDir = options?.rootDir || process.env.OBSIDIAN_ROOT_DIR || process.cwd();
    this.globalConfigPath = path.join(this.rootDir, '.obsidian-global.json');
    this.defaultVaultDir = options?.defaultVaultDir || process.env.OBSIDIAN_DEFAULT_VAULT_DIR || path.join(this.rootDir, 'vault');
    this.sandboxTemplateDir = options?.sandboxTemplateDir || process.env.OBSIDIAN_SANDBOX_DIR || path.join(process.cwd(), 'resources', 'sandbox');
    this.activeVaultPath = this.defaultVaultDir;

    this.initGlobalRegistry();
    this.ensureVaultInitialized(this.activeVaultPath);
    this.startWatchingVault();
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
      return Object.entries(raw.vaults || {}).map(([id, v]: [string, any]) => ({
        id,
        path: v.path,
        name: path.basename(v.path),
        ts: v.ts || Date.now(),
        open: v.path === this.activeVaultPath
      }));
    } catch {
      return [{
        id: 'default',
        path: this.activeVaultPath,
        name: path.basename(this.activeVaultPath),
        ts: Date.now(),
        open: true
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

    return { newPath: newRelPath, updatedLinksCount };
  }

  public deleteFileOrFolder(relPath: string): boolean {
    const absPath = this.safeJoinVault(relPath);
    if (!fs.existsSync(absPath)) return false;
    this.suppressWatchUntil = Date.now() + 250;

    const configs = this.getAllConfigs();
    const trashOption = configs.app?.trashOption || 'local';

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
    this.startWatchingVault();
    return this.activeVaultPath;
  }

  public resetSandboxVault(): string {
    // Recreate sandbox files inside the current or default sandbox vault
    copyDirectoryRecursive(this.sandboxTemplateDir, this.activeVaultPath);
    this.ensureVaultInitialized(this.activeVaultPath);
    return this.activeVaultPath;
  }

  public handleRequest(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const urlStr = req.url || '';
    if (!urlStr.startsWith('/api/vault')) {
      return next();
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
          return sendJson(200, { ok: true, path: body.path });
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

        return sendJson(404, { error: `Unknown endpoint: ${pathname}` });
      } catch (err: any) {
        return sendJson(500, { error: err?.message || 'Internal server error' });
      }
    })();
  }
}
