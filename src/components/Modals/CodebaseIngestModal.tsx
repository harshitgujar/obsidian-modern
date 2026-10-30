import React, { useState } from 'react';
import { 
  Cpu, 
  X, 
  Folder, 
  Sparkles, 
  LayoutGrid, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  GitBranch, 
  Network, 
  Code2, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { vault } from '../../services/vault';

interface CodebaseIngestResult {
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

interface CodebaseIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPath: (path: string) => void;
}

export const CodebaseIngestModal: React.FC<CodebaseIngestModalProps> = ({
  isOpen,
  onClose,
  onOpenPath
}) => {
  const [targetDir, setTargetDir] = useState<string>('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [result, setResult] = useState<CodebaseIngestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePickFolder = async () => {
    try {
      const picked = await vault.pickVaultFolder();
      if (picked) {
        setTargetDir(picked);
      }
    } catch {
      // fallback
    }
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
    onOpenPath(relPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#384cff]/20 to-[#6366f1]/10 flex items-center justify-center text-[#384cff] border border-[#384cff]/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                Codebase GraphRAG Ingest & Map
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#384cff]/10 text-[#384cff] border border-[#384cff]/20">
                  AST + Topology
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Deterministic multi-pass structural analysis for codebase memory and interactive maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Target Directory Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Target Code Directory</span>
              <span className="text-[11px] font-normal text-zinc-400">Supports TS, JS, Python, Rust, Go</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={targetDir}
                  onChange={e => setTargetDir(e.target.value)}
                  placeholder="Leave empty for vault root, or enter directory path..."
                  disabled={isIngesting}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#384cff]/30 font-mono text-zinc-800 dark:text-zinc-200"
                />
                {targetDir && (
                  <button
                    onClick={() => setTargetDir('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handlePickFolder}
                disabled={isIngesting}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Folder className="w-3.5 h-3.5 text-zinc-500" />
                <span>Browse</span>
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
              <span className="text-[10px] uppercase font-semibold text-zinc-400">Presets:</span>
              <button
                type="button"
                onClick={() => setTargetDir('')}
                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.04] transition-colors"
              >
                Vault Root
              </button>
              <button
                type="button"
                onClick={() => setTargetDir('src')}
                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.04] transition-colors"
              >
                src/ Directory
              </button>
            </div>
          </div>

          {/* Execution Pipeline Steps */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Graphify Multi-Pass Architecture Pipeline</span>
              {isIngesting && (
                <span className="flex items-center gap-1.5 text-xs text-[#384cff] font-medium">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className={`p-2.5 rounded-lg border transition-all ${
                progressStep >= 1 ? 'border-[#384cff]/30 bg-[#384cff]/5' : 'border-black/[0.04] dark:border-white/[0.04] opacity-60'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    progressStep >= 1 ? 'bg-[#384cff] text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}>1</div>
                  <span>Deterministic AST Extraction</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 pl-6">
                  Extracts classes, functions, and imports with 100% confidence.
                </p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${
                progressStep >= 2 ? 'border-[#384cff]/30 bg-[#384cff]/5' : 'border-black/[0.04] dark:border-white/[0.04] opacity-60'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    progressStep >= 2 ? 'bg-[#384cff] text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}>2</div>
                  <span>Dual-Edge Dependency Map</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 pl-6">
                  Builds EXTRACTED code edges & resolves cross-file module targets.
                </p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${
                progressStep >= 3 ? 'border-[#384cff]/30 bg-[#384cff]/5' : 'border-black/[0.04] dark:border-white/[0.04] opacity-60'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    progressStep >= 3 ? 'bg-[#384cff] text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}>3</div>
                  <span>God Node & Coupling Metric</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 pl-6">
                  Detects high-centrality files and structural architectural bottlenecks.
                </p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${
                progressStep >= 4 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-black/[0.04] dark:border-white/[0.04] opacity-60'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    progressStep >= 4 ? 'bg-emerald-500 text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}>4</div>
                  <span>Artifact Compilation</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 pl-6">
                  Outputs ARCHITECTURE.canvas & comprehensive CODE_MAP.md.
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ingestion Failed</p>
                <p className="mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Results Summary Card */}
          {result && result.ok && (
            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Codebase Ingest Completed Successfully
                </span>
              </div>

              {/* Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Files Scanned</div>
                  <div className="text-xl font-bold font-mono text-[#384cff] mt-0.5">
                    {result.filesAnalyzed ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Symbols Found</div>
                  <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                    {result.symbolsDiscovered ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Extracted Edges</div>
                  <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {result.dependenciesFound ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">God Nodes</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {result.godNodes?.length ?? 0}
                  </div>
                </div>
              </div>

              {/* God Nodes Hubs */}
              {result.godNodes && result.godNodes.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                    <span>Key Architectural God Nodes</span>
                    <span className="text-[10px] text-zinc-400">Most centralized hubs</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {result.godNodes.slice(0, 6).map((node, i) => (
                      <div 
                        key={i}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-[11px] truncate max-w-[170px]" title={node.file}>
                          {node.file}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                          <span title="Symbols Discovered" className="text-purple-600 dark:text-purple-400 font-semibold">{node.symbolCount}s</span>
                          <span>•</span>
                          <span title="Imports / Dependencies" className="text-[#384cff] font-semibold">{node.importCount}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons to View Artifacts */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenArtifact('ARCHITECTURE.canvas')}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#384cff] hover:bg-[#2e3ecc] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(56,76,255,0.25)] flex items-center justify-center gap-2 transition-all"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Open ARCHITECTURE.canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenArtifact('CODE_MAP.md')}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span>Open CODE_MAP.md</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
          <span className="text-[11px] text-zinc-400">
            {result?.ok ? 'Ready to explore architecture' : 'Deterministic static analysis without LLM tokens'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isIngesting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
            >
              {result?.ok ? 'Done' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleRunIngestion}
              disabled={isIngesting}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isIngesting 
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#384cff] hover:bg-[#2e3ecc] text-white shadow-xs'
              }`}
            >
              {isIngesting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{result?.ok ? 'Re-Ingest Codebase' : 'Ingest & Map Codebase'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
