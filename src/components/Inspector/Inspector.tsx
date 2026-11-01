import React, { useState, useMemo } from 'react';
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
  Sparkles,
  FolderTree
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
  onOpenSettings?: () => void;
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
  onCreateNoteFromResponse,
  onOpenSettings
}) => {
  const showOutline = corePluginsConfig['outline'] !== false;
  const showGraph = corePluginsConfig['graph'] !== false;

  const defaultTab: InspectorTab = 'backlinks';
  const [internalTab, setInternalTab] = useState<InspectorTab>(defaultTab);
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalTab;

  const isConnectionsTab = activeTab === 'backlinks' || activeTab === 'outgoing' || activeTab === 'topology';

  const handleTabClick = (tab: InspectorTab) => {
    setInternalTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const [collapsedSections, setCollapsedSections] = useState<{
    outgoing: boolean;
    incoming: boolean;
    suggestions: boolean;
  }>({
    outgoing: false,
    incoming: false,
    suggestions: false
  });

  const outlinks = metadata?.outlinks || [];

  const activeNode = activeFile
    ? graphData.nodes.find(n => n.id === activeFile.path || n.path === activeFile.path)
    : undefined;

  const extractedOutlinks = activeFile
    ? graphData.edges.filter(e => e.source === activeFile.path && e.kind !== 'inferred')
    : [];

  const inferredTies = activeFile ? [
    ...graphData.edges
      .filter(e => (e.source === activeFile.path || e.target === activeFile.path) && e.kind === 'inferred')
      .map(e => {
        const otherId = String((e.source === activeFile.path ? e.target : e.source) || '');
        return {
          path: otherId,
          name: otherId.replace(/^.*[\\\/]/, '').replace(/\.md$/, ''),
          confidence: Math.round((e.confidence ?? 0.75) * 100),
          isUnlinkedMention: e.sourceType === 'unlinked-mention'
        };
      })
  ] : [];

  // 1. Deduplicate Outgoing Links (References in this note)
  const allOutgoing = useMemo(() => {
    const list: Array<{ path: string; name: string }> = [];
    const seen = new Set<string>();

    outlinks.forEach(target => {
      const clean = String(target || '').replace(/^.*[\\\/]/, '').replace(/\.md$/, '');
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push({ path: target, name: clean });
      }
    });

    extractedOutlinks.forEach(edge => {
      const clean = String(edge.target || '').replace(/^.*[\\\/]/, '').replace(/\.md$/, '');
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push({ path: edge.target, name: clean });
      }
    });

    return list;
  }, [outlinks, extractedOutlinks]);

  // 2. Deduplicate AI Suggestions & Unlinked Mentions
  const combinedSuggestions = useMemo(() => {
    const list: Array<{ path: string; name: string; snippet?: string; confidence?: number }> = [];
    const seen = new Set<string>();

    unlinkedMentions.forEach(u => {
      const cleanName = (u.fileName || '').replace(/\.md$/, '');
      if (cleanName && !seen.has(u.filePath.toLowerCase())) {
        seen.add(u.filePath.toLowerCase());
        list.push({
          path: u.filePath,
          name: cleanName,
          snippet: u.contextSnippet,
          confidence: 75
        });
      }
    });

    inferredTies.forEach(t => {
      if (!seen.has(t.path.toLowerCase())) {
        seen.add(t.path.toLowerCase());
        list.push({
          path: t.path,
          name: t.name,
          confidence: t.confidence
        });
      }
    });

    return list;
  }, [unlinkedMentions, inferredTies]);

  const totalConnectionsCount = allOutgoing.length + backlinks.length + combinedSuggestions.length;

  return (
    <div className="w-80 bg-[#f8f8fa] dark:bg-[#16171b] border-l border-black/[0.07] dark:border-white/[0.08] flex flex-col h-full select-none shrink-0 text-xs text-[#111113] dark:text-zinc-200">
      {/* Top Floating Segmented Tabs */}
      <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#f8f8fa] dark:bg-[#16171b] shrink-0">
        <div className="flex items-center justify-between p-1 rounded-full bg-[#ececf0] dark:bg-zinc-800/80 gap-1 border border-black/[0.05] dark:border-white/[0.05]">
          {/* Unified Connections Tab */}
          <button
            onClick={() => handleTabClick('backlinks')}
            title={`Connections (${totalConnectionsCount})`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full transition-all min-w-0 border ${
              isConnectionsTab
                ? 'bg-white dark:bg-zinc-700 text-[#384cff] dark:text-blue-400 font-medium shadow-xs border border-black/[0.08] dark:border-white/[0.1]'
                : 'border-transparent text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Link className="w-4 h-4 shrink-0" />
            {totalConnectionsCount > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                isConnectionsTab 
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 text-[#384cff] dark:text-blue-300' 
                  : 'bg-black/[0.06] dark:bg-zinc-700 text-[#585860] dark:text-zinc-400'
              }`}>
                {totalConnectionsCount}
              </span>
            )}
          </button>

          {/* Document Outline Tab */}
          {showOutline && (
            <button
              onClick={() => handleTabClick('outline')}
              title="Document Outline"
              className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-full transition-all min-w-0 border ${
                activeTab === 'outline'
                  ? 'bg-white dark:bg-zinc-700 text-[#384cff] dark:text-blue-400 font-medium shadow-xs border border-black/[0.08] dark:border-white/[0.1]'
                  : 'border-transparent text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <ListTree className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Local Mini-Graph Tab */}
          {showGraph && (
            <button
              onClick={() => handleTabClick('localGraph')}
              title="Local Visual Graph"
              className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-full transition-all min-w-0 border ${
                activeTab === 'localGraph'
                  ? 'bg-white dark:bg-zinc-700 text-[#384cff] dark:text-blue-400 font-medium shadow-xs border border-black/[0.08] dark:border-white/[0.1]'
                  : 'border-transparent text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* AI Vault Assistant Tab */}
          <button
            onClick={() => handleTabClick('aiChat')}
            title="AI Vault Assistant"
            className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-full transition-all min-w-0 border ${
              activeTab === 'aiChat'
                ? 'bg-white dark:bg-zinc-700 text-[#384cff] dark:text-blue-400 font-medium shadow-xs border border-black/[0.08] dark:border-white/[0.1]'
                : 'border-transparent text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Tab: AI Vault Assistant */}
      {activeTab === 'aiChat' && (
        <AIChatPane
          activeFile={activeFile}
          onNavigateFile={onNavigateFile}
          onInsertTextAtCursor={onInsertTextAtCursor}
          onCreateNoteFromResponse={onCreateNoteFromResponse}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* Empty State when no active note is selected */}
      {!activeFile && activeTab !== 'aiChat' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs">
          <FileText className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-2 stroke-[1.5]" />
          <p className="font-medium text-zinc-600 dark:text-zinc-400">No active note selected</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
            Open any note to see its connections, outline, and topic cluster, or chat with the AI assistant.
          </p>
        </div>
      )}

      {/* UNIFIED CONNECTIONS TAB (Replaces Fragmented Backlinks, Outgoing, and Topology) */}
      {activeFile && isConnectionsTab && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* 1. Topic Cluster Card (Plain English) */}
          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/[0.07] dark:border-zinc-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#384cff] dark:text-blue-400" />
                <span className="text-[10px] font-semibold text-[#8e8e93] dark:text-zinc-400 uppercase tracking-wider">
                  Topic Group
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-[#384cff] dark:text-blue-400">
                Smart Cluster
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: activeNode?.communityColor || '#384cff' }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#111113] dark:text-zinc-100 truncate">
                  {activeNode?.communityName || (activeFile.folder ? `${activeFile.folder} Collection` : 'General Notes')}
                </div>
                <div className="text-[10px] text-[#8e8e93] dark:text-zinc-400">
                  Notes that naturally connect around similar topics in your vault.
                </div>
              </div>
            </div>
          </div>

          {/* 2. References in this Note (Outgoing Links) */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, outgoing: !s.outgoing }))}
              className="flex items-center justify-between text-[#585860] dark:text-zinc-400 font-semibold cursor-pointer hover:text-[#111113] dark:hover:text-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.outgoing ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px]">References in this Note</span>
              </div>
              <span className="bg-black/[0.06] dark:bg-zinc-800 text-[#585860] dark:text-zinc-400 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {allOutgoing.length}
              </span>
            </div>

            {!collapsedSections.outgoing && (
              <div className="space-y-1.5">
                {allOutgoing.length === 0 ? (
                  <div className="text-[#8e8e93] dark:text-zinc-500 italic text-[11px] p-2.5 bg-white/60 dark:bg-zinc-900/40 rounded-xl border border-black/[0.04] dark:border-zinc-800/60">
                    No references yet. Type <span className="text-[#384cff] dark:text-blue-400 font-mono">[[Note Name]]</span> to link another note!
                  </div>
                ) : (
                  allOutgoing.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(item.path)}
                      className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-black/[0.06] dark:border-zinc-800 hover:border-[#384cff]/30 dark:hover:border-blue-500/40 cursor-pointer flex items-center justify-between text-xs hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center gap-2 truncate text-zinc-800 dark:text-zinc-200">
                        <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                        <span className="truncate font-medium group-hover:text-[#384cff] dark:group-hover:text-blue-400">{item.name}</span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#384cff] dark:group-hover:text-blue-400 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 3. Mentioned by Other Notes (Incoming Backlinks) */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, incoming: !s.incoming }))}
              className="flex items-center justify-between text-[#585860] dark:text-zinc-400 font-semibold cursor-pointer hover:text-[#111113] dark:hover:text-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.incoming ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px]">Mentioned by Other Notes</span>
              </div>
              <span className="bg-black/[0.06] dark:bg-zinc-800 text-[#585860] dark:text-zinc-400 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {backlinks.length}
              </span>
            </div>

            {!collapsedSections.incoming && (
              <div className="space-y-1.5">
                {backlinks.length === 0 ? (
                  <div className="text-[#8e8e93] dark:text-zinc-500 italic text-[11px] p-2.5 bg-white/60 dark:bg-zinc-900/40 rounded-xl border border-black/[0.04] dark:border-zinc-800/60">
                    No other notes link back to this note yet.
                  </div>
                ) : (
                  backlinks.map((b, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(b.filePath)}
                      className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-black/[0.06] dark:border-zinc-800 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2 text-[#384cff] dark:text-blue-400 font-medium">
                        <Link className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate group-hover:underline">{String(b.fileName || '').replace(/\.md$/, '')}</span>
                      </div>
                      {b.contextSnippet && (
                        <p className="mt-1 text-[11px] text-[#585860] dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {b.contextSnippet}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 4. AI Suggested Connections & Unlinked Mentions */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, suggestions: !s.suggestions }))}
              className="flex items-center justify-between text-[#585860] dark:text-zinc-400 font-semibold cursor-pointer hover:text-[#111113] dark:hover:text-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.suggestions ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px] text-purple-600 dark:text-purple-400">AI Suggested Connections</span>
              </div>
              <span className="bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {combinedSuggestions.length}
              </span>
            </div>

            {!collapsedSections.suggestions && (
              <div className="space-y-1.5">
                {combinedSuggestions.length === 0 ? (
                  <div className="text-[#8e8e93] dark:text-zinc-500 italic text-[11px] p-2.5 bg-white/60 dark:bg-zinc-900/40 rounded-xl border border-black/[0.04] dark:border-zinc-800/60">
                    No unlinked mentions found. As your vault grows, smart suggestions will appear here.
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-[#8e8e93] dark:text-zinc-400 px-1">
                      Notes mentioning this topic without a direct link. Click <strong>+ Link</strong> to connect:
                    </p>
                    {combinedSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => onNavigateFile(item.path)}
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/50 cursor-pointer flex items-center justify-between text-xs hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onLinkMention(item.path, String(activeFile.name || '').replace(/\.md$/, ''));
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-500/25 text-purple-600 dark:text-purple-300 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 text-[10px] font-medium transition-colors"
                            title="Turn into a [[Wikilink]]"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Document Outline */}
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
                className="py-1 px-1.5 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer text-zinc-700 dark:text-zinc-300 hover:text-[#384cff] dark:hover:text-blue-400 truncate transition-colors"
                style={{ paddingLeft: `${(h.level - 1) * 12 + 6}px` }}
              >
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] mr-1">{'#'.repeat(h.level)}</span>
                <span>{h.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Local Visual Graph */}
      {activeFile && activeTab === 'localGraph' && (
        <div className="flex-1 p-2 flex flex-col">
          <div className="text-[11px] text-[#585860] dark:text-zinc-400 mb-2 font-medium">
            Local connections for <span className="text-[#111113] dark:text-zinc-100 font-semibold">{String(activeFile.name || '').replace(/\.md$/, '')}</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-black/[0.08] dark:border-zinc-800 bg-[#f4f4f6] dark:bg-[#121214]">
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
