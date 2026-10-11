import React, { useState } from 'react';
import { VaultFile, NoteMetadata, BacklinkMention, InspectorTab, GraphData } from '../../types';
import { GraphView } from '../Graph/GraphView';
import { 
  Link, 
  ListTree, 
  Share2, 
  FileText, 
  ExternalLink, 
  Plus, 
  ChevronRight, 
  Clock, 
  Tag as TagIcon,
  ChevronDown
} from 'lucide-react';

interface InspectorProps {
  activeFile?: VaultFile;
  metadata?: NoteMetadata;
  backlinks: BacklinkMention[];
  unlinkedMentions: BacklinkMention[];
  graphData: GraphData;
  onNavigateFile: (fileId: string) => void;
  onLinkMention: (sourceFileId: string, mentionKeyword: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  activeFile,
  metadata,
  backlinks,
  unlinkedMentions,
  graphData,
  onNavigateFile,
  onLinkMention
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('backlinks');
  const [collapsedSections, setCollapsedSections] = useState<{ linked: boolean; unlinked: boolean }>({
    linked: false,
    unlinked: false
  });

  if (!activeFile) {
    return (
      <div className="w-72 bg-[#121214] border-l border-zinc-800/80 p-4 text-xs text-zinc-500 select-none">
        No active note selected.
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#141416] border-l border-zinc-800/80 flex flex-col h-full select-none shrink-0 text-xs">
      {/* Top Tabs */}
      <div className="flex items-center justify-around border-b border-zinc-800/80 bg-[#121214] py-1.5 px-2">
        <button
          onClick={() => setActiveTab('backlinks')}
          title="Backlinks"
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
            activeTab === 'backlinks'
              ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          <span>Backlinks</span>
          {backlinks.length > 0 && (
            <span className="text-[10px] bg-purple-950 text-purple-400 px-1 rounded-full">
              {backlinks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outline')}
          title="Document Outline"
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
            activeTab === 'outline'
              ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          <span>Outline</span>
        </button>

        <button
          onClick={() => setActiveTab('localGraph')}
          title="Local Graph"
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
            activeTab === 'localGraph'
              ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Local</span>
        </button>
      </div>

      {/* Tab 1: Backlinks & Mentions */}
      {activeTab === 'backlinks' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Linked Mentions */}
          <div>
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, linked: !s.linked }))}
              className="flex items-center justify-between text-zinc-400 font-semibold mb-2 cursor-pointer hover:text-zinc-200"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.linked ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[11px]">Linked Mentions</span>
              </div>
              <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {backlinks.length}
              </span>
            </div>

            {!collapsedSections.linked && (
              <div className="space-y-2 pl-2">
                {backlinks.length === 0 ? (
                  <div className="text-zinc-500 italic text-[11px]">No notes link to this file yet.</div>
                ) : (
                  backlinks.map((b, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(b.fileId)}
                      className="p-2 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/70 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate group-hover:underline">{b.fileName.replace(/\.md$/, '')}</span>
                      </div>
                      {b.contextSnippet && (
                        <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                          {b.contextSnippet}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Unlinked Mentions */}
          <div className="border-t border-zinc-800/80 pt-3">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, unlinked: !s.unlinked }))}
              className="flex items-center justify-between text-zinc-400 font-semibold mb-2 cursor-pointer hover:text-zinc-200"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.unlinked ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[11px]">Unlinked Mentions</span>
              </div>
              <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {unlinkedMentions.length}
              </span>
            </div>

            {!collapsedSections.unlinked && (
              <div className="space-y-2 pl-2">
                {unlinkedMentions.length === 0 ? (
                  <div className="text-zinc-500 italic text-[11px]">No unlinked mentions found.</div>
                ) : (
                  unlinkedMentions.map((um, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-zinc-900/60 border border-zinc-800/70 text-[11px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => onNavigateFile(um.fileId)}
                          className="font-medium text-zinc-300 hover:text-purple-300 cursor-pointer truncate"
                        >
                          {um.fileName.replace(/\.md$/, '')}
                        </span>
                        <button
                          onClick={() => onLinkMention(um.fileId, activeFile.name.replace(/\.md$/, ''))}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border border-purple-500/30 text-[10px]"
                          title="Convert to [[Wikilink]]"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Link</span>
                        </button>
                      </div>
                      <p className="text-zinc-400 line-clamp-2">
                        {um.contextSnippet}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Document Outline */}
      {activeTab === 'outline' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {(!metadata || metadata.headings.length === 0) ? (
            <div className="text-zinc-500 italic text-center py-6 text-[11px]">
              No headings in this note.<br />Add # Heading to create an outline!
            </div>
          ) : (
            metadata.headings.map((h, idx) => (
              <div
                key={idx}
                className="py-1 px-1.5 rounded hover:bg-zinc-800/60 cursor-pointer text-zinc-300 hover:text-purple-300 truncate transition-colors"
                style={{ paddingLeft: `${(h.level - 1) * 12 + 6}px` }}
              >
                <span className="text-zinc-500 text-[10px] mr-1">{'#'.repeat(h.level)}</span>
                <span>{h.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Local Graph */}
      {activeTab === 'localGraph' && (
        <div className="flex-1 p-2 flex flex-col">
          <div className="text-[11px] text-zinc-400 mb-2 font-medium">
            Local connections for <span className="text-purple-400">{activeFile.name.replace(/\.md$/, '')}</span>
          </div>
          <div className="flex-1 rounded-lg overflow-hidden border border-zinc-800">
            <GraphView
              data={graphData}
              activeFileId={activeFile.id}
              onSelectNode={onNavigateFile}
              isMini={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
