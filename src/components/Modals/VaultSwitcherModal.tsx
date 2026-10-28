import React, { useState } from 'react';
import { VaultInfo } from '../../types';
import { vault } from '../../services/vault';
import { 
  Folder, 
  FolderPlus, 
  RotateCcw, 
  Trash2, 
  CheckCircle, 
  Sparkles, 
  FolderOpen,
  ArrowRight,
  FileText,
  Plus,
  Compass,
  X
} from 'lucide-react';

interface VaultSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  knownVaults: VaultInfo[];
  activeVaultPath: string;
  onOpenVault: (path: string) => void;
  onCreateVault: (path: string, copySandbox?: boolean) => void;
  onResetSandbox: () => void;
  onRemoveVault: (path: string) => void;
}

export const VaultSwitcherModal: React.FC<VaultSwitcherModalProps> = ({
  isOpen,
  onClose,
  knownVaults,
  activeVaultPath,
  onOpenVault,
  onCreateVault,
  onResetSandbox,
  onRemoveVault
}) => {
  const [newVaultPath, setNewVaultPath] = useState('');
  const [newVaultName, setNewVaultName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [includeStarterNotes, setIncludeStarterNotes] = useState(true);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPath = newVaultPath.trim();
    if (finalPath) {
      onCreateVault(finalPath, includeStarterNotes);
      setNewVaultPath('');
      setNewVaultName('');
      setIsCreatingNew(false);
    }
  };

  const handleBrowseFolder = async () => {
    setIsBrowsing(true);
    try {
      const picked = await vault.pickVaultFolder();
      if (picked) {
        setNewVaultPath(picked);
        setIsCreatingNew(true);
      }
    } catch {}
    setIsBrowsing(false);
  };

  const handleQuickPreset = (name: string) => {
    // Generate intelligent path based on active vault parent
    const parentDir = activeVaultPath ? activeVaultPath.replace(/[\/\\][^\/\\]+$/, '') : '';
    const suggested = parentDir ? `${parentDir}/${name}` : `/Users/${name}`;
    setNewVaultPath(suggested);
    setNewVaultName(name);
    setIsCreatingNew(true);
  };

  const filteredVaults = knownVaults.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md select-none p-4">
      <div className="w-full max-w-[620px] bg-[#141417] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[90vh]">
        
        {/* 1. Header with Runagon Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <img 
                src="/logo-symbol.png" 
                alt="Runagon" 
                className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(68,87,255,0.5)]" 
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>Manage Runagon Vaults</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {knownVaults.length} {knownVaults.length === 1 ? 'Vault' : 'Vaults'}
                </span>
              </h2>
              <div className="text-[11px] text-zinc-400">Switch between your local workspaces or create new vaults on disk</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Search & Filter (if more than 3 vaults) */}
        {knownVaults.length > 2 && (
          <div className="px-6 pt-4 pb-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your vaults..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        )}

        {/* 3. Known Vaults List */}
        <div className="p-6 space-y-2.5 overflow-y-auto max-h-[340px]">
          {filteredVaults.map(v => {
            const isActive = v.path === activeVaultPath;
            return (
              <div
                key={v.id}
                onClick={() => {
                  if (!isActive) onOpenVault(v.path);
                }}
                className={`group flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#212330] border-blue-500/40 text-white shadow-md'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3.5 truncate mr-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-blue-600/25 text-blue-400' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs text-zinc-200 flex items-center gap-2">
                      <span className="truncate">{v.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-medium shadow-sm flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      )}
                      {typeof v.noteCount === 'number' && v.noteCount > 0 && (
                        <span className="text-[10px] text-zinc-400 font-normal">
                          • {v.noteCount} {v.noteCount === 1 ? 'note' : 'notes'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5 group-hover:text-zinc-400">
                      {v.path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenVault(v.path);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <span>Switch</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {!isActive && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Remove "${v.name}" from known vaults?\n(Your notes on disk will NOT be deleted).`)) {
                          onRemoveVault(v.path);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-all"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Actions & Creation Panel */}
        <div className="border-t border-white/[0.08] bg-black/20 p-5 space-y-3.5">
          {isCreatingNew ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-200 font-semibold block">
                  Create or Open Folder as Vault:
                </label>
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  disabled={isBrowsing}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{isBrowsing ? 'Choosing...' : 'Browse Computer...'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVaultPath}
                  onChange={e => setNewVaultPath(e.target.value)}
                  placeholder="/Users/username/Documents/MyVault"
                  autoFocus
                  className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={!newVaultPath.trim()}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
                >
                  Open / Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  Cancel
                </button>
              </div>

              {/* Starter notes checkbox */}
              <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={includeStarterNotes}
                  onChange={e => setIncludeStarterNotes(e.target.checked)}
                  className="rounded border-zinc-700 text-blue-600 focus:ring-0 bg-zinc-900 cursor-pointer"
                />
                <span>Include starter guides and notes in new vault</span>
              </label>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-zinc-500">
                <span>Presets:</span>
                {['Personal Notes', 'Work Projects', 'Second Brain'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Vault</span>
                </button>

                <button
                  onClick={handleBrowseFolder}
                  disabled={isBrowsing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-medium transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isBrowsing ? 'Browsing...' : 'Open Existing Folder'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm('Reset to the genuine Runagon Sandbox vault on disk?')) {
                    onResetSandbox();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300 hover:bg-blue-900/40 font-medium transition-colors"
                title="Re-seed standard demo notes"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Reset Sandbox</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
