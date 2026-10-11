import { VaultFile } from '../types';
import { DEFAULT_VAULT_FILES } from './defaultVault';
import JSZip from 'jszip';

const STORAGE_KEY = 'obsidian_vault_notes_v1';
const RECENT_KEY = 'obsidian_recent_notes';

export class VaultManager {
  private files: VaultFile[] = [];
  private dirHandle: FileSystemDirectoryHandle | null = null;

  async init(): Promise<VaultFile[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: VaultFile[] = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          this.files = parsed;
          return this.files;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using defaults', e);
    }

    this.files = [...DEFAULT_VAULT_FILES];
    this.persist();
    return this.files;
  }

  getFiles(): VaultFile[] {
    return this.files;
  }

  getFile(id: string): VaultFile | undefined {
    return this.files.find(f => f.id === id);
  }

  getFileByPath(path: string): VaultFile | undefined {
    // Exact or normalized match without extension
    const clean = path.replace(/\.md$/, '').toLowerCase();
    return this.files.find(f => {
      const fPathClean = f.path.replace(/\.md$/, '').toLowerCase();
      const fNameClean = f.name.replace(/\.md$/, '').toLowerCase();
      return fPathClean === clean || fNameClean === clean;
    });
  }

  getFileByName(name: string): VaultFile | undefined {
    const clean = name.replace(/\.md$/, '').toLowerCase();
    return this.files.find(f => f.name.replace(/\.md$/, '').toLowerCase() === clean);
  }

  saveNote(id: string, content: string): VaultFile | undefined {
    const file = this.files.find(f => f.id === id);
    if (!file) return undefined;
    file.content = content;
    file.updatedAt = Date.now();
    this.persist();
    return file;
  }

  createNote(title: string, folder: string = '', initialContent: string = ''): VaultFile {
    const sanitizedTitle = title.endsWith('.md') ? title : `${title}.md`;
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const path = cleanFolder ? `${cleanFolder}/${sanitizedTitle}` : sanitizedTitle;

    // Check if file already exists
    const existing = this.getFileByPath(path);
    if (existing) {
      return existing;
    }

    const defaultContent = initialContent || `---\ntitle: ${title.replace(/\.md$/, '')}\ntags: []\ncreated: ${new Date().toISOString().slice(0, 10)}\n---\n\n# ${title.replace(/\.md$/, '')}\n\n`;

    const newFile: VaultFile = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: sanitizedTitle,
      path,
      folder: cleanFolder,
      content: defaultContent,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.files.push(newFile);
    this.persist();
    return newFile;
  }

  deleteNote(id: string): boolean {
    const initialLen = this.files.length;
    this.files = this.files.filter(f => f.id !== id);
    if (this.files.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  renameNote(id: string, newTitle: string): VaultFile | undefined {
    const file = this.files.find(f => f.id === id);
    if (!file) return undefined;

    const sanitizedTitle = newTitle.endsWith('.md') ? newTitle : `${newTitle}.md`;
    file.name = sanitizedTitle;
    file.path = file.folder ? `${file.folder}/${sanitizedTitle}` : sanitizedTitle;
    file.updatedAt = Date.now();
    this.persist();
    return file;
  }

  getRecentNoteIds(): string[] {
    try {
      const data = localStorage.getItem(RECENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  recordRecentNote(id: string) {
    try {
      let recents = this.getRecentNoteIds();
      recents = [id, ...recents.filter(r => r !== id)].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    } catch (e) {
      console.warn('Failed to save recents', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files));
    } catch (e) {
      console.error('Storage full or error saving vault', e);
    }
  }

  // --- Real Local File System Integration (File System Access API) ---
  async openLocalDirectory(): Promise<{ success: boolean; count: number; name: string }> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API is not supported in this browser environment. Using local vault storage.');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      this.dirHandle = dirHandle;

      const loadedFiles: VaultFile[] = [];

      async function scanDirectory(handle: any, currentFolder: string) {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            const file = await entry.getFile();
            const text = await file.text();
            const filePath = currentFolder ? `${currentFolder}/${entry.name}` : entry.name;
            loadedFiles.push({
              id: `local-${filePath}`,
              name: entry.name,
              path: filePath,
              folder: currentFolder,
              content: text,
              createdAt: file.lastModified,
              updatedAt: file.lastModified
            });
          } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
            const nextFolder = currentFolder ? `${currentFolder}/${entry.name}` : entry.name;
            await scanDirectory(entry, nextFolder);
          }
        }
      }

      await scanDirectory(dirHandle, '');

      if (loadedFiles.length > 0) {
        this.files = loadedFiles;
        this.persist();
        return { success: true, count: loadedFiles.length, name: dirHandle.name };
      }

      return { success: true, count: 0, name: dirHandle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, count: 0, name: '' };
      }
      throw err;
    }
  }

  // --- Export Vault as ZIP ---
  async exportAsZip(): Promise<void> {
    const zip = new JSZip();

    for (const file of this.files) {
      zip.file(file.path, file.content);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Obsidian-Vault-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Import Vault from ZIP ---
  async importFromZip(file: File): Promise<number> {
    const zip = new JSZip();
    const loaded = await zip.loadAsync(file);
    const newFiles: VaultFile[] = [];

    for (const [relativePath, zipEntry] of Object.entries(loaded.files)) {
      if (!zipEntry.dir && relativePath.endsWith('.md') && !relativePath.startsWith('__MACOSX/')) {
        const text = await zipEntry.async('string');
        const parts = relativePath.split('/');
        const fileName = parts.pop() || relativePath;
        const folder = parts.join('/');

        newFiles.push({
          id: `zip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: fileName,
          path: relativePath,
          folder,
          content: text,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    if (newFiles.length > 0) {
      this.files = newFiles;
      this.persist();
    }

    return newFiles.length;
  }

  resetToDefault(): VaultFile[] {
    this.files = [...DEFAULT_VAULT_FILES];
    this.persist();
    return this.files;
  }
}

export const vault = new VaultManager();
