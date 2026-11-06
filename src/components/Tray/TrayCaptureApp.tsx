import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Pin,
  PinOff,
  X,
  Search,
  UploadCloud,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Folder,
  FolderPlus,
  Sparkles,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  FileCode,
  LayoutGrid,
  Plus,
  FolderOpen,
  ArrowRight,
  File,
  Globe,
  Tag
} from 'lucide-react';
import { VaultFile, VaultInfo } from '../../types';

interface SavedCardState {
  fileName: string;
  filePath: string;
  folder: string;
  vaultName: string;
  type: 'file' | 'note' | 'url';
  previewText?: string;
  isImage?: boolean;
  base64Preview?: string;
}

export const TrayCaptureApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'retrieve'>('capture');
  const [isPinned, setIsPinned] = useState(false);
  const [vaultName, setVaultName] = useState<string>('');
  const [vaultPath, setVaultPath] = useState<string>('');
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [folders, setFolders] = useState<Array<{ path: string; name: string }>>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Capture State
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<SavedCardState | null>(null);

  // Vault Switcher Dropdown State
  const [isVaultMenuOpen, setIsVaultMenuOpen] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);

  // Retrieve / Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'canvas' | 'media'>('all');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.remove('bg-[#f4f4f6]');
    document.body.classList.add('bg-[#18181b]', 'text-zinc-100');
    document.body.style.backgroundColor = '#18181b';
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.backgroundColor = '#18181b';
      rootEl.style.height = '100%';
    }
    return () => {
      document.body.style.backgroundColor = '';
      if (rootEl) rootEl.style.backgroundColor = '';
    };
  }, []);

  // Fetch Vault State from backend
  const fetchVaultState = async () => {
    try {
      const res = await fetch('/api/vault/state');
      if (res.ok) {
        const data = await res.json();
        setVaultName(data.vaultName || '');
        setVaultPath(data.vaultPath || '');
        setVaults(data.vaults || []);
        setFolders(data.folders || []);
        setFiles(data.files || []);
      }
    } catch (err) {
      console.warn('Failed to fetch vault state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultState();
    const interval = setInterval(fetchVaultState, 8000);
    return () => clearInterval(interval);
  }, []);

  // Autofocus when switching tabs
  useEffect(() => {
    if (activeTab === 'retrieve') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setTimeout(() => noteTextareaRef.current?.focus(), 50);
    }
  }, [activeTab]);

  // Global Keyboard shortcuts inside the tray window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isVaultMenuOpen) {
          setIsVaultMenuOpen(false);
          return;
        }
        if (isFolderMenuOpen) {
          setIsFolderMenuOpen(false);
          return;
        }
        if (searchQuery) {
          setSearchQuery('');
          return;
        }
        // Hide window on Escape
        window.electronAPI?.hideTrayWindow();
      }

      // Switch tabs with Cmd+1 / Cmd+2
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setActiveTab('capture');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setActiveTab('retrieve');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, isVaultMenuOpen, isFolderMenuOpen]);

  // Pin Toggle
  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    window.electronAPI?.setTrayPinned(next);
    showToast(next ? '📌 Window pinned (stays on top)' : 'Unpinned (auto-hides on click outside)', 'info');
  };

  // Switch Vault
  const handleSwitchVault = async (targetPath: string) => {
    try {
      setIsLoading(true);
      setIsVaultMenuOpen(false);
      const res = await fetch('/api/vaults/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (res.ok) {
        const data = await res.json();
        setVaultName(data.vaultName);
        setVaultPath(data.vaultPath);
        setFolders(data.folders || []);
        setFiles(data.files || []);
        setSelectedFolder('');
        showToast(`Switched to "${data.vaultName}"`);
      }
    } catch {
      showToast('Failed to switch vault', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create New Folder
  const handleCreateFolder = async () => {
    const clean = newFolderName.trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    if (!clean) return;

    try {
      const res = await fetch('/api/vault/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: clean })
      });
      if (res.ok) {
        setSelectedFolder(clean);
        setIsCreatingFolder(false);
        setNewFolderName('');
        fetchVaultState();
        showToast(`Created folder "${clean}"`);
      }
    } catch {
      showToast('Failed to create folder', 'error');
    }
  };

  // Helper: Format captured content
  const buildNoteMarkdown = (title: string, body: string, tags: string, sourceMeta?: string) => {
    const tagList = tags
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith('#') ? t : `#${t}`))
      .join(' ');

    let md = '';
    if (title) {
      md += `# ${title}\n\n`;
    }
    if (tagList) {
      md += `${tagList}\n\n`;
    }
    md += body.trim();
    if (sourceMeta) {
      md += `\n\n---\n*${sourceMeta}*`;
    }
    return md;
  };

  // Save Text / URL Note
  const handleSaveNote = async () => {
    if (!noteContent.trim() && !noteTitle.trim()) {
      showToast('Please enter some text or drop a file', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let derivedTitle = noteTitle.trim();
      if (!derivedTitle) {
        const firstLine = noteContent.trim().split('\n')[0].replace(/[#*`[\]]/g, '').trim();
        derivedTitle = firstLine ? firstLine.slice(0, 40) : `Quick Capture ${dateStr}`;
      }

      const fileName = derivedTitle.toLowerCase().endsWith('.md') ? derivedTitle : `${derivedTitle}.md`;
      const targetRelPath = selectedFolder ? `${selectedFolder}/${fileName}` : fileName;

      const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const fullContent = buildNoteMarkdown(derivedTitle, noteContent, noteTags, `Captured via Runagon Quick Tray on ${now}`);

      const res = await fetch('/api/vault/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetRelPath, content: fullContent })
      });

      if (res.ok) {
        setLastSaved({
          fileName,
          filePath: targetRelPath,
          folder: selectedFolder || 'Root',
          vaultName: vaultName || 'Vault',
          type: noteContent.startsWith('http') ? 'url' : 'note',
          previewText: fullContent.slice(0, 200)
        });

        setNoteTitle('');
        setNoteContent('');
        setNoteTags('');
        showToast(`✓ Saved to ${vaultName}`);
        fetchVaultState();
      } else {
        showToast('Error saving note to vault', 'error');
      }
    } catch {
      showToast('Error connecting to vault server', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop Handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 1. Check for files dropped from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setIsSaving(true);

      for (const file of droppedFiles) {
        const fileName = file.name;
        const targetRelPath = selectedFolder ? `${selectedFolder}/${fileName}` : fileName;
        const isImg = file.type.startsWith('image/');

        // Try direct file path copy via Electron IPC if available
        let savedSuccessfully = false;
        const nativeFilePath = window.electronAPI?.getPathForFile ? window.electronAPI.getPathForFile(file) : (file as any).path;

        if (nativeFilePath && window.electronAPI?.saveDroppedFile && vaultPath) {
          const result = await window.electronAPI.saveDroppedFile({
            sourcePath: nativeFilePath,
            targetVaultPath: vaultPath,
            targetFolder: selectedFolder,
            fileName: fileName
          });
          if (result.ok) {
            savedSuccessfully = true;
          }
        }

        // Fallback: Read file in browser and upload via /api/vault/file/binary
        if (!savedSuccessfully) {
          try {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result as string;
                const base64 = res.split(',')[1] || '';
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const res = await fetch('/api/vault/file/binary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: targetRelPath, base64: base64Data })
            });
            if (res.ok) savedSuccessfully = true;
          } catch (err) {
            console.error('Binary upload failed:', err);
          }
        }

        if (savedSuccessfully) {
          // If it's a media or non-markdown file, create a companion markdown note so it's linked & searchable
          if (!fileName.endsWith('.md')) {
            const companionNoteTitle = `Capture - ${fileName}`;
            const companionNoteName = `${companionNoteTitle}.md`;
            const companionPath = selectedFolder ? `${selectedFolder}/${companionNoteName}` : companionNoteName;
            const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const companionContent = `# ${fileName}\n\n![[${fileName}]]\n\n*Captured file via Runagon Quick Tray on ${now}*`;
            await fetch('/api/vault/file/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: companionPath, content: companionContent })
            });
          }

          setLastSaved({
            fileName,
            filePath: targetRelPath,
            folder: selectedFolder || 'Root',
            vaultName: vaultName || 'Vault',
            type: 'file',
            isImage: isImg
          });
          showToast(`✓ Dropped and saved "${fileName}"`);
        } else {
          showToast(`Failed to save "${fileName}"`, 'error');
        }
      }

      setIsSaving(false);
      fetchVaultState();
      return;
    }

    // 2. Check for dragged text or URLs
    const droppedText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (droppedText) {
      setNoteContent(prev => (prev ? `${prev}\n\n${droppedText}` : droppedText));
      showToast('Text captured from drag!', 'info');
      setTimeout(() => noteTextareaRef.current?.focus(), 50);
    }
  };

  // Open note in main Runagon window
  const handleOpenInMain = (relPath: string) => {
    if (window.electronAPI?.openInMainWindow) {
      window.electronAPI.openInMainWindow(relPath, vaultPath);
    }
  };

  // Reveal file in OS Finder
  const handleRevealInFinder = async (relPath: string) => {
    try {
      await fetch('/api/vault/system/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath })
      });
      showToast('Revealed in Finder', 'info');
    } catch {
      showToast('Could not open Finder', 'error');
    }
  };

  // Copy full content of a note to clipboard (1-click retrieval)
  const handleCopyNoteContent = async (file: VaultFile) => {
    try {
      let content = file.content;
      if (!content) {
        const res = await fetch(`/api/vault/file/raw?path=${encodeURIComponent(file.path)}`);
        if (res.ok) {
          content = await res.text();
        }
      }
      if (content) {
        await navigator.clipboard.writeText(content);
        showToast(`✓ Copied note content: "${file.name}"`);
      } else {
        await navigator.clipboard.writeText(`[[${file.name.replace(/\.[^/.]+$/, '')}]]`);
        showToast(`✓ Copied wikilink: [[${file.name.replace(/\.[^/.]+$/, '')}]]`);
      }
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Copy Wikilink
  const handleCopyWikilink = async (file: VaultFile) => {
    const link = `[[${file.name.replace(/\.[^/.]+$/, '')}]]`;
    await navigator.clipboard.writeText(link);
    showToast(`✓ Copied link: ${link}`);
  };

  // Filtered & Searched Results for Retrieval Tab
  const searchResults = useMemo(() => {
    let list = files;

    // Type filter
    if (filterType === 'notes') {
      list = list.filter(f => f.extension === 'md');
    } else if (filterType === 'canvas') {
      list = list.filter(f => f.extension === 'canvas');
    } else if (filterType === 'media') {
      list = list.filter(f => f.extension !== 'md' && f.extension !== 'canvas');
    }

    if (!searchQuery.trim()) {
      // Sort by recency if query is empty
      return list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 15);
    }

    const q = searchQuery.toLowerCase().trim();
    const scored = list
      .map(file => {
        let score = 0;
        const nameLower = file.name.toLowerCase();
        const pathLower = file.path.toLowerCase();
        const contentLower = (file.content || '').toLowerCase();

        if (nameLower === q) score += 100;
        else if (nameLower.startsWith(q)) score += 60;
        else if (nameLower.includes(q)) score += 30;

        if (pathLower.includes(q)) score += 15;
        if (contentLower.includes(q)) score += 10;

        // Snippet extraction
        let snippet = '';
        if (contentLower) {
          const matchIdx = contentLower.indexOf(q);
          if (matchIdx !== -1) {
            const start = Math.max(0, matchIdx - 40);
            const end = Math.min(file.content.length, matchIdx + 80);
            snippet = file.content.slice(start, end).replace(/\n/g, ' ').trim();
          } else {
            snippet = file.content.slice(0, 100).replace(/\n/g, ' ').trim();
          }
        }

        return { file, score, snippet };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(s => ({ ...s.file, matchSnippet: s.snippet }));
  }, [files, searchQuery, filterType]);

  const renderFileIcon = (ext: string) => {
    if (ext === 'md') return <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (ext === 'canvas') return <LayoutGrid className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (['js', 'ts', 'tsx', 'py', 'json', 'css', 'html'].includes(ext)) {
      return <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#18181b] text-zinc-100 select-none overflow-hidden font-sans border border-white/10 shadow-2xl rounded-2xl">
      {/* 1. Header Toolbar (Draggable with App Region) */}
      <div 
        className="flex items-center justify-between px-3 py-2.5 bg-[#1f1f23]/95 border-b border-white/[0.08] backdrop-blur-md select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Brand & Vault Switcher */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-5 h-5 rounded-md bg-[#384CFF] flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3 text-white" />
          </div>

          {/* Vault Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsVaultMenuOpen(!isVaultMenuOpen);
                setIsFolderMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white tracking-tight transition-all cursor-pointer border border-white/[0.06]"
              title="Click to switch active vault"
            >
              <span className="truncate max-w-[130px]">{vaultName || 'Select Vault'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Vault Switcher Menu */}
            {isVaultMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-[#222226] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                  Switch Vault
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {vaults.map(v => {
                    const isActive = v.name === vaultName || v.path === vaultPath;
                    return (
                      <button
                        key={v.id || v.path}
                        onClick={() => handleSwitchVault(v.path)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-[#384CFF] text-white font-semibold'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{v.name}</span>
                        {isActive && <Check className="w-3 h-3 text-white shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Segmented Mode Switcher */}
        <div 
          className="flex items-center bg-black/40 rounded-full p-0.5 border border-white/[0.06]"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={() => setActiveTab('capture')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'capture'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            📥 Capture
          </button>
          <button
            onClick={() => setActiveTab('retrieve')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'retrieve'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🔍 Retrieve
          </button>
        </div>

        {/* Right Tools: Pin & Close */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={togglePin}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isPinned
                ? 'bg-[#384CFF]/20 text-[#384CFF] border border-[#384CFF]/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title={isPinned ? 'Window pinned (stays on top)' : 'Pin window to keep open'}
          >
            {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => window.electronAPI?.hideTrayWindow()}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Hide window (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-[#27272a] text-white border border-white/10 shadow-xl text-xs font-medium flex items-center gap-1.5 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[260px]">{toast.message}</span>
        </div>
      )}

      {/* 2. Main Content Body */}
      <div className="flex-1 overflow-hidden p-3.5 flex flex-col bg-[#18181b]">
        {/* ============================================================ */}
        {/* TAB 1: QUICK CAPTURE BOX                                     */}
        {/* ============================================================ */}
        {activeTab === 'capture' && (
          <div className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-0.5 bg-[#18181b]">
            {/* Target Folder Selector Row */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Folder className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save to Folder:</span>
              </div>

              {/* Folder Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-xs font-medium text-zinc-200 border border-white/[0.06] transition-all cursor-pointer"
                >
                  <span className="truncate max-w-[140px]">{selectedFolder || '/ (Root)'}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {isFolderMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#222226] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                      <span>Choose Folder</span>
                      <button
                        onClick={() => setIsCreatingFolder(true)}
                        className="text-[#384CFF] hover:underline cursor-pointer lowercase font-medium flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" /> new
                      </button>
                    </div>

                    {isCreatingFolder && (
                      <div className="p-1.5 mb-1 bg-black/30 rounded-lg flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') setIsCreatingFolder(false);
                          }}
                          placeholder="Folder name..."
                          autoFocus
                          className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none px-1"
                        />
                        <button
                          onClick={handleCreateFolder}
                          className="px-2 py-0.5 rounded bg-[#384CFF] text-[10px] text-white font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="space-y-0.5 max-h-40 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedFolder('');
                          setIsFolderMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                          !selectedFolder
                            ? 'bg-[#384CFF] text-white font-medium'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span>/ (Vault Root)</span>
                        {!selectedFolder && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {folders.map(f => {
                        const isSel = selectedFolder === f.path;
                        return (
                          <button
                            key={f.path}
                            onClick={() => {
                              setSelectedFolder(f.path);
                              setIsFolderMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                              isSel
                                ? 'bg-[#384CFF] text-white font-medium'
                                : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{f.path}</span>
                            {isSel && <Check className="w-3 h-3 text-white shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Drag & Drop Box */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragEnter={e => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                setIsDraggingOver(false);
              }}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-2 border-dashed p-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
                isDraggingOver
                  ? 'border-[#384CFF] bg-[#384CFF]/15 scale-[1.01] shadow-lg shadow-[#384CFF]/10'
                  : 'border-white/[0.12] hover:border-white/[0.25] bg-[#202024]/70 hover:bg-[#25252b]'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform ${
                isDraggingOver ? 'bg-[#384CFF] text-white scale-110 animate-bounce' : 'bg-white/[0.06] text-zinc-300 group-hover:scale-105'
              }`}>
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-white tracking-tight">
                {isDraggingOver ? 'Drop to save into ' + (selectedFolder || vaultName) : 'Drag & drop any file, image, text, or URL'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Saved instantly to your vault like bookmarking on Instagram
              </p>

              {/* Supported format badges */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400 font-mono">.md</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400 font-mono">.png / .jpg</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400 font-mono">.pdf</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400 font-mono">Text / Link</span>
              </div>
            </div>

            {/* Just Saved Notification Card ("Instagram-style Saved") */}
            {lastSaved && (
              <div className="p-3 rounded-xl bg-[#242429] border border-emerald-500/30 shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                      Saved to {lastSaved.vaultName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                    {lastSaved.folder}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-300 font-medium truncate">
                  📄 {lastSaved.fileName}
                </div>

                {lastSaved.previewText && (
                  <p className="text-[11px] text-zinc-400 italic line-clamp-2 bg-black/20 p-1.5 rounded-md">
                    "{lastSaved.previewText}"
                  </p>
                )}

                {/* Quick actions for saved item */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleOpenInMain(lastSaved.filePath)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#384CFF] hover:bg-[#4d5eff] text-white text-[11px] font-medium transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Runagon</span>
                  </button>
                  <button
                    onClick={() => handleRevealInFinder(lastSaved.filePath)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Finder</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`[[${lastSaved.fileName.replace(/\.[^/.]+$/, '')}]]`);
                      showToast('Copied link!');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] transition-all cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </button>
                  <button
                    onClick={() => setLastSaved(null)}
                    className="ml-auto text-zinc-500 hover:text-zinc-300 text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Quick Text / URL Capture Input Form */}
            <div className="flex-1 flex flex-col space-y-2 bg-[#202024] rounded-2xl p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Quick Note / URL Snippet
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">⌘Enter to save</span>
              </div>

              {/* Optional Title Input */}
              <input
                type="text"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Title (optional, auto-derived)..."
                className="w-full bg-black/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#384CFF] border border-white/[0.04]"
              />

              {/* Note Content Textarea */}
              <textarea
                ref={noteTextareaRef}
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                placeholder="Type or paste any text, thought, or link here..."
                rows={4}
                className="w-full flex-1 bg-black/20 rounded-lg p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#384CFF] border border-white/[0.04] resize-none leading-relaxed"
              />

              {/* Tags & Save Button Row */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 flex items-center gap-1.5 bg-black/20 rounded-lg px-2 py-1 border border-white/[0.04]">
                  <Tag className="w-3 h-3 text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={noteTags}
                    onChange={e => setNoteTags(e.target.value)}
                    placeholder="Tags (e.g. #idea #read)..."
                    className="w-full bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveNote}
                  disabled={isSaving || (!noteContent.trim() && !noteTitle.trim())}
                  className="px-4 py-1.5 rounded-lg bg-[#384CFF] hover:bg-[#4d5eff] disabled:opacity-40 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: QUICK RETRIEVAL BOX                                   */}
        {/* ============================================================ */}
        {activeTab === 'retrieve' && (
          <div className="flex-1 flex flex-col space-y-2.5 overflow-hidden">
            {/* Spotlight Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedResultIndex(0);
                }}
                placeholder={`Search notes & files in "${vaultName}"...`}
                className="w-full bg-[#202024] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#384CFF] border border-white/[0.08] shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 rounded-md text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1">
                {(['all', 'notes', 'canvas', 'media'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-all cursor-pointer ${
                      filterType === type
                        ? 'bg-[#384CFF] text-white shadow-xs'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {!searchQuery && (
                <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>Recently Modified</span>
                </div>
              )}

              {searchResults.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-zinc-500 text-xs">
                  <Search className="w-8 h-8 text-zinc-600 mb-2 stroke-[1.5]" />
                  <p className="font-medium text-zinc-300">No matching notes found</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
                    Try another keyword or switch to another vault above.
                  </p>
                </div>
              ) : (
                searchResults.map((file, idx) => {
                  const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                  const folderLabel = file.folder ? file.folder : 'Root';

                  return (
                    <div
                      key={file.path || idx}
                      className="group p-2.5 rounded-xl bg-[#202024] hover:bg-[#27272c] border border-white/[0.04] hover:border-white/[0.1] transition-all space-y-1.5 cursor-pointer"
                      onClick={() => handleCopyNoteContent(file)}
                    >
                      {/* Title & Metadata Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          {renderFileIcon(file.extension)}
                          <span className="font-semibold text-xs text-white truncate group-hover:text-[#8ea0ff] transition-colors">
                            {titleWithoutExt}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[100px] shrink-0">
                          {folderLabel}
                        </span>
                      </div>

                      {/* Snippet Preview */}
                      {(file as any).matchSnippet && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed bg-black/20 p-1.5 rounded-md select-text">
                          {(file as any).matchSnippet}
                        </p>
                      )}

                      {/* 1-Click Action Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[11px]">
                        <span className="text-[10px] text-zinc-500">
                          Click card to copy content
                        </span>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* 1. Copy Full Content */}
                          <button
                            onClick={() => handleCopyNoteContent(file)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                            title="Copy full note markdown to clipboard"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </button>

                          {/* 2. Copy Wikilink */}
                          <button
                            onClick={() => handleCopyWikilink(file)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                            title="Copy [[wikilink]]"
                          >
                            <span>Link</span>
                          </button>

                          {/* 3. Open in Main Window */}
                          <button
                            onClick={() => handleOpenInMain(file.path)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#384CFF]/30 hover:bg-[#384CFF] text-[#8ea0ff] hover:text-white transition-colors cursor-pointer text-[10px]"
                            title="Open note in main Runagon window"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Open</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Bar */}
      <div className="px-3 py-1.5 bg-[#17171a] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span>Runagon Tray</span>
          <span>•</span>
          <span className="font-mono">{files.length} notes</span>
        </div>
        <div className="flex items-center gap-2">
          <span>⌥Space to toggle</span>
          <span>•</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
