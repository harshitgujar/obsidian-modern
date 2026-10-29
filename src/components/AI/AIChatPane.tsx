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
  Cpu,
  Settings
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
  onOpenSettings?: () => void;
}

export const AIChatPane: React.FC<AIChatPaneProps> = ({
  activeFile,
  onNavigateFile,
  onInsertTextAtCursor,
  onCreateNoteFromResponse,
  onOpenSettings
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome to your Vault Copilot!**\n\nI have full, private access to your notes. Ask me anything, or try:\n* *"What are the core features of Runagon?"*\n* *"How do plugins enhance note-taking?"*\n* *"Summarize my recent thoughts across all notes."*`,
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

  // Reset scope if active file is closed
  useEffect(() => {
    if (!activeFile && (searchScope === 'activeNote' || searchScope === 'folder')) {
      setSearchScope('vault');
    }
  }, [activeFile, searchScope]);

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
    const handleConfigChanged = () => fetchStatus();
    window.addEventListener('obsidian-ai-config-changed', handleConfigChanged);
    window.addEventListener('runagon-ai-config-changed', handleConfigChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('obsidian-ai-config-changed', handleConfigChanged);
      window.removeEventListener('runagon-ai-config-changed', handleConfigChanged);
    };
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
      const filePathFilter =
        searchScope === 'activeNote' && activeFile ? activeFile.path : undefined;
      const folderFilter =
        searchScope === 'folder' && activeFile?.folder ? activeFile.folder : undefined;

      // Filter out empty messages to avoid HTTP 400 with modern LLMs
      const cleanHistory = messages
        .filter(m => m.content && m.content.trim().length > 0)
        .slice(-4)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/vault/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filePath: filePathFilter,
          folder: folderFilter,
          history: cleanHistory
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

  const formatInlineText = (text: string): (string | JSX.Element)[] => {
    if (!text) return [];
    // Tokenize on wikilinks [[...]], inline code `...`, bold **...**, and italics *...*
    const tokenRegex = /(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const tokens: (string | JSX.Element)[] = [];
    let last = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > last) {
        tokens.push(text.slice(last, match.index));
      }
      const raw = match[1];
      const keyId = `tok-${match.index}-${raw.slice(0, 10)}`;

      if (raw.startsWith('[[') && raw.endsWith(']]')) {
        const inner = raw.slice(2, -2);
        const [targetWithHeading, alias] = inner.split('|');
        const [notePath, heading] = targetWithHeading.split('#');
        const label = alias || (heading ? `${notePath} > ${heading}` : notePath);
        const targetNav = notePath.trim();
        tokens.push(
          <button
            key={keyId}
            onClick={(e) => {
              e.stopPropagation();
              onNavigateFile(targetNav);
            }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-full bg-[#ebebef] hover:bg-[#e4e4e9] border border-black/[0.06] text-[#1c1c1e] font-medium text-[11px] align-baseline transition-all select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] cursor-pointer"
            title={`Open ${targetWithHeading}`}
          >
            <span>{label}</span>
          </button>
        );
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        tokens.push(
          <code
            key={keyId}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-black/[0.05] text-[#111113] font-mono text-[11px] select-text"
          >
            {raw.slice(1, -1)}
          </code>
        );
      } else if (raw.startsWith('**') && raw.endsWith('**')) {
        tokens.push(
          <strong key={keyId} className="font-semibold text-[#111113]">
            {formatInlineText(raw.slice(2, -2))}
          </strong>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        tokens.push(
          <em key={keyId} className="italic text-[#585860]">
            {formatInlineText(raw.slice(1, -1))}
          </em>
        );
      } else {
        tokens.push(raw);
      }
      last = tokenRegex.lastIndex;
    }

    if (last < text.length) {
      tokens.push(text.slice(last));
    }
    return tokens;
  };

  const renderFormattedMarkdown = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 select-text">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={`empty-${idx}`} className="h-1.5" />;
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={`h3-${idx}`} className="font-bold text-[#111113] text-xs mt-3 mb-1 border-b border-black/[0.06] pb-1">
                {formatInlineText(trimmed.slice(4))}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={`h2-${idx}`} className="font-bold text-[#111113] text-sm mt-3.5 mb-1.5 border-b border-black/[0.06] pb-1">
                {formatInlineText(trimmed.slice(3))}
              </h3>
            );
          }

          // Obsidian Callout (e.g. > [!TIP] or > [!WARNING])
          if (trimmed.startsWith('> [!')) {
            const match = trimmed.match(/^>\s*\[!([a-zA-Z]+)\]\s*(.*)$/);
            const calloutType = match?.[1]?.toUpperCase() || 'NOTE';
            const calloutTitle = match?.[2] || calloutType;
            return (
              <div
                key={`callout-${idx}`}
                className="my-2 p-2.5 rounded-xl bg-[#f8f8fa] border-l-2 border-[#18181b] text-xs text-[#111113]"
              >
                <div className="font-semibold text-[#111113] mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-zinc-700" />
                  <span>{calloutTitle}</span>
                </div>
              </div>
            );
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <div
                key={`quote-${idx}`}
                className="border-l-2 border-black/20 pl-2.5 py-0.5 my-1 text-[#585860] italic text-[11px]"
              >
                {formatInlineText(trimmed.slice(2))}
              </div>
            );
          }

          // Unordered Bullet List
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={`li-${idx}`} className="flex items-start gap-2 my-0.5 pl-1.5 leading-relaxed">
                <span className="text-[#18181b] font-bold text-sm leading-none mt-0.5">•</span>
                <span className="flex-1">{formatInlineText(trimmed.slice(2))}</span>
              </div>
            );
          }

          // Standard paragraph line
          return (
            <div key={`p-${idx}`} className="leading-relaxed">
              {formatInlineText(line)}
            </div>
          );
        })}
      </div>
    );
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
    <div className="flex flex-col h-full bg-[#f8f8fa] select-none text-xs text-[#111113] overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06] bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-[#111113]">
            <Sparkles className="w-3.5 h-3.5 text-[#384cff]" />
            <span>Vault Copilot</span>
          </div>

          {/* Model Status Pill */}
          {aiStatus && (
            <div
              onClick={onOpenSettings}
              title={`Provider: ${aiStatus.provider} • Engine: GraphRAG (BM25 + Semantic + 1-Hop) • Model: ${aiStatus.embeddingModel || 'default'} (Click to configure)`}
              className="flex items-center gap-1.5 bg-[#f4f4f6] hover:bg-[#ebebef] cursor-pointer px-2 py-0.5 rounded-full text-[10px] text-[#111113] border border-black/[0.08] shadow-xs transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus.isIndexing
                    ? 'bg-zinc-700 animate-pulse'
                    : aiStatus.isProviderAvailable
                    ? 'bg-emerald-500'
                    : 'bg-zinc-400'
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
            className="p-1.5 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.04] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-zinc-700' : ''}`} />
          </button>
          <button
            onClick={handleClearChat}
            title="Clear chat history"
            className="p-1.5 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.04] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Open AI & Memory Settings"
              className="p-1.5 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.04] transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scope Filter Strip */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#f4f4f6] border-b border-black/[0.06] text-[11px] text-[#585860] shrink-0">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-zinc-500" />
          <span>Scope:</span>
        </div>
        <div className="flex items-center p-0.5 rounded-xl bg-[#ebebef] border border-black/[0.06]">
          <button
            onClick={() => setSearchScope('vault')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              searchScope === 'vault'
                ? 'bg-white text-[#384cff] shadow-xs border border-[rgba(56,76,255,0.2)]'
                : 'text-[#585860] hover:text-[#111113]'
            }`}
          >
            Entire Vault
          </button>
          {activeFile && (
            <button
              onClick={() => setSearchScope('activeNote')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                searchScope === 'activeNote'
                  ? 'bg-white text-[#384cff] shadow-xs border border-[rgba(56,76,255,0.2)]'
                  : 'text-[#585860] hover:text-[#111113]'
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
                    ? 'bg-[#18181b] text-white shadow-xs rounded-tr-sm'
                    : 'bg-white text-[#111113] border border-black/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] rounded-tl-sm w-full'
                }`}
              >
                {/* Text Content */}
                <div className="select-text markdown-body">
                  {msg.content ? (
                    renderFormattedMarkdown(msg.content)
                  ) : (
                    <span className="flex items-center gap-2 text-[#8e8e93] italic">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
                      <span>Thinking with vault context...</span>
                    </span>
                  )}
                </div>

                {/* Grounded Citations (Source Pills) */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-black/[0.06]">
                    <div className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-zinc-700" />
                        <span>Grounded Sources ({msg.sources.length}):</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#8e8e93]">BM25 + Dense + Graph</span>
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ebebef] hover:bg-[#e4e4e9] text-[#1c1c1e] text-[11px] font-medium border border-black/[0.06] shadow-xs transition-all select-none"
                          >
                            {isGraph ? (
                              <Share2 className="w-2.5 h-2.5 shrink-0 text-zinc-600" />
                            ) : (
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 text-zinc-600" />
                            )}
                            <span className="truncate max-w-[130px]">{src.noteTitle}</span>
                            <span className="text-[9px] text-[#585860] font-mono font-semibold">
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
                    className="p-1 rounded-md text-[#8e8e93] hover:text-[#111113] hover:bg-black/[0.04] transition-all"
                    title="Copy response"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {onInsertTextAtCursor && (
                    <button
                      onClick={() => onInsertTextAtCursor(msg.content)}
                      className="p-1 rounded-md text-[#8e8e93] hover:text-[#111113] hover:bg-black/[0.04] transition-all"
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
                      className="p-1 rounded-md text-[#8e8e93] hover:text-[#111113] hover:bg-black/[0.04] transition-all"
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
      <form onSubmit={handleSendMessage} className="p-3 border-t border-black/[0.06] bg-white shrink-0">
        <div className="relative flex items-center bg-[#f4f4f6] border border-black/[0.08] rounded-2xl shadow-xs focus-within:border-zinc-400 focus-within:bg-white transition-colors">
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
            className="w-full bg-transparent px-3.5 py-3 pr-12 text-xs text-[#111113] placeholder-[#8e8e93] focus:outline-none resize-none max-h-32"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="absolute right-2 p-2 rounded-xl skeuo-btn-dark disabled:opacity-30 border-none shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
