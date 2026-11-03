import React, { useState, useEffect } from 'react';
import { RecoverySnapshot } from '../../types';
import { vault } from '../../services/vault';
import { History, RotateCcw, Copy, Check, FileText, Clock, X } from 'lucide-react';

interface FileRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  onRestoreSnapshot: (path: string, content: string) => void;
}

export const FileRecoveryModal: React.FC<FileRecoveryModalProps> = ({
  isOpen,
  onClose,
  activeFilePath,
  onRestoreSnapshot
}) => {
  const [snapshots, setSnapshots] = useState<RecoverySnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      vault.getRecoverySnapshots().then(list => {
        setSnapshots(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = snapshots.filter(s =>
    s.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const selectedSnapshot = snapshots.find(s => s.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-md select-none p-4">
      <div className="w-[880px] h-[600px] bg-white dark:bg-[#16171b] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl flex flex-col overflow-hidden text-[#18181B] dark:text-zinc-200 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F8F9FA] dark:bg-[#16171b]">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-[#71717A] dark:text-zinc-400" />
            <span className="text-sm font-semibold text-[#18181B] dark:text-white">File Recovery — Local Snapshots (.obsidian/file-recovery)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717A] dark:text-zinc-400 hover:text-[#18181B] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Snapshot List */}
          <div className="w-80 border-r border-black/[0.06] dark:border-white/[0.06] bg-[#FAFAFA] dark:bg-[#15161a] flex flex-col">
            <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter by file path..."
                className="w-full bg-white dark:bg-[#1c1d22] border border-black/[0.08] dark:border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-[#18181B] dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[#384CFF] focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-xs">
              {filtered.length === 0 ? (
                <div className="text-zinc-400 dark:text-zinc-500 text-center py-10 text-[11px] italic px-4">
                  No snapshots recorded yet.<br />Edit any note to automatically record snapshots on disk!
                </div>
              ) : (
                filtered.map(snap => (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedId(snap.id)}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${
                      snap.id === selectedId
                        ? 'bg-[#EEF2FF] dark:bg-[#252832] text-[#384CFF] dark:text-white border-[#384CFF]/40 shadow-sm'
                        : 'bg-white dark:bg-[#1c1d22]/80 text-[#18181B] dark:text-zinc-300 border-black/[0.04] dark:border-white/[0.04] hover:bg-[#F2F4F8] dark:hover:bg-[#252832]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${snap.id === selectedId ? 'text-[#384CFF] dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <span className="truncate">{snap.path}</span>
                    </div>
                    <div className={`flex items-center justify-between text-[11px] mt-1.5 ${snap.id === selectedId ? 'text-[#384CFF]/80 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(snap.timestamp).toLocaleTimeString()}
                      </span>
                      <span>{snap.size} bytes</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Snapshot Preview */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#16171b] overflow-hidden">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F8F9FA] dark:bg-[#16171b] text-xs">
                  <div className="truncate mr-3">
                    <span className="font-semibold text-[#18181B] dark:text-white">{selectedSnapshot.path}</span>
                    <span className="text-zinc-400 dark:text-zinc-500 ml-2 text-[11px]">
                      {new Date(selectedSnapshot.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSnapshot.content || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1c1d22] hover:bg-[#F0F2F5] dark:hover:bg-[#252832] text-[#18181B] dark:text-zinc-300 hover:text-black dark:hover:text-white text-xs border border-black/[0.08] dark:border-white/[0.06] transition-colors cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onRestoreSnapshot(selectedSnapshot.path, selectedSnapshot.content || '');
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#384CFF] hover:bg-[#2e3ecc] text-white font-medium text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Snapshot</span>
                    </button>
                  </div>
                </div>

                <pre className="flex-1 p-5 overflow-auto font-mono text-xs text-[#18181B] dark:text-zinc-300 leading-relaxed select-text bg-[#F8F9FA] dark:bg-[#131417]">
                  {selectedSnapshot.content || ''}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs">
                Select a snapshot on the left to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
