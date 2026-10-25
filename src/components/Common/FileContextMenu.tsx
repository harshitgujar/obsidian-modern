import React, { useState, useEffect, useRef } from 'react';
import { VaultFile } from '../../types';
import { vault } from '../../services/vault';
import {
  Copy,
  Repeat,
  Trash2,
  Maximize2,
  ExternalLink,
  Columns,
  FolderInput,
  Bookmark,
  ChevronRight,
  FolderOpen,
  Compass,
  FileText,
  Image as ImageIcon,
  Film,
  Volume2,
  FileCode,
  LayoutDashboard,
  Link as LinkIcon,
  Printer,
  Edit3,
  Check,
  Search,
  X,
  FilePlus
} from 'lucide-react';

export interface FileContextMenuProps {
  x: number;
  y: number;
  file: VaultFile;
  embedContext?: {
    rawEmbedText?: string; // e.g. "![[Attachments/photo.png|200]]"
    onRemoveEmbed?: () => void;
    onResetSize?: () => void;
    onSwapFile?: (newFilePath: string) => void;
  };
  onClose: () => void;
  onOpenFile?: (path: string) => void;
  onOpenSplit?: (path: string) => void;
  onRenameFile?: (file: VaultFile, newName: string) => void;
  onDeleteFile?: (path: string) => void;
  onBookmarkFile?: (path: string, title?: string) => void;
  isBookmarked?: boolean;
  onDuplicateFile?: (path: string) => void;
  onRevealInNavigation?: (path: string) => void;
  onOpenLocalGraph?: (path: string) => void;
  onExportPdf?: (path: string) => void;
  allFiles?: VaultFile[];
  folders?: string[];
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  file,
  embedContext,
  onClose,
  onOpenFile,
  onOpenSplit,
  onRenameFile,
  onDeleteFile,
  onBookmarkFile,
  isBookmarked = false,
  onDuplicateFile,
  onRevealInNavigation,
  onOpenLocalGraph,
  onExportPdf,
  allFiles = [],
  folders = []
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showCopySubmenu, setShowCopySubmenu] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  
  // Modals inside context menu
  const [isSwappingFile, setIsSwappingFile] = useState(false);
  const [swapQuery, setSwapQuery] = useState('');
  const [isMovingFile, setIsMovingFile] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);

  const ext = file.extension.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
  const isPdf = ext === 'pdf';
  const isMd = ext === 'md';
  const isCanvas = ext === 'canvas';
  const isMedia = isImage || isVideo || isAudio;

  // Reposition inside viewport
  const menuWidth = 240;
  const menuHeight = 440;
  let posX = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, x));
  let posY = Math.max(10, Math.min(window.innerHeight - menuHeight - 10, y));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(`/api/vault/file/raw?path=${encodeURIComponent(file.path)}`);
      const blob = await res.blob();
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setCopiedType('image');
        setTimeout(() => onClose(), 600);
        return;
      }
    } catch {}
    // Fallback: copy file path or markdown embed
    copyToClipboard(`![[${file.path}]]`, 'wikilink');
  };

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== file.name) {
      if (onRenameFile) {
        onRenameFile(file, trimmed);
      } else {
        const dir = file.folder ? `${file.folder}/` : '';
        const newPath = `${dir}${trimmed}`;
        vault.renameNote(file.path, newPath);
      }
    }
    onClose();
  };

  const handleMoveToFolder = async (destFolder: string) => {
    const targetFolder = destFolder.replace(/^\//, '').replace(/\/$/, '');
    const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
    if (newPath !== file.path) {
      await vault.renameNote(file.path, newPath);
    }
    onClose();
  };

  // Filter vault files for Swap modal
  const eligibleSwapFiles = allFiles.filter(f => {
    if (f.path === file.path) return false;
    if (isImage) return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(f.extension.toLowerCase());
    if (isVideo) return ['mp4', 'webm', 'mov', 'mkv'].includes(f.extension.toLowerCase());
    if (isAudio) return ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(f.extension.toLowerCase());
    if (isPdf) return f.extension.toLowerCase() === 'pdf';
    return true;
  }).filter(f => f.name.toLowerCase().includes(swapQuery.toLowerCase()));

  // Render swap file dialog
  if (isSwappingFile) {
    return (
      <div
        ref={menuRef}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className="fixed z-[10000] w-72 bg-[#18181e]/98 backdrop-blur-2xl border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-semibold text-zinc-200">
          <span className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-purple-400" />
            <span>Swap file</span>
          </span>
          <button onClick={() => setIsSwappingFile(false)} className="text-zinc-500 hover:text-zinc-200 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative my-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={swapQuery}
            onChange={e => setSwapQuery(e.target.value)}
            placeholder="Search replacement..."
            autoFocus
            className="w-full bg-[#121216] border border-zinc-700/70 focus:border-purple-500 rounded-lg pl-7 pr-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {eligibleSwapFiles.length === 0 ? (
            <div className="p-3 text-center text-zinc-500 italic text-[11px]">No matching files</div>
          ) : (
            eligibleSwapFiles.slice(0, 15).map(f => (
              <button
                key={f.path}
                onClick={() => {
                  if (embedContext?.onSwapFile) {
                    embedContext.onSwapFile(f.path);
                  }
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-zinc-800 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 truncate">
                  {isImage ? <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  <span className="truncate text-zinc-200 group-hover:text-white">{f.name}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono truncate">{f.folder || '/'}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Render Move to folder dialog
  if (isMovingFile) {
    const uniqueFolders = Array.from(new Set(['', ...folders])).sort();
    return (
      <div
        ref={menuRef}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className="fixed z-[10000] w-64 bg-[#18181e]/98 backdrop-blur-2xl border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-semibold text-zinc-200">
          <span className="flex items-center gap-1.5">
            <FolderInput className="w-3.5 h-3.5 text-purple-400" />
            <span>Move to folder</span>
          </span>
          <button onClick={() => setIsMovingFile(false)} className="text-zinc-500 hover:text-zinc-200 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5 mt-2">
          {uniqueFolders.map(f => (
            <button
              key={f || 'root'}
              onClick={() => handleMoveToFolder(f)}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-zinc-800 text-left transition-colors text-zinc-300 hover:text-white"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{f || 'Vault root (/) '}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render Rename dialog
  if (isRenaming) {
    return (
      <div
        ref={menuRef}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className="fixed z-[10000] w-64 bg-[#18181e]/98 backdrop-blur-2xl border border-zinc-700/80 rounded-xl shadow-2xl p-3 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-semibold text-zinc-200">
          <span>Rename file</span>
          <button onClick={() => setIsRenaming(false)} className="text-zinc-500 hover:text-zinc-200 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="my-2.5">
          <input
            type="text"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirmRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            autoFocus
            className="w-full bg-[#121216] border border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setIsRenaming(false)}
            className="px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmRename}
            className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium"
          >
            Rename
          </button>
        </div>
      </div>
    );
  }

  // Get display file icon
  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
    if (isVideo) return <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    if (isAudio) return <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (isPdf) return <FileCode className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    if (isCanvas) return <LayoutDashboard className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-[10000] w-56 bg-[#18181e]/98 backdrop-blur-2xl border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-300 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      {/* File Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800 mb-0.5 truncate">
        {getFileIcon()}
        <span className="truncate text-zinc-200 font-medium">{file.name}</span>
      </div>

      {/* 1. Primary Media Options (Copy Image, Swap file, Remove, Reset size) */}
      {isImage && (
        <button
          onClick={handleCopyImage}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy image</span>
          </span>
          {copiedType === 'image' && <Check className="w-3 h-3 text-emerald-400" />}
        </button>
      )}

      {embedContext?.onSwapFile && (
        <button
          onClick={() => setIsSwappingFile(true)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5 text-purple-400" />
            <span>Swap file...</span>
          </span>
        </button>
      )}

      {embedContext?.onRemoveEmbed && (
        <button
          onClick={() => {
            embedContext.onRemoveEmbed?.();
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <X className="w-3.5 h-3.5 text-zinc-400" />
            <span>Remove {isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file'}</span>
          </span>
        </button>
      )}

      {embedContext?.onResetSize && isImage && (
        <button
          onClick={() => {
            embedContext.onResetSize?.();
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors text-zinc-400"
        >
          <span className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Reset size</span>
          </span>
        </button>
      )}

      {(isImage || embedContext) && <div className="h-[1px] bg-zinc-800 my-0.5" />}

      {/* 2. Navigation Actions: Open in new tab, Open to the right */}
      {onOpenFile && (
        <button
          onClick={() => {
            onOpenFile(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Open</span>
          </span>
        </button>
      )}

      {onOpenSplit && (
        <button
          onClick={() => {
            onOpenSplit(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Columns className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open to the right</span>
          </span>
        </button>
      )}

      {onDuplicateFile && (
        <button
          onClick={() => {
            onDuplicateFile(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Make a copy</span>
          </span>
        </button>
      )}

      {onExportPdf && isMd && (
        <button
          onClick={() => {
            onExportPdf(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Export to PDF...</span>
          </span>
        </button>
      )}

      <div className="h-[1px] bg-zinc-800 my-0.5" />

      {/* 3. Management: Rename, Move, Bookmark */}
      <button
        onClick={() => setIsRenaming(true)}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Rename...</span>
        </span>
      </button>

      <button
        onClick={() => setIsMovingFile(true)}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <FolderInput className="w-3.5 h-3.5 text-zinc-400" />
          <span>Move file to...</span>
        </span>
      </button>

      {onBookmarkFile && (
        <button
          onClick={() => {
            onBookmarkFile(file.path, file.name.replace(/\.[^/.]+$/, ''));
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
            <span>{isBookmarked ? 'Remove bookmark' : 'Bookmark...'}</span>
          </span>
        </button>
      )}

      {/* 4. Copy Path Submenu */}
      <div className="relative group">
        <button
          onMouseEnter={() => setShowCopySubmenu(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy path</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {showCopySubmenu && (
          <div
            onMouseLeave={() => setShowCopySubmenu(false)}
            className="absolute left-full top-0 ml-1 w-48 bg-[#18181e]/98 backdrop-blur-2xl border border-zinc-700/80 rounded-xl shadow-2xl p-1 text-xs text-zinc-300 space-y-0.5 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={() => copyToClipboard(file.path, 'rel')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-800 text-left transition-colors"
            >
              <span>Copy file path</span>
              {copiedType === 'rel' && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              onClick={() => copyToClipboard(file.name.replace(/\.[^/.]+$/, ''), 'title')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-800 text-left transition-colors"
            >
              <span>Copy title</span>
              {copiedType === 'title' && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              onClick={() => copyToClipboard(isMedia ? `![[${file.path}]]` : `[[${file.name.replace(/\.[^/.]+$/, '')}]]`, 'wiki')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-800 text-left transition-colors font-mono text-[11px]"
            >
              <span>{isMedia ? '![[wikilink]]' : '[[wikilink]]'}</span>
              {copiedType === 'wiki' && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              onClick={() => copyToClipboard(isMedia ? `![${file.name}](${file.path})` : `[${file.name}](${file.path})`, 'md')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-800 text-left transition-colors font-mono text-[11px]"
            >
              <span>[markdown](...)</span>
              {copiedType === 'md' && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
          </div>
        )}
      </div>

      <div className="h-[1px] bg-zinc-800 my-0.5" />

      {/* 5. System Integration & Graph */}
      <button
        onClick={() => {
          vault.openInDefaultApp(file.path);
          onClose();
        }}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          <span>Open in default app</span>
        </span>
      </button>

      <button
        onClick={() => {
          vault.revealInSystemExplorer(file.path);
          onClose();
        }}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>Reveal in Finder</span>
        </span>
      </button>

      {onRevealInNavigation && (
        <button
          onClick={() => {
            onRevealInNavigation(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reveal file in navigation</span>
          </span>
        </button>
      )}

      {onOpenLocalGraph && (
        <button
          onClick={() => {
            onOpenLocalGraph(file.path);
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Open in local 3D Graph</span>
          </span>
        </button>
      )}

      {/* 6. Destructive: Delete */}
      {onDeleteFile && (
        <>
          <div className="h-[1px] bg-zinc-800 my-0.5" />
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
                onDeleteFile(file.path);
              }
              onClose();
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete {isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file'}</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
};
