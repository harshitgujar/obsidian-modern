import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  FileText, 
  ArrowDownToLine, 
  Plus, 
  Folder, 
  Globe, 
  RefreshCw, 
  ExternalLink,
  Bot,
  ChevronDown,
  Share2,
  Cpu
} from 'lucide-react';
import { VaultFile } from '../../types';

export interface AISourceCitation {
  wikilink: string;
  noteTitle: string;
  filePath: string;
  heading: string;
  score: number;
  snippet: string;
  matchType?: 'semantic' | 'lexical' | 'hybrid' | 'graph';
  graphSource?: string;
  breadcrumbs?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AISourceCitation[];
  timestamp: number;
}

interface AIChatPaneProps {
  activeFile?: VaultFile;
  onNavigateFile: (filePath: string) => void;
  onInsertTextAtCursor?: (text: string) => void;
  onCreateNoteFromResponse?: (title: string, content: string) => void;
}

export const AIChatPane: React.FC<AIChatPaneProps> = ({
  activeFile,
  onNavigateFile,
  onInsertTextAtCursor,
  onCreateNoteFromResponse
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome to your Vault Copilot!**\n\nI have full, private access to your notes. Ask me anything, or try:\n* *"What are the core features of Obsidian?"*\n* *"How do plugins enhance note-taking?"*\n* *"Summarize my recent thoughts across all notes."*`,
        timestamp: Date.now()
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchScope, setSearchScope] = useState<'vault' | 'activeNote' | 'folder'>('vault');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Fetch RAG index status on mount
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/vault/ai/status');
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data.status);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const res = await fetch('/api/vault/ai/index', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data.status);
      }
    } catch {} finally {
      setIsReindexing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage, initialAssistantMessage]);
    setInputQuery('');
    setIsStreaming(true);

    try {
      const folderFilter =
        searchScope === 'activeNote' && activeFile
          ? activeFile.path
          : searchScope === 'folder' && activeFile?.folder
          ? activeFile.folder
          : undefined;

      const response = await fetch('/api/vault/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          folder: folderFilter,
          history: messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to stream chat: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let retrievedSources: AISourceCitation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const blockLines = block.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (eventType === 'sources' && dataStr) {
            try {
              retrievedSources = JSON.parse(dataStr);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, sources: retrievedSources } : m
                )
              );
            } catch {}
          } else if (eventType === 'token' && dataStr) {
            try {
              const token = JSON.parse(dataStr);
              accumulatedText += token;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );
            } catch {}
          } else if (eventType === 'error' && dataStr) {
            try {
              const err = JSON.parse(dataStr);
              accumulatedText += `\n\n> [!WARNING]\n> ${err}`;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: `⚠️ Error contacting AI: ${err.message || 'Check Ollama connection.'}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const renderContentWithWikilinks = (content: string) => {
    if (!content) return null;
    const parts: (string | JSX.Element)[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      const rawTarget = match[1];
      const [targetWithHeading, alias] = rawTarget.split('|');
      const [notePath, heading] = targetWithHeading.split('#');
      const label = alias || (heading ? `${notePath} > ${heading}` : notePath);
      const targetNav = notePath.trim();
      const matchIdx = match.index;
      parts.push(
        <button
          key={`wl-${matchIdx}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateFile(targetNav);
          }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded bg-[#705dcf] hover:bg-[#5e4db5] border-none text-white font-medium text-[11px] align-baseline transition-all select-none shadow-sm"
          title={`Open ${targetWithHeading}`}
        >
          <span>{label}</span>
        </button>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    return parts;
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat history cleared. What would you like to search or summarize from your vault?`,
        timestamp: Date.now()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-transparent select-none text-xs text-zinc-300 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07] bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Vault Copilot</span>
          </div>

          {/* Model Status Pill */}
          {aiStatus && (
            <div
              title={`Provider: ${aiStatus.provider} • Engine: GraphRAG (BM25 + Semantic + 1-Hop) • Model: ${aiStatus.embeddingModel || 'default'}`}
              className="flex items-center gap-1.5 bg-[#202028] px-2 py-0.5 rounded-full text-[10px] text-zinc-300 border-none shadow-sm"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus.isIndexing
                    ? 'bg-purple-400 animate-pulse'
                    : aiStatus.isProviderAvailable
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-indigo-400'
                }`}
              />
              <span className="truncate max-w-[105px] font-medium">
                {aiStatus.isIndexing
                  ? `Indexing (${aiStatus.queueLength || 0})...`
                  : aiStatus.isProviderAvailable
                  ? 'Ollama (Local)'
                  : 'GraphRAG (Local)'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            title={isReindexing ? 'Rebuilding vault vector index...' : 'Re-index vault now'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={handleClearChat}
            title="Clear chat history"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scope Filter Strip */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-black/25 border-b border-white/[0.06] text-[11px] text-zinc-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-purple-400/80" />
          <span>Scope:</span>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-[#181820] border-none">
          <button
            onClick={() => setSearchScope('vault')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border-none ${
              searchScope === 'vault'
                ? 'bg-[#705dcf] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Entire Vault
          </button>
          {activeFile && (
            <button
              onClick={() => setSearchScope('activeNote')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border-none ${
                searchScope === 'activeNote'
                  ? 'bg-[#705dcf] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Active Note
            </button>
          )}
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[94%] rounded-2xl px-4 py-3 leading-relaxed text-xs ${
                  isUser
                    ? 'glass-bubble-user rounded-tr-sm'
                    : 'glass-bubble-assistant rounded-tl-sm w-full'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap select-text markdown-body">
                  {msg.content ? (
                    renderContentWithWikilinks(msg.content)
                  ) : (
                    <span className="flex items-center gap-2 text-zinc-400 italic">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                      <span>Thinking with vault context...</span>
                    </span>
                  )}
                </div>

                {/* Grounded Citations (Source Pills) */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-white/[0.08]">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-[#705dcf]" />
                        <span>Grounded Sources ({msg.sources.length}):</span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500">BM25 + Dense + Graph</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => {
                        const isGraph = src.matchType === 'graph';
                        const tooltip = [
                          src.breadcrumbs && src.breadcrumbs.length > 1 ? `Context: ${src.breadcrumbs.join(' > ')}` : null,
                          src.graphSource ? `Graph link: ${src.graphSource}` : null,
                          `${src.snippet} (${src.score}% match)`
                        ].filter(Boolean).join('\n\n');

                        return (
                          <button
                            key={sIdx}
                            onClick={() => onNavigateFile(src.filePath)}
                            title={tooltip}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-none text-white text-[11px] font-medium shadow-sm transition-all select-none ${
                              isGraph ? 'bg-[#5e4db5] hover:bg-[#4d3da3]' : 'bg-[#705dcf] hover:bg-[#5e4db5]'
                            }`}
                          >
                            {isGraph ? (
                              <Share2 className="w-2.5 h-2.5 shrink-0 text-amber-300" />
                            ) : (
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 text-white/80" />
                            )}
                            <span className="truncate max-w-[130px]">{src.noteTitle}</span>
                            <span className="text-[9px] text-white/90 font-mono font-semibold">
                              {src.score}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Action Strip */}
              {!isUser && msg.content && (
                <div className="flex items-center gap-1 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
                    title="Copy response"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {onInsertTextAtCursor && (
                    <button
                      onClick={() => onInsertTextAtCursor(msg.content)}
                      className="p-1 rounded-md text-zinc-400 hover:text-purple-300 hover:bg-white/[0.08] transition-all"
                      title="Insert response into active note"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                    </button>
                  )}

                  {onCreateNoteFromResponse && (
                    <button
                      onClick={() =>
                        onCreateNoteFromResponse(
                          `AI Summary - ${new Date().toISOString().slice(0, 10)}`,
                          msg.content
                        )
                      }
                      className="p-1 rounded-md text-zinc-400 hover:text-purple-300 hover:bg-white/[0.08] transition-all"
                      title="Create new note from response"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.07] bg-white/[0.02] shrink-0">
        <div className="relative flex items-center glass-input-dock rounded-2xl shadow-xl">
          <textarea
            ref={inputRef}
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              searchScope === 'activeNote' && activeFile
                ? `Ask about "${activeFile.name}"...`
                : 'Ask your vault anything...'
            }
            rows={1}
            disabled={isStreaming}
            className="w-full bg-transparent px-3.5 py-3 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none max-h-32"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="absolute right-2 p-2 rounded-xl bg-[#705dcf] hover:bg-[#5e4db5] text-white disabled:opacity-30 disabled:hover:bg-[#705dcf] border-none shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
