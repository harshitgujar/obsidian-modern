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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-md select-none p-4">
      <div className="skeuo-modal w-full max-w-[620px] overflow-hidden flex flex-col text-[#111113] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.05)] border border-black/[0.08] max-h-[90vh]">
        
        {/* 1. Header with Runagon Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl skeuo-card flex items-center justify-center p-1.5">
              <img 
                src="/logo-symbol.png" 
                alt="Runagon" 
                className="w-5 h-5 object-contain" 
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111113] flex items-center gap-2">
                <span>Manage Runagon Vaults</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ebebef] text-[#18181b] border border-black/[0.05]">
                  {knownVaults.length} {knownVaults.length === 1 ? 'Vault' : 'Vaults'}
                </span>
              </h2>
              <div className="text-[11px] text-[#585860]">Switch between your local workspaces or create new vaults on disk</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#111113] hover:bg-[#ebebef] transition-colors"
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
              className="w-full bg-[#f4f4f6] border border-black/10 rounded-full px-3.5 py-1.5 text-xs text-[#111113] placeholder-[#8e8e93] focus:outline-none focus:border-black/30"
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
                className={`group flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-white border-black/[0.12] text-[#111113] shadow-sm'
                    : 'bg-[#f8f8fa] hover:bg-white hover:shadow-sm border-black/[0.05] text-[#585860] hover:text-[#111113]'
                }`}
              >
                <div className="flex items-center gap-3.5 truncate mr-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.05] ${
                    isActive ? 'bg-[#18181b] text-white shadow-sm' : 'bg-[#ebebef] text-[#18181b]'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs text-[#111113] flex items-center gap-2">
                      <span className="truncate">{v.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-[#18181b] text-white text-[10px] font-medium shadow-sm flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      )}
                      {typeof v.noteCount === 'number' && v.noteCount > 0 && (
                        <span className="text-[10px] text-[#8e8e93] font-normal">
                          • {v.noteCount} {v.noteCount === 1 ? 'note' : 'notes'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#8e8e93] truncate mt-0.5 group-hover:text-[#585860]">
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
                      className="px-3 py-1 rounded-lg skeuo-btn-dark text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#8e8e93] hover:text-rose-600 hover:bg-[#ebebef] transition-all"
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
        <div className="border-t border-black/[0.06] bg-[#f8f8fa] p-5 space-y-3.5">
          {isCreatingNew ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3 bg-white p-4 rounded-2xl border border-black/[0.07] shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#111113] font-semibold block">
                  Create or Open Folder as Vault:
                </label>
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  disabled={isBrowsing}
                  className="text-xs text-[#18181b] hover:underline font-medium flex items-center gap-1"
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
                  className="flex-1 bg-[#f4f4f6] border border-black/10 rounded-xl px-3 py-2 text-xs text-[#111113] focus:border-black/30 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={!newVaultPath.trim()}
                  className="px-3.5 py-2 rounded-xl skeuo-btn-dark disabled:opacity-50 font-medium text-xs shadow-sm transition-colors"
                >
                  Open / Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-2 rounded-xl skeuo-btn text-xs text-[#585860]"
                >
                  Cancel
                </button>
              </div>

              {/* Starter notes checkbox */}
              <label className="flex items-center gap-2 text-xs text-[#585860] hover:text-[#111113] cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={includeStarterNotes}
                  onChange={e => setIncludeStarterNotes(e.target.checked)}
                  className="rounded border-black/20 text-[#18181b] focus:ring-0 cursor-pointer"
                />
                <span>Include starter guides and notes in new vault</span>
              </label>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-black/[0.05] flex items-center gap-2 text-[11px] text-[#8e8e93]">
                <span>Presets:</span>
                {['Personal Notes', 'Work Projects', 'Second Brain'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2 py-0.5 rounded-full bg-[#f4f4f6] hover:bg-[#ebebef] text-[#111113] border border-black/[0.05] transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl skeuo-btn-dark font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Vault</span>
                </button>

                <button
                  onClick={handleBrowseFolder}
                  disabled={isBrowsing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl skeuo-btn font-medium transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#585860]" />
                  <span>{isBrowsing ? 'Browsing...' : 'Open Existing Folder'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm('Reset to the genuine Runagon Sandbox vault on disk?')) {
                    onResetSandbox();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl skeuo-btn font-medium transition-colors"
                title="Re-seed standard demo notes"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Reset Sandbox</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
