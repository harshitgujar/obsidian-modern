import React, { useState } from 'react';
import { VaultFile, NoteMetadata, BacklinkMention, InspectorTab, GraphData } from '../../types';
import { GraphView } from '../Graph/GraphView';
import { AIChatPane } from '../AI/AIChatPane';
import { 
  Link, 
  ListTree, 
  Share2, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface InspectorProps {
  activeFile?: VaultFile;
  metadata?: NoteMetadata;
  backlinks: BacklinkMention[];
  unlinkedMentions: BacklinkMention[];
  graphData: GraphData;
  onNavigateFile: (filePath: string) => void;
  onLinkMention: (sourceFilePath: string, mentionKeyword: string) => void;
  corePluginsConfig?: Record<string, any>;
  activeTab?: InspectorTab;
  onSelectTab?: (tab: InspectorTab) => void;
  onInsertTextAtCursor?: (text: string) => void;
  onCreateNoteFromResponse?: (title: string, content: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  activeFile,
  metadata,
  backlinks,
  unlinkedMentions,
  graphData,
  onNavigateFile,
  onLinkMention,
  corePluginsConfig = {},
  activeTab: externalActiveTab,
  onSelectTab,
  onInsertTextAtCursor,
  onCreateNoteFromResponse
}) => {
  const showBacklinks = corePluginsConfig['backlink'] !== false;
  const showOutlinks = corePluginsConfig['outgoing-link'] !== false;
  const showOutline = corePluginsConfig['outline'] !== false;
  const showGraph = corePluginsConfig['graph'] !== false;

  const defaultTab: InspectorTab = showBacklinks ? 'backlinks' : showOutlinks ? 'outgoing' : showOutline ? 'outline' : 'aiChat';
  const [internalTab, setInternalTab] = useState<InspectorTab>(defaultTab);
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalTab;

  const handleTabClick = (tab: InspectorTab) => {
    setInternalTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const [collapsedSections, setCollapsedSections] = useState<{ linked: boolean; unlinked: boolean }>({
    linked: false,
    unlinked: false
  });

  const outlinks = metadata?.outlinks || [];

  return (
    <div className="w-80 bg-[#141416] border-l border-zinc-800/80 flex flex-col h-full select-none shrink-0 text-xs">
      {/* Top Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800/80 bg-[#101012] p-1.5 shrink-0 overflow-x-auto">
        {showBacklinks && (
          <button
            onClick={() => handleTabClick('backlinks')}
            title="Backlinks"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-colors min-w-0 ${
              activeTab === 'backlinks'
                ? 'bg-purple-600/25 text-purple-200 font-medium border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Link className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Links</span>
            {backlinks.length > 0 && (
              <span className="text-[9px] bg-purple-950 text-purple-400 px-1 rounded-full shrink-0">
                {backlinks.length}
              </span>
            )}
          </button>
        )}

        {showOutlinks && (
          <button
            onClick={() => handleTabClick('outgoing')}
            title="Outgoing Links"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-colors min-w-0 ${
              activeTab === 'outgoing'
                ? 'bg-purple-600/25 text-purple-200 font-medium border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Out</span>
            {outlinks.length > 0 && (
              <span className="text-[9px] bg-purple-950 text-purple-400 px-1 rounded-full shrink-0">
                {outlinks.length}
              </span>
            )}
          </button>
        )}

        {showOutline && (
          <button
            onClick={() => handleTabClick('outline')}
            title="Document Outline"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-colors min-w-0 ${
              activeTab === 'outline'
                ? 'bg-purple-600/25 text-purple-200 font-medium border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ListTree className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Outline</span>
          </button>
        )}

        {showGraph && (
          <button
            onClick={() => handleTabClick('localGraph')}
            title="Local Graph"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-colors min-w-0 ${
              activeTab === 'localGraph'
                ? 'bg-purple-600/25 text-purple-200 font-medium border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />
            <span className="truncate">Graph</span>
          </button>
        )}

        {/* AI Assistant Tab */}
        <button
          onClick={() => handleTabClick('aiChat')}
          title="AI Vault Assistant (RAG Memory)"
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-colors min-w-0 ${
            activeTab === 'aiChat'
              ? 'bg-purple-600/25 text-purple-200 font-medium border border-purple-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-purple-300 hover:bg-zinc-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          <span className="truncate">AI</span>
        </button>
      </div>

      {/* Tab: AI Vault Assistant */}
      {activeTab === 'aiChat' && (
        <AIChatPane
          activeFile={activeFile}
          onNavigateFile={onNavigateFile}
          onInsertTextAtCursor={onInsertTextAtCursor}
          onCreateNoteFromResponse={onCreateNoteFromResponse}
        />
      )}

      {/* Empty State for note-specific tabs when no active file is selected */}
      {!activeFile && activeTab !== 'aiChat' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs">
          <FileText className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.5]" />
          <p className="font-medium text-zinc-400">No active note selected</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
            Open a note to view backlinks, outline, and local connections, or switch to the AI tab.
          </p>
        </div>
      )}

      {/* Tab 1: Backlinks & Mentions */}
      {activeFile && activeTab === 'backlinks' && (
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
                      onClick={() => onNavigateFile(b.filePath)}
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
                          onClick={() => onNavigateFile(um.filePath)}
                          className="font-medium text-zinc-300 hover:text-purple-300 cursor-pointer truncate"
                        >
                          {um.fileName.replace(/\.md$/, '')}
                        </span>
                        <button
                          onClick={() => onLinkMention(um.filePath, activeFile.name.replace(/\.md$/, ''))}
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

      {/* Tab 2: Outgoing Links */}
      {activeFile && activeTab === 'outgoing' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Links in this note ({outlinks.length})
          </div>
          {outlinks.length === 0 ? (
            <div className="text-zinc-500 italic text-[11px]">No outgoing links found.<br />Type [[Note]] to link other notes!</div>
          ) : (
            outlinks.map((link, idx) => (
              <div
                key={idx}
                onClick={() => onNavigateFile(link)}
                className="p-2 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-zinc-200">
                  <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{link}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Document Outline */}
      {activeFile && activeTab === 'outline' && (
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

      {/* Tab 4: Local Graph */}
      {activeFile && activeTab === 'localGraph' && (
        <div className="flex-1 p-2 flex flex-col">
          <div className="text-[11px] text-zinc-400 mb-2 font-medium">
            Local connections for <span className="text-purple-400">{activeFile.name.replace(/\.md$/, '')}</span>
          </div>
          <div className="flex-1 rounded-lg overflow-hidden border border-zinc-800">
            <GraphView
              data={graphData}
              activeFileId={activeFile.path}
              onSelectNode={onNavigateFile}
              isMini={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};