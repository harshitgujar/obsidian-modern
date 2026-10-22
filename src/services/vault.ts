import { VaultFile, VaultInfo, RecoverySnapshot } from '../types';
import JSZip from 'jszip';

export class VaultManager {
  private files: VaultFile[] = [];
  private folders: string[] = [];
  private configs: Record<string, any> = {};
  private activeVaultPath: string = '';
  private activeVaultName: string = '';
  private knownVaults: VaultInfo[] = [];
  private changeListeners: Set<() => void> = new Set();
  private sseEventSource: EventSource | null = null;

  async init(): Promise<VaultFile[]> {
    try {
      const res = await fetch('/api/vault/state');
      if (res.ok) {
        const data = await res.json();
        this.activeVaultPath = data.vaultPath || '';
        this.activeVaultName = data.vaultName || '';
        this.knownVaults = data.vaults || [];
        this.configs = data.configs || {};
        this.folders = data.folders || [];
        this.files = (data.files || []).map((f: any) => ({
          id: f.path,
          name: f.name,
          path: f.path,
          folder: f.folder,
          extension: f.extension,
          content: f.content || '',
          size: f.size || 0,
          createdAt: f.createdAt || Date.now(),
          updatedAt: f.updatedAt || Date.now(),
          isBinary: f.isBinary
        }));

        this.setupEventSource();
        return this.files;
      }
    } catch (e) {
      console.warn('Backend API connection error:', e);
    }

    return this.files;
  }

