import React, { useState } from 'react';
import { VaultInfo } from '../../types';
import { 
  Folder, 
  FolderPlus, 
  RotateCcw, 
  Trash2, 
  CheckCircle, 
  Sparkles, 
  ExternalLink,
  X
} from 'lucide-react';

interface VaultSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  knownVaults: VaultInfo[];
  activeVaultPath: string;
  onOpenVault: (path: string) => void;
  onCreateVault: (path: string) => void;
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
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVaultPath.trim()) {
      onCreateVault(newVaultPath.trim());
      setNewVaultPath('');
      setIsCreatingNew(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[580px] bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Manage Runagon Vaults</h2>
              <div className="text-[11px] text-zinc-400">Your vaults stored locally on disk</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Known Vaults List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {knownVaults.map(v => {
            const isActive = v.path === activeVaultPath;
            return (
              <div
                key={v.id}
                onClick={() => {
                  if (!isActive) onOpenVault(v.path);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl border-none transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2a2b36] text-white shadow-sm'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/50 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Folder className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#705dcf]' : 'text-zinc-400'}`} />
                  <div className="truncate">
                    <div className="font-semibold text-xs text-zinc-200 flex items-center gap-2">
                      <span>{v.name}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded bg-[#705dcf] text-white text-[10px] font-medium border-none shadow-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                      {v.path}
                    </div>
                  </div>
                </div>

                {!isActive && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Remove "${v.name}" from known vaults?`)) {
                        onRemoveVault(v.path);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                    title="Remove from list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions Bar */}
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          {isCreatingNew ? (
            <form onSubmit={handleCreateSubmit} className="space-y-2">
              <label className="text-xs text-zinc-300 font-medium block">
                Enter Absolute Folder Path for New Vault:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVaultPath}
                  onChange={e => setNewVaultPath(e.target.value)}
                  placeholder="/Users/username/Documents/MyRunagonVault"
                  autoFocus
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-sm"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => setIsCreatingNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:border-purple-500/50 hover:bg-zinc-850 font-medium transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
                <span>Open or Create Folder as Vault</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset to the genuine Runagon Sandbox vault on disk?')) {
                    onResetSandbox();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-950/40 border border-purple-800/60 text-purple-300 hover:bg-purple-900/60 font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reset Sandbox Vault</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
