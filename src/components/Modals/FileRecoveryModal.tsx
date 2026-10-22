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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[780px] h-[540px] bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#141416]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">File Recovery — Local Snapshots (.obsidian/file-recovery)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Snapshot List */}
          <div className="w-72 border-r border-zinc-800 bg-[#121214] flex flex-col">
            <div className="p-2.5 border-b border-zinc-800">
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter by file path..."
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
              {filtered.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-[11px] italic">
                  No snapshots recorded yet.<br />Edit any note to automatically record snapshots on disk!
                </div>
              ) : (
                filtered.map(snap => (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedId(snap.id)}
                    className={`p-2.5 rounded-lg cursor-pointer border transition-colors ${
                      snap.id === selectedId
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
                        : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium truncate">
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{snap.path}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
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
          <div className="flex-1 flex flex-col bg-[#18181b] overflow-hidden">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#161619] text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{selectedSnapshot.path}</span>
                    <span className="text-zinc-500 ml-2 text-[11px]">
                      {new Date(selectedSnapshot.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSnapshot.content || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white text-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onRestoreSnapshot(selectedSnapshot.path, selectedSnapshot.content || '');
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Snapshot</span>
                    </button>
                  </div>
                </div>

                <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed select-text bg-zinc-950/50">
                  {selectedSnapshot.content || ''}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                Select a snapshot on the left to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