  private setupEventSource() {
    if (this.sseEventSource) {
      this.sseEventSource.close();
    }

    try {
      this.sseEventSource = new EventSource('/api/vault/watch');
      this.sseEventSource.onmessage = async (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'vault-changed') {
            await this.refreshState();
          }
        } catch {}
      };
    } catch {}
  }

  public async refreshState() {
    try {
      const res = await fetch('/api/vault/state');
      if (res.ok) {
        const data = await res.json();
        this.activeVaultPath = data.vaultPath;
        this.activeVaultName = data.vaultName;
        this.knownVaults = data.vaults || [];
        this.configs = data.configs || {};
        this.folders = data.folders || [];
        this.files = (data.files || []).map((f: any) => ({
          id: f.path,
          name: f.name,
          path: f.path,
          folder: f.folder,
          extension: f.extension,
          content: f.content || '',
          size: f.size || 0,
          createdAt: f.createdAt || Date.now(),
          updatedAt: f.updatedAt || Date.now(),
          isBinary: f.isBinary
        }));
        this.notifyChange();
      }
    } catch {}
  }

  public subscribe(cb: () => void) {
    this.changeListeners.add(cb);
    return () => this.changeListeners.delete(cb);
  }

  private notifyChange() {
    for (const cb of this.changeListeners) {
      cb();
    }
  }

  getFiles(): VaultFile[] {
    return this.files;
  }

  getFolders(): string[] {
    return this.folders;
  }

  getConfigs(): Record<string, any> {
    return this.configs;
  }

  getConfig(name: string): any {
    return this.configs[name];
  }

  async saveConfig(name: string, data: any): Promise<boolean> {
    this.configs[name] = data;
    try {
      await fetch('/api/vault/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data })
      });
      return true;
    } catch {
      return false;
    }
  }

  getActiveVaultPath(): string {
    return this.activeVaultPath;
  }

  getActiveVaultName(): string {
    return this.activeVaultName;
  }

  getKnownVaults(): VaultInfo[] {
    return this.knownVaults;
  }

  getFile(pathOrId: string): VaultFile | undefined {
    return this.files.find(f => f.path === pathOrId || f.id === pathOrId);
  }

  getFileByPath(path: string): VaultFile | undefined {
    const clean = path.replace(/^\/+/, '').toLowerCase();
    return this.files.find(f => {
      const fPathClean = f.path.toLowerCase();
      const fPathNoExt = f.path.replace(/\.[^/.]+$/, '').toLowerCase();
      return fPathClean === clean || fPathNoExt === clean;
    });
  }

  getFileByName(name: string): VaultFile | undefined {
    const clean = name.replace(/\.[^/.]+$/, '').toLowerCase();
    return this.files.find(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase() === clean);
  }

  updateInMemory(pathOrId: string, content: string): void {
    const file = this.getFile(pathOrId);
    if (file) {
      file.content = content;
      file.updatedAt = Date.now();
    }
  }

  getMediaFiles(): VaultFile[] {
    const mediaExts = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
      'pdf', 'webm', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'm4a'
    ]);
    return this.files.filter(f => f.isBinary || mediaExts.has(f.extension.toLowerCase()));
  }

  async saveNote(pathOrId: string, content: string): Promise<VaultFile | undefined> {
    const file = this.getFile(pathOrId);
    const targetPath = file ? file.path : pathOrId;

    try {
      const res = await fetch('/api/vault/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, content })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedFile = data.file;
        const idx = this.files.findIndex(f => f.path === targetPath);
        if (idx !== -1) {
          this.files[idx].content = content;
          this.files[idx].updatedAt = updatedFile.updatedAt;
          this.files[idx].size = updatedFile.size;
        }
        return this.files[idx];
      }
    } catch (e) {
      console.error('Error saving note to disk:', e);
    }

    if (file) {
      file.content = content;
      file.updatedAt = Date.now();
      return file;
    }
    return undefined;
  }

  async createNote(title: string, folder: string = '', initialContent: string = '', extension: string = 'md'): Promise<VaultFile> {
    const cleanExt = extension.replace(/^\./, '');
    const sanitizedTitle = title.endsWith(`.${cleanExt}`) ? title : `${title}.${cleanExt}`;
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const filePath = cleanFolder ? `${cleanFolder}/${sanitizedTitle}` : sanitizedTitle;

    const existing = this.getFileByPath(filePath);
    if (existing) {
      return existing;
    }

    let defaultContent = initialContent;
    if (!defaultContent) {
      if (cleanExt === 'canvas') {
        defaultContent = JSON.stringify({ nodes: [], edges: [] }, null, 2);
      } else {
        const cleanName = title.replace(/\.[^/.]+$/, '');
        defaultContent = `---\ntitle: ${cleanName}\ncreated: ${new Date().toISOString().slice(0, 10)}\ntags: []\n---\n\n# ${cleanName}\n\n`;
      }
    }

    try {
      const res = await fetch('/api/vault/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content: defaultContent })
      });
      if (res.ok) {
        const data = await res.json();
        const newFile: VaultFile = {
          id: filePath,
          name: sanitizedTitle,
          path: filePath,
          folder: cleanFolder,
          extension: cleanExt,
          content: defaultContent,
          size: data.file.size,
          createdAt: data.file.createdAt,
          updatedAt: data.file.updatedAt
        };
        this.files.push(newFile);
        if (cleanFolder && !this.folders.includes(cleanFolder)) {
          this.folders.push(cleanFolder);
          this.folders.sort();
        }
        this.notifyChange();
        return newFile;
      }
    } catch (e) {
      console.error('Error creating note on disk:', e);
    }

    const fallback: VaultFile = {
      id: filePath,
      name: sanitizedTitle,
      path: filePath,
      folder: cleanFolder,
      extension: cleanExt,
      content: defaultContent,
      size: defaultContent.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.files.push(fallback);
    return fallback;
  }

  async createFolder(folderPath: string): Promise<boolean> {
    const clean = folderPath.replace(/^\/+|\/+$/g, '');
    try {
      const res = await fetch('/api/vault/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: clean })
      });
      if (res.ok) {
        if (!this.folders.includes(clean)) {
          this.folders.push(clean);
          this.folders.sort();
          this.notifyChange();
        }
        return true;
      }
    } catch {}
    return false;
  }

  async deleteNote(pathOrId: string): Promise<boolean> {
    const file = this.getFile(pathOrId);
    const targetPath = file ? file.path : pathOrId;

    try {
      const res = await fetch('/api/vault/file/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (res.ok) {
        this.files = this.files.filter(f => f.path !== targetPath);
        this.notifyChange();
        return true;
      }
    } catch {}

    this.files = this.files.filter(f => f.path !== targetPath);
    return true;
  }

  async renameNote(oldPath: string, newTitleOrPath: string): Promise<{ newPath: string; updatedLinksCount: number } | undefined> {
    const file = this.getFile(oldPath);
    if (!file) return undefined;

    let targetPath = newTitleOrPath;
    if (!targetPath.includes('/')) {
      const ext = file.extension ? `.${file.extension}` : '.md';
      const cleanTitle = newTitleOrPath.endsWith(ext) ? newTitleOrPath : `${newTitleOrPath}${ext}`;
      targetPath = file.folder ? `${file.folder}/${cleanTitle}` : cleanTitle;
    }

    try {
      const res = await fetch('/api/vault/file/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath: targetPath })
      });
      if (res.ok) {
        const data = await res.json();
        await this.refreshState();
        return { newPath: data.newPath, updatedLinksCount: data.updatedLinksCount || 0 };
      }
    } catch {}

    return undefined;
  }

  async duplicateNote(filePath: string): Promise<string | undefined> {
    try {
      const res = await fetch('/api/vault/file/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
      if (res.ok) {
        const data = await res.json();
        await this.refreshState();
        return data.newPath;
      }
    } catch {}
    return undefined;
  }

  async saveBinaryFile(relPath: string, base64: string): Promise<boolean> {
    try {
      const res = await fetch('/api/vault/file/binary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath, base64 })
      });
      if (res.ok) {
        await this.refreshState();
        return true;
      }
    } catch {}
    return false;
  }

  async searchVault(query: string): Promise<{ results: any[]; totalMatches: number }> {
    try {
      const res = await fetch(`/api/vault/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return { results: data.results || [], totalMatches: data.totalMatches || 0 };
      }
    } catch {}
    return { results: [], totalMatches: 0 };
  }

  async getRecoverySnapshots(filePath?: string): Promise<RecoverySnapshot[]> {
    try {
      const url = filePath ? `/api/vault/recovery?path=${encodeURIComponent(filePath)}` : '/api/vault/recovery';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.snapshots || [];
      }
    } catch {}
    return [];
  }

  async openVault(vaultPath: string, copySandbox: boolean = false): Promise<boolean> {
    try {
      const res = await fetch('/api/vaults/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: vaultPath, copySandbox })
      });
      if (res.ok) {
        await this.refreshState();
        return true;
      }
    } catch {}
    return false;
  }

  async resetSandboxVault(): Promise<boolean> {
    try {
      const res = await fetch('/api/vaults/sandbox', { method: 'POST' });
      if (res.ok) {
        await this.refreshState();
        return true;
      }
    } catch {}
    return false;
  }

  async removeVaultFromList(vaultPath: string): Promise<boolean> {
    try {
      const res = await fetch('/api/vaults/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: vaultPath })
      });
      if (res.ok) {
        const data = await res.json();
        this.knownVaults = data.vaults || [];
        this.notifyChange();
        return true;
      }
    } catch {}
    return false;
  }

  getRecentNotePaths(): string[] {
    try {
      const workspace = this.configs.workspace;
      if (workspace && Array.isArray(workspace.lastOpenFiles)) {
        return workspace.lastOpenFiles;
      }
      const data = localStorage.getItem('obsidian_recent_notes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  recordRecentNote(path: string) {
    try {
      let recents = this.getRecentNotePaths();
      recents = [path, ...recents.filter(p => p !== path)].slice(0, 20);
      const ws = this.configs.workspace || {};
      ws.lastOpenFiles = recents;
      this.saveConfig('workspace', ws);
      localStorage.setItem('obsidian_recent_notes', JSON.stringify(recents));
    } catch {}
  }

  async exportAsZip(): Promise<void> {
    try {
      const a = document.createElement('a');
      a.href = '/api/vault/export-zip';
      a.download = `${this.activeVaultName || 'Obsidian-Vault'}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } catch {}

    const zip = new JSZip();
    for (const file of this.files) {
      if (!file.isBinary) {
        zip.file(file.path, file.content);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.activeVaultName || 'Obsidian-Vault'}-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async getSnippets(): Promise<Array<{ name: string; content: string }>> {
    try {
      const res = await fetch('/api/vault/snippets');
      if (res.ok) {
        const data = await res.json();
        return data.snippets || [];
      }
    } catch {}
    return [];
  }

  async saveSnippet(name: string, content: string): Promise<Array<{ name: string; content: string }>> {
    try {
      const res = await fetch('/api/vault/snippets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content })
      });
      if (res.ok) {
        const data = await res.json();
        return data.snippets || [];
      }
    } catch {}
    return this.getSnippets();
  }

  async deleteSnippet(name: string): Promise<Array<{ name: string; content: string }>> {
    try {
      const res = await fetch('/api/vault/snippets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        return data.snippets || [];
      }
    } catch {}
    return this.getSnippets();
  }

  async openSnippetsFolder(): Promise<void> {
    try {
      await fetch('/api/vault/snippets/open-folder', { method: 'POST' });
    } catch {}
  }

  async clearRecoveryHistory(): Promise<boolean> {
    try {
      const res = await fetch('/api/vault/recovery/clear', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async revealInSystemExplorer(filePath?: string): Promise<void> {
    try {
      await fetch('/api/vault/system/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath || '' })
      });
    } catch {}
  }

  async openInDefaultApp(filePath: string): Promise<void> {
    try {
      await fetch('/api/vault/system/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
    } catch {}
  }
}

export const vault = new VaultManager();
