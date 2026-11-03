import React, { useState, useEffect } from 'react';
import { VaultInfo } from '../../types';
import { vault } from '../../services/vault';
import { 
  Folder, 
  RotateCcw, 
  Trash2, 
  CheckCircle, 
  Sparkles, 
  FolderOpen,
  ArrowRight,
  FileText,
  Plus,
  Compass,
  X,
  Cpu,
  Layers,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  Code2,
  GitBranch,
  Network
} from 'lucide-react';

export interface CodebaseIngestResult {
  ok: boolean;
  filesAnalyzed?: number;
  symbolsDiscovered?: number;
  dependenciesFound?: number;
  canvasPath?: string;
  reportPath?: string;
  godNodes?: Array<{
    file: string;
    symbolCount: number;
    importCount: number;
    score: number;
  }>;
  error?: string;
}

interface VaultSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  knownVaults: VaultInfo[];
  activeVaultPath: string;
  onOpenVault: (path: string) => void;
  onCreateVault: (path: string, copySandbox?: boolean) => void;
  onResetSandbox: () => void;
  onRemoveVault: (path: string) => void;
  initialTab?: 'vaults' | 'ingest';
  onOpenPath?: (path: string) => void;
}

export const VaultSwitcherModal: React.FC<VaultSwitcherModalProps> = ({
  isOpen,
  onClose,
  knownVaults,
  activeVaultPath,
  onOpenVault,
  onCreateVault,
  onResetSandbox,
  onRemoveVault,
  initialTab = 'vaults',
  onOpenPath
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'vaults' | 'ingest'>(initialTab);

  // Vault switching state
  const [newVaultPath, setNewVaultPath] = useState('');
  const [newVaultName, setNewVaultName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [includeStarterNotes, setIncludeStarterNotes] = useState(true);
  const [isBrowsingVault, setIsBrowsingVault] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Codebase Ingest state
  const [targetDir, setTargetDir] = useState<string>('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [result, setResult] = useState<CodebaseIngestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBrowsingCode, setIsBrowsingCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'vaults');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Vault Switcher Handlers
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

  const handleBrowseVaultFolder = async () => {
    setIsBrowsingVault(true);
    try {
      const picked = await vault.pickVaultFolder();
      if (picked) {
        setNewVaultPath(picked);
        setIsCreatingNew(true);
      }
    } catch {}
    setIsBrowsingVault(false);
  };

  const handleQuickPreset = (name: string) => {
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

  // Ingestion Handlers
  const handlePickCodeFolder = async () => {
    setIsBrowsingCode(true);
    try {
      const picked = await vault.pickVaultFolder();
      if (picked) {
        setTargetDir(picked);
      }
    } catch {}
    setIsBrowsingCode(false);
  };

  const handleRunIngestion = async () => {
    setIsIngesting(true);
    setResult(null);
    setErrorMessage(null);
    setProgressStep(1);

    const stepTimer1 = setTimeout(() => setProgressStep(2), 350);
    const stepTimer2 = setTimeout(() => setProgressStep(3), 700);

    try {
      const res = await vault.ingestCodebase(targetDir.trim() || undefined);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setProgressStep(4);

      if (res && res.ok) {
        setResult(res as CodebaseIngestResult);
      } else {
        setErrorMessage(res?.error || 'Failed to ingest codebase. Please ensure the target folder exists and contains supported code files.');
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setErrorMessage(err?.message || 'Error occurred during AST extraction.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleOpenArtifact = (relPath: string) => {
    if (onOpenPath) onOpenPath(relPath);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md select-none p-4 animate-in fade-in duration-150"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[660px] bg-white dark:bg-[#1A1A1E] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden text-[#18181B] dark:text-[#F4F4F5] max-h-[90vh] transition-colors"
      >
        
        {/* 1. Header with Runagon Logo, Tab Switcher & Close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#FAFAFC] dark:bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#384CFF] text-white flex items-center justify-center p-1.5 shadow-md shadow-blue-500/20 shrink-0">
              <img 
                src="/logo-symbol-white.png" 
                alt="Runagon" 
                className="w-5 h-5 object-contain" 
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#18181B] dark:text-white flex items-center gap-2">
                <span>Workspace & Codebase Hub</span>
              </h2>
              <div className="text-[11px] text-[#71717A] dark:text-zinc-400">
                Switch workspaces, open local folders, or map codebase architecture
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] dark:text-zinc-400 hover:text-[#18181B] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Top Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-[#1A1A1E]">
          <button
            onClick={() => setActiveTab('vaults')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'vaults'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-[#71717A] dark:text-zinc-400 hover:text-[#18181B] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Switch / Open Vault</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'vaults' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
            }`}>
              {knownVaults.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ingest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ingest'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-[#71717A] dark:text-zinc-400 hover:text-[#18181B] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ingest Codebase (AST & RAG)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'ingest' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
            }`}>
              Canvas
            </span>
          </button>
        </div>

        {/* 3. TAB 1: SWITCH / OPEN VAULT */}
        {activeTab === 'vaults' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Vaults if > 2 */}
            {knownVaults.length > 2 && (
              <div className="px-6 pt-3 pb-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter known vaults..."
                  className="w-full bg-[#F4F4F6] dark:bg-[#222227] border border-black/10 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs text-[#18181B] dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#384CFF]"
                />
              </div>
            )}

            {/* Known Vaults List */}
            <div className="p-6 space-y-2.5 overflow-y-auto max-h-[320px]">
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
                        ? 'bg-[#384CFF]/[0.06] border-[#384CFF]/30 text-[#18181B] dark:text-white shadow-xs'
                        : 'bg-[#F8F8FA] dark:bg-[#202024] hover:bg-white dark:hover:bg-[#25252A] border-black/[0.06] dark:border-white/[0.06] text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 truncate mr-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.05] dark:border-white/[0.05] ${
                        isActive ? 'bg-[#384CFF] text-white shadow-sm' : 'bg-[#EBEBEF] dark:bg-white/[0.08] text-[#18181B] dark:text-white'
                      }`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#18181B] dark:text-white flex items-center gap-2">
                          <span className="truncate">{v.name}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-[#384CFF] text-white text-[10px] font-medium shadow-xs flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              <span>Active</span>
                            </span>
                          )}
                          {typeof v.noteCount === 'number' && v.noteCount > 0 && (
                            <span className="text-[10px] text-[#8E8E93] dark:text-zinc-500 font-normal">
                              • {v.noteCount} {v.noteCount === 1 ? 'note' : 'notes'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[#8E8E93] dark:text-zinc-500 truncate mt-0.5 group-hover:text-[#585860] dark:group-hover:text-zinc-300">
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
                          className="px-3 py-1 rounded-lg bg-[#384CFF] hover:bg-[#2D3ECC] text-white text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shadow-xs cursor-pointer"
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
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#8E8E93] hover:text-rose-600 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all cursor-pointer"
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

            {/* Actions & Creation Panel */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] bg-[#FAFAFC] dark:bg-[#161619] p-5 space-y-3.5">
              {isCreatingNew ? (
                <form onSubmit={handleCreateSubmit} className="space-y-3 bg-white dark:bg-[#202024] p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#18181B] dark:text-white font-semibold block">
                      Create or Open Folder as Vault:
                    </label>
                    <button
                      type="button"
                      onClick={handleBrowseVaultFolder}
                      disabled={isBrowsingVault}
                      className="text-xs text-[#384CFF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isBrowsingVault ? 'Choosing...' : 'Browse Computer...'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newVaultPath}
                      onChange={e => setNewVaultPath(e.target.value)}
                      placeholder="/Users/username/Documents/MyVault"
                      autoFocus
                      className="flex-1 bg-[#F4F4F6] dark:bg-[#2A2A30] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#18181B] dark:text-white focus:border-[#384CFF] focus:outline-none font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!newVaultPath.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#384CFF] hover:bg-[#2D3ECC] text-white disabled:opacity-50 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Open / Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-2 rounded-xl bg-[#EBEBEF] dark:bg-white/[0.08] text-[#585860] dark:text-zinc-300 text-xs hover:bg-[#E0E0E6] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Starter notes checkbox */}
                  <label className="flex items-center gap-2 text-xs text-[#585860] dark:text-zinc-400 hover:text-[#18181B] dark:hover:text-white cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={includeStarterNotes}
                      onChange={e => setIncludeStarterNotes(e.target.checked)}
                      className="rounded border-black/20 dark:border-white/20 text-[#384CFF] focus:ring-0 cursor-pointer"
                    />
                    <span>Include starter guides and notes in new vault</span>
                  </label>

                  {/* Quick Presets */}
                  <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-2 text-[11px] text-[#8E8E93] dark:text-zinc-500">
                    <span>Presets:</span>
                    {['Personal Notes', 'Work Projects', 'Second Brain'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickPreset(preset)}
                        className="px-2 py-0.5 rounded-full bg-[#F4F4F6] dark:bg-white/[0.06] hover:bg-[#EBEBEF] text-[#18181B] dark:text-zinc-200 border border-black/[0.05] dark:border-white/[0.05] transition-colors cursor-pointer"
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#384CFF] hover:bg-[#2D3ECC] text-white font-medium transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Vault</span>
                    </button>

                    <button
                      onClick={handleBrowseVaultFolder}
                      disabled={isBrowsingVault}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#222226] border border-black/[0.08] dark:border-white/[0.08] text-[#18181B] dark:text-white font-medium transition-colors hover:bg-[#F4F4F6] dark:hover:bg-[#2A2A30] cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400" />
                      <span>{isBrowsingVault ? 'Browsing...' : 'Open Existing Folder'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Reset to the genuine Runagon Sandbox vault on disk?')) {
                        onResetSandbox();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#222226] border border-black/[0.08] dark:border-white/[0.08] text-[#71717A] dark:text-zinc-300 hover:text-[#18181B] dark:hover:text-white font-medium transition-colors hover:bg-[#F4F4F6] dark:hover:bg-[#2A2A30] cursor-pointer"
                    title="Re-seed standard demo notes"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#384CFF]" />
                    <span>Reset Sandbox</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. TAB 2: INGEST CODEBASE ARCHITECTURE (AST & RAG) */}
        {activeTab === 'ingest' && (
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Target Folder Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#18181B] dark:text-white flex items-center justify-between">
                <span>Codebase Folder on Computer:</span>
                <span className="text-[11px] font-normal text-[#71717A] dark:text-zinc-400">
                  Leave empty to analyze current vault
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-zinc-400" />
                  <input
                    type="text"
                    value={targetDir}
                    onChange={e => setTargetDir(e.target.value)}
                    placeholder="/path/to/any/project or empty for vault root"
                    disabled={isIngesting}
                    className="w-full bg-[#F4F4F6] dark:bg-[#222227] border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#18181B] dark:text-white focus:outline-none focus:border-[#384CFF] disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handlePickCodeFolder}
                  disabled={isIngesting || isBrowsingCode}
                  className="px-3 py-2 rounded-xl bg-[#F4F4F6] dark:bg-[#222227] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A30] border border-black/10 dark:border-white/10 text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400" />
                  <span>{isBrowsingCode ? 'Choosing...' : 'Browse Computer...'}</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-[#71717A] dark:text-zinc-400">
                <span>Presets:</span>
                <button
                  type="button"
                  onClick={() => setTargetDir('')}
                  className="px-2 py-0.5 rounded-full bg-[#F4F4F6] dark:bg-white/[0.06] hover:bg-[#EBEBEF] text-[#18181B] dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.06] transition-colors cursor-pointer"
                >
                  Vault Root
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDir('src')}
                  className="px-2 py-0.5 rounded-full bg-[#F4F4F6] dark:bg-white/[0.06] hover:bg-[#EBEBEF] text-[#18181B] dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.06] transition-colors cursor-pointer"
                >
                  src/
                </button>
              </div>
            </div>

            {/* Pipeline Process Overview */}
            <div className="p-3.5 rounded-2xl bg-[#F8F8FA] dark:bg-[#202024] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <div className="text-xs font-semibold text-[#18181B] dark:text-white flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-[#384CFF]" />
                <span>Deterministic Graphify Pipeline</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                  <div className="font-medium text-[#18181B] dark:text-white flex items-center gap-1 mb-0.5">
                    <Code2 className="w-3 h-3 text-blue-500" />
                    <span>Pass 1: AST Scan</span>
                  </div>
                  <p className="text-[#71717A] dark:text-zinc-400 text-[10px]">
                    Discovers functions, classes, exports & imports
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                  <div className="font-medium text-[#18181B] dark:text-white flex items-center gap-1 mb-0.5">
                    <Network className="w-3 h-3 text-purple-500" />
                    <span>Pass 2: Topology</span>
                  </div>
                  <p className="text-[#71717A] dark:text-zinc-400 text-[10px]">
                    Identifies God Nodes, hub components & subsystems
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                  <div className="font-medium text-[#18181B] dark:text-white flex items-center gap-1 mb-0.5">
                    <LayoutGrid className="w-3 h-3 text-emerald-500" />
                    <span>Pass 3: Visual Map</span>
                  </div>
                  <p className="text-[#71717A] dark:text-zinc-400 text-[10px]">
                    Auto-generates ARCHITECTURE.canvas & RAG memory
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Progress Step Bar */}
            {isIngesting && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#384CFF]/[0.06] border border-[#384CFF]/20">
                <div className="flex items-center justify-between text-xs font-semibold text-[#384CFF]">
                  <span>Analyzing files & building AST graph...</span>
                  <span className="font-mono">Step {progressStep} of 4</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#384CFF] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(progressStep / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Result Panel */}
            {result && result.ok && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Ingestion & Architecture Extraction Complete!</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="text-[10px] text-[#71717A] dark:text-zinc-400">Files Analyzed</div>
                    <div className="text-base font-bold text-[#18181B] dark:text-white mt-0.5">{result.filesAnalyzed}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="text-[10px] text-[#71717A] dark:text-zinc-400">Symbols Extracted</div>
                    <div className="text-base font-bold text-[#18181B] dark:text-white mt-0.5">{result.symbolsDiscovered}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="text-[10px] text-[#71717A] dark:text-zinc-400">Dependencies Found</div>
                    <div className="text-base font-bold text-[#18181B] dark:text-white mt-0.5">{result.dependenciesFound}</div>
                  </div>
                </div>

                {/* God Nodes list */}
                {result.godNodes && result.godNodes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-[#18181B] dark:text-white flex items-center justify-between">
                      <span>Central God Nodes (Critical Architectural Hubs):</span>
                      <span className="text-[10px] text-[#71717A] dark:text-zinc-400 font-mono">Centrality Rank</span>
                    </div>
                    <div className="space-y-1">
                      {result.godNodes.slice(0, 3).map((gn, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-black/[0.04] dark:border-white/[0.04]">
                          <span className="font-mono text-[11px] truncate">{gn.file}</span>
                          <span className="text-[10px] font-mono text-[#384CFF] bg-[#384CFF]/10 px-2 py-0.5 rounded-md">
                            score: {gn.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Architecture Artifact Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {result.canvasPath && (
                    <button
                      onClick={() => handleOpenArtifact(result.canvasPath!)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#384CFF] hover:bg-[#2D3ECC] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Open {result.canvasPath}</span>
                    </button>
                  )}
                  {result.reportPath && (
                    <button
                      onClick={() => handleOpenArtifact(result.reportPath!)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-[#222226] border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#F4F4F6] text-[#18181B] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#384CFF]" />
                      <span>Open {result.reportPath}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Run Ingestion Action Button */}
            {!result && (
              <button
                onClick={handleRunIngestion}
                disabled={isIngesting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#384CFF] hover:bg-[#2D3ECC] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>{isIngesting ? 'Analyzing Architecture...' : 'Run AST Ingestion & Generate .canvas'}</span>
              </button>
            )}

            {result && (
              <button
                onClick={() => {
                  setResult(null);
                  setProgressStep(0);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#F4F4F6] dark:bg-[#222227] hover:bg-[#EBEBEF] text-xs font-medium text-[#71717A] dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Scan Another Folder
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
