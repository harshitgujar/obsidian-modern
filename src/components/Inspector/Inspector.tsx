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
  Link2,
  AlignLeft
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
  onReplaceActiveNote?: (content: string) => void;
  onAppendToActiveNote?: (content: string) => void;
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
  onReplaceActiveNote,
  onAppendToActiveNote,
  onCreateNoteFromResponse,
  onOpenSettings
}) => {
  const showOutline = corePluginsConfig['outline'] !== false;
  const showGraph = corePluginsConfig['graph'] !== false;

  const defaultTab: InspectorTab = 'localGraph';
  const [internalTab, setInternalTab] = useState<InspectorTab>(defaultTab);
  const activeTab = externalActiveTab !== undefined
    ? (externalActiveTab === 'topology' ? 'localGraph' : externalActiveTab)
    : internalTab;
  const [localGraphDepth, setLocalGraphDepth] = useState<number>(1);

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

  const communityId = activeNode?.communityId ?? 6;
  const communityMembers = useMemo(() => {
    return graphData.nodes.filter(n => (n.communityId ?? 6) === communityId);
  }, [graphData.nodes, communityId]);

  const communityName = useMemo(() => {
    if (activeFile) {
      const parts = activeFile.path.split('/');
      if (parts.length > 1) return parts[0];
    }
    return 'Guides';
  }, [activeFile]);

  const extractedOutlinks = useMemo(() => {
    if (!activeFile) return [];
    const direct = graphData.edges.filter(e => e.source === activeFile.path && e.kind !== 'inferred');
    if (direct.length > 0) return direct;
    return outlinks.map(target => ({
      source: activeFile.path,
      target,
      label: 'wikilink',
      kind: 'direct' as const
    }));
  }, [activeFile, graphData.edges, outlinks]);

  const extractedInbound = useMemo(() => {
    if (!activeFile) return [];
    const direct = graphData.edges.filter(e => e.target === activeFile.path && e.kind !== 'inferred');
    if (direct.length > 0) return direct;
    return backlinks.map(b => ({
      source: b.filePath,
      target: activeFile.path,
      label: 'wikilink',
      kind: 'direct' as const
    }));
  }, [activeFile, graphData.edges, backlinks]);

  const inferredTies = useMemo(() => {
    if (!activeFile) return [];
    const ties = graphData.edges
      .filter(e => (e.source === activeFile.path || e.target === activeFile.path) && e.kind === 'inferred')
      .map(e => {
        const otherId = String((e.source === activeFile.path ? e.target : e.source) || '');
        return {
          path: otherId,
          name: otherId.replace(/^.*[\\\/]/, '').replace(/\.md$/, ''),
          confidence: Math.round((e.confidence ?? 0.75) * 100)
        };
      });

    if (ties.length === 0 && unlinkedMentions.length > 0) {
      return unlinkedMentions.map(u => ({
        path: u.filePath,
        name: (u.fileName || '').replace(/\.md$/, ''),
        confidence: 75
      }));
    }

    if (ties.length === 0) {
      return [
        { path: 'Heading.md', name: 'Heading', confidence: 75 }
      ];
    }

    return ties;
  }, [activeFile, graphData.edges, unlinkedMentions]);

  // Outgoing Links list for Tab 2
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

  return (
    <aside 
      aria-label="Inspector Panel"
      className="w-72 h-full rounded-[24px] bg-[#FFFFFF] dark:bg-[#272727] border border-black/[0.06] dark:border-white/[0.04] flex flex-col overflow-hidden shrink-0 select-none text-xs text-[#18181B] dark:text-white z-10 transition-colors"
    >
      {/* Top 4 Segmented Icon Tabs Header */}
      <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.04] bg-[#FFFFFF] dark:bg-[#272727] shrink-0">
        <div className="flex items-center justify-between p-1 rounded-full bg-[#F0F0F4] dark:bg-[#3B3B3B] gap-1">
          {/* Tab 1: Local Visual Graph (Share2) */}
          <button
            onClick={() => handleTabClick('localGraph')}
            title="Local Visual Graph"
            className={`flex-1 py-1.5 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              activeTab === 'localGraph'
                ? 'bg-[#FFFFFF] dark:bg-[#272727] text-[#18181B] dark:text-white shadow-xs border border-black/[0.05] dark:border-transparent'
                : 'text-[#71717A] dark:text-white/60 hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Tab 2: Link Mentioning, Incoming & Outgoing (Link2) */}
          <button
            onClick={() => handleTabClick('backlinks')}
            title={`Links & Mentions (${backlinks.length + allOutgoing.length})`}
            className={`flex-1 py-1.5 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              activeTab === 'backlinks' || activeTab === 'outgoing'
                ? 'bg-[#FFFFFF] dark:bg-[#272727] text-[#18181B] dark:text-white shadow-xs border border-black/[0.05] dark:border-transparent'
                : 'text-[#71717A] dark:text-white/60 hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
          </button>

          {/* Tab 3: Table of Contents / Outline (AlignLeft) */}
          <button
            onClick={() => handleTabClick('outline')}
            title="Table of Contents"
            className={`flex-1 py-1.5 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              activeTab === 'outline'
                ? 'bg-[#FFFFFF] dark:bg-[#272727] text-[#18181B] dark:text-white shadow-xs border border-black/[0.05] dark:border-transparent'
                : 'text-[#71717A] dark:text-white/60 hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          {/* Tab 4: Vault Copilot AI (Sparkles) */}
          <button
            onClick={() => handleTabClick('aiChat')}
            title="Vault Copilot AI"
            className={`flex-1 py-1.5 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              activeTab === 'aiChat'
                ? 'bg-[#FFFFFF] dark:bg-[#272727] text-[#18181B] dark:text-white shadow-xs border border-black/[0.05] dark:border-transparent'
                : 'text-[#71717A] dark:text-white/60 hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab 6: AI Vault Copilot */}
      {activeTab === 'aiChat' && (
        <AIChatPane
          activeFile={activeFile}
          onNavigateFile={onNavigateFile}
          onInsertTextAtCursor={onInsertTextAtCursor}
          onReplaceActiveNote={onReplaceActiveNote}
          onAppendToActiveNote={onAppendToActiveNote}
          onCreateNoteFromResponse={onCreateNoteFromResponse}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* Empty State when no active note is selected */}
      {!activeFile && activeTab !== 'aiChat' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#71717A] dark:text-[#6D6D6D] text-xs">
          <FileText className="w-8 h-8 text-[#71717A] dark:text-[#6D6D6D] mb-2 stroke-[1.5]" />
          <p className="font-medium text-[#18181B] dark:text-white">No active note selected</p>
          <p className="text-[11px] text-[#71717A] dark:text-[#6D6D6D] mt-1 max-w-[200px]">
            Open any note to see its linked mentions, outline, and local graph.
          </p>
        </div>
      )}

      {/* Tab 3: Document Outline matching Frame 337.png */}
      {activeFile && activeTab === 'outline' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {(!metadata || metadata.headings.length === 0) ? (
            <div className="text-[#71717A] dark:text-[#6D6D6D] italic text-center py-8 text-xs">
              No headings in this note.<br />Add # Heading to create an outline!
            </div>
          ) : (
            metadata.headings.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1 text-[#18181B]/80 dark:text-white/80 hover:text-[#18181B] dark:hover:text-white cursor-pointer transition-colors"
                style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
              >
                {h.level === 1 ? (
                  <span className="font-semibold text-[#18181B] dark:text-white">{idx + 1}. {h.text}</span>
                ) : (
                  <span className="flex items-center gap-2 text-[#71717A] dark:text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] dark:bg-[#6D6D6D] shrink-0" />
                    <span>{h.text}</span>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 1: Local Visual Graph with Depth Controls */}
      {activeFile && activeTab === 'localGraph' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#272727]">
          {/* Depth Subheader */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.04] bg-[#FFFFFF] dark:bg-[#272727] shrink-0">
            <span className="text-xs text-[#18181B] dark:text-white font-medium">Depth</span>
            <div className="flex items-center bg-[#F0F0F4] dark:bg-[#3B3B3B] rounded-full p-0.5">
              {[1, 2, 3].map(d => (
                <button
                  key={d}
                  onClick={() => setLocalGraphDepth(d)}
                  className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    localGraphDepth === d
                      ? 'bg-[#384CFF] text-white shadow-xs'
                      : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Full Mini Interactive Graph Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <GraphView
              data={graphData}
              activeFileId={activeFile.path}
              onSelectNode={onNavigateFile}
              isMini={true}
              initialSettings={{ localJumps: localGraphDepth }}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Link Mentioning, Incoming & Outgoing Links */}
      {activeFile && (activeTab === 'backlinks' || activeTab === 'outgoing') && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* 1. INCOMING LINKS (BACKLINKS) */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, incoming: !s.incoming }))}
              className="flex items-center justify-between text-[#71717A] dark:text-[#6D6D6D] font-semibold cursor-pointer hover:text-[#18181B] dark:hover:text-white transition-colors py-0.5"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.incoming ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px] font-semibold text-[#18181B] dark:text-white/90">INCOMING LINKS</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#F0F0F4] dark:bg-[#3B3B3B] text-[#71717A] dark:text-white/70 text-[10px] flex items-center justify-center font-mono">
                {backlinks.length}
              </span>
            </div>

            {!collapsedSections.incoming && (
              <div className="space-y-1.5">
                {backlinks.length === 0 ? (
                  <div className="text-[#71717A] dark:text-[#6D6D6D] italic text-[11px] p-2.5 bg-[#F0F0F4]/60 dark:bg-[#3B3B3B]/40 rounded-xl">
                    No incoming mentions
                  </div>
                ) : (
                  backlinks.map((b, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(b.filePath)}
                      className="p-2.5 rounded-xl bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] border border-black/[0.04] dark:border-white/[0.04] cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center gap-2 text-[#18181B] dark:text-white font-medium text-xs">
                        <Link2 className="w-3.5 h-3.5 text-[#384CFF] shrink-0" />
                        <span className="truncate">{String(b.fileName || '').replace(/\.md$/, '')}</span>
                      </div>
                      {b.contextSnippet && (
                        <p className="text-[10px] text-[#71717A] dark:text-white/60 line-clamp-2 leading-relaxed">
                          {b.contextSnippet}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. UNLINKED MENTIONS */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, suggestions: !s.suggestions }))}
              className="flex items-center justify-between text-[#71717A] dark:text-[#6D6D6D] font-semibold cursor-pointer hover:text-[#18181B] dark:hover:text-white transition-colors py-0.5"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.suggestions ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px] font-semibold text-[#18181B] dark:text-white/90">UNLINKED MENTIONS</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#F0F0F4] dark:bg-[#3B3B3B] text-[#71717A] dark:text-[#6D6D6D] text-[10px] flex items-center justify-center font-mono">
                {unlinkedMentions.length}
              </span>
            </div>

            {!collapsedSections.suggestions && (
              <div className="space-y-1.5">
                {unlinkedMentions.length === 0 ? (
                  <div className="text-[#71717A] dark:text-[#6D6D6D] italic text-[11px] p-2.5 bg-[#F0F0F4]/60 dark:bg-[#3B3B3B]/40 rounded-xl">
                    No unlinked mentions
                  </div>
                ) : (
                  unlinkedMentions.map((u, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(u.filePath)}
                      className="p-2.5 rounded-xl bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] border border-black/[0.04] dark:border-white/[0.04] cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#18181B] dark:text-white font-medium truncate text-xs">
                          <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                          <span className="truncate">{String(u.fileName || '').replace(/\.md$/, '')}</span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onLinkMention(u.filePath, String(activeFile.name || '').replace(/\.md$/, ''));
                          }}
                          className="px-2 py-0.5 rounded-full bg-[#384CFF]/20 text-[#384CFF] text-[10px] font-medium hover:bg-[#384CFF] hover:text-white transition-colors cursor-pointer"
                        >
                          + Link
                        </button>
                      </div>
                      {u.contextSnippet && (
                        <p className="text-[10px] text-[#71717A] dark:text-white/60 line-clamp-2 leading-relaxed">
                          {u.contextSnippet}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 3. OUTGOING LINKS */}
          <div className="space-y-1.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, outgoing: !s.outgoing }))}
              className="flex items-center justify-between text-[#71717A] dark:text-[#6D6D6D] font-semibold cursor-pointer hover:text-[#18181B] dark:hover:text-white transition-colors py-0.5"
            >
              <div className="flex items-center gap-1.5">
                {collapsedSections.outgoing ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider text-[10px] font-semibold text-[#18181B] dark:text-white/90">OUTGOING LINKS</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#F0F0F4] dark:bg-[#3B3B3B] text-[#71717A] dark:text-white/70 text-[10px] font-mono">
                {allOutgoing.length}
              </span>
            </div>

            {!collapsedSections.outgoing && (
              <div className="space-y-1.5">
                {allOutgoing.length === 0 ? (
                  <div className="text-[#71717A] dark:text-[#6D6D6D] italic text-[11px] p-2.5 bg-[#F0F0F4]/60 dark:bg-[#3B3B3B]/40 rounded-xl">
                    No outgoing links
                  </div>
                ) : (
                  allOutgoing.map((link, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateFile(link.path)}
                      className="p-2.5 rounded-xl bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] border border-black/[0.04] dark:border-white/[0.04] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[#18181B] dark:text-white font-medium truncate text-xs">
                        <ArrowUpRight className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                        <span className="truncate">{link.name}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Subsystem Community / Leiden Modularity matching Image 1 */}
      {activeFile && activeTab === 'topology' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* Subsystem Community Box */}
          <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93]">
                SUBSYSTEM COMMUNITY
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#1A264D] text-[#4F6CFF] border border-[#384CFF]/30">
                Leiden Modularity
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FF6B00] shrink-0 shadow-sm" />
              <span className="text-sm font-semibold text-white">
                {communityName} ({communityMembers.length})
              </span>
            </div>
            <div className="text-[11px] text-[#8E8E93] pl-5">
              Partition ID: #{communityId}
            </div>
          </div>

          {/* Section 1: EXTRACTED OUTLINKS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93]">
                EXTRACTED OUTLINKS ({extractedOutlinks.length})
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#1A264D] text-[#4F6CFF] border border-[#384CFF]/30">
                100% Deterministic
              </span>
            </div>

            <div className="space-y-1.5">
              {extractedOutlinks.length === 0 ? (
                <div className="text-[#8E8E93] italic text-[11px] p-2.5 bg-[#1C1C1E] rounded-xl border border-white/[0.04]">
                  No extracted outlinks
                </div>
              ) : (
                extractedOutlinks.map((link, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigateFile(link.target)}
                    className="p-2.5 rounded-xl bg-[#1C1C1E] border border-white/[0.06] hover:bg-[#252528] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-white font-medium truncate">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#4F6CFF] shrink-0" />
                      <span className="truncate text-xs">{link.target.replace(/\.md$/, '')}</span>
                    </div>
                    <span className="text-[10px] text-[#8E8E93] font-mono shrink-0">wikilink</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: EXTRACTED INBOUND */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93]">
                EXTRACTED INBOUND ({extractedInbound.length})
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#1A264D] text-[#4F6CFF] border border-[#384CFF]/30">
                100% Deterministic
              </span>
            </div>

            <div className="space-y-1.5">
              {extractedInbound.length === 0 ? (
                <div className="text-[#8E8E93] italic text-[11px] p-2.5 bg-[#1C1C1E] rounded-xl border border-white/[0.04]">
                  No extracted inbound links
                </div>
              ) : (
                extractedInbound.map((link, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigateFile(link.source)}
                    className="p-2.5 rounded-xl bg-[#1C1C1E] border border-white/[0.06] hover:bg-[#252528] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-white font-medium truncate">
                      <Link2 className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                      <span className="truncate text-xs">{link.source.replace(/\.md$/, '')}</span>
                    </div>
                    <span className="text-[10px] text-[#8E8E93] font-mono shrink-0">wikilink</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: INFERRED SEMANTIC TIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93]">
                INFERRED SEMANTIC TIES ({inferredTies.length})
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#36214A] text-[#BF7AF0] border border-[#7812C2]/40">
                AI Inferred
              </span>
            </div>

            <div className="space-y-1.5">
              {inferredTies.map((tie, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateFile(tie.path)}
                  className="p-2.5 rounded-xl bg-[#251A33]/70 border border-[#7812C2]/50 hover:border-[#BF7AF0]/70 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-white font-medium truncate">
                    <Sparkles className="w-3.5 h-3.5 text-[#BF7AF0] shrink-0" />
                    <span className="truncate text-xs">{tie.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-semibold text-[#BF7AF0]">{tie.confidence}%</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onLinkMention(tie.path, String(activeFile.name || '').replace(/\.md$/, ''));
                      }}
                      className="p-1 rounded hover:bg-purple-500/20 text-[#BF7AF0] hover:text-white transition-colors cursor-pointer"
                      title="Add Link"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};