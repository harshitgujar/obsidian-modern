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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md select-none">
      <div className="w-[820px] h-[560px] bg-white border border-black/[0.08] rounded-3xl skeuo-modal flex flex-col overflow-hidden text-[#111113]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-[#f8f8fa]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-700" />
            <span className="text-sm font-semibold text-[#111113]">File Recovery — Local Snapshots (.obsidian/file-recovery)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e8e93] hover:text-[#111113] hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Snapshot List */}
          <div className="w-72 border-r border-black/[0.06] bg-[#f8f8fa] flex flex-col">
            <div className="p-2.5 border-b border-black/[0.06]">
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter by file path..."
                className="w-full bg-white border border-black/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-[#111113] focus:border-zinc-400 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs">
              {filtered.length === 0 ? (
                <div className="text-[#8e8e93] text-center py-8 text-[11px] italic">
                  No snapshots recorded yet.<br />Edit any note to automatically record snapshots on disk!
                </div>
              ) : (
                filtered.map(snap => (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedId(snap.id)}
                    className={`p-2.5 rounded-xl cursor-pointer border transition-colors ${
                      snap.id === selectedId
                        ? 'bg-[#18181b] text-white border-transparent shadow-sm'
                        : 'bg-white text-[#111113] border-black/[0.05] hover:bg-[#ececf0]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${snap.id === selectedId ? 'text-white' : 'text-zinc-600'}`} />
                      <span className="truncate">{snap.path}</span>
                    </div>
                    <div className={`flex items-center justify-between text-[10px] mt-1 ${snap.id === selectedId ? 'text-white/80' : 'text-[#8e8e93]'}`}>
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
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] bg-[#f8f8fa] text-xs">
                  <div>
                    <span className="font-semibold text-[#111113]">{selectedSnapshot.path}</span>
                    <span className="text-[#8e8e93] ml-2 text-[11px]">
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg skeuo-btn text-[#111113] text-xs border border-black/[0.08]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onRestoreSnapshot(selectedSnapshot.path, selectedSnapshot.content || '');
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg skeuo-btn-dark text-white font-medium text-xs shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Snapshot</span>
                    </button>
                  </div>
                </div>

                <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-[#111113] leading-relaxed select-text bg-[#f4f4f6]">
                  {selectedSnapshot.content || ''}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8e8e93] text-xs">
                Select a snapshot on the left to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
