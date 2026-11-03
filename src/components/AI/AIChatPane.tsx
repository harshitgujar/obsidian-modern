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
  Trash2,
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
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-full bg-[#ebebef] hover:bg-[#e4e4e9] border border-black/[0.06] text-[#1c1c1e] font-medium text-[11px] align-baseline transition-all select-none shadow-xs cursor-pointer"
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
    <div className="flex flex-col h-full bg-[#FFFFFF] dark:bg-[#272727] select-none text-xs text-[#18181B] dark:text-white overflow-hidden transition-colors">
      {/* 1. Header Toolbar matching Frame 339.png */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06] dark:border-white/[0.04] bg-[#FFFFFF] dark:bg-[#272727] shrink-0">
        <span className="font-semibold text-[#18181B] dark:text-white text-sm tracking-tight">Vault Copilot</span>

        {/* Scope Filter Segmented Pill */}
        <div className="flex items-center bg-[#F0F0F4] dark:bg-[#3B3B3B] rounded-full p-0.5">
          <button
            onClick={() => setSearchScope('vault')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              searchScope === 'vault'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            Entire Vault
          </button>
          <button
            onClick={() => setSearchScope('activeNote')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              searchScope === 'activeNote'
                ? 'bg-[#384CFF] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white'
            }`}
          >
            Active Note
          </button>
        </div>
      </div>

      {/* 2. Messages Stream / Welcome Screen matching Frame 339.png */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 1 && messages[0].id === 'welcome' ? (
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-[#18181B] dark:text-white tracking-tight">
              Welcome to your Vault Copilot!
            </h2>
            <p className="text-[#71717A] dark:text-zinc-300 text-xs leading-relaxed">
              I have full, private access to your notes. Ask me anything, or try
            </p>
            <ul className="space-y-2 pt-1">
              <li
                onClick={() => setInputQuery("What are the core features of Runagon")}
                className="text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors text-xs"
              >
                • What are the core features of Runagon
              </li>
              <li
                onClick={() => setInputQuery("How do plugins enhance note-taking")}
                className="text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors text-xs"
              >
                • How do plugins enhance note-taking
              </li>
              <li
                onClick={() => setInputQuery("Summarize my recent thoughts across all notes")}
                className="text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors text-xs"
              >
                • Summarize my recent thoughts across all notes
              </li>
            </ul>
          </div>
        ) : (
          messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
              >
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 leading-relaxed text-xs ${
                    isUser
                      ? 'bg-[#384CFF] text-white shadow-xs max-w-[90%]'
                      : 'bg-[#F5F5F7] text-[#18181B] border border-black/[0.06] dark:bg-[#1c1d22] dark:text-zinc-200 dark:border-white/[0.04] shadow-xs w-full'
                  }`}
                >
                  <div className="select-text markdown-body">
                    {msg.content ? (
                      renderFormattedMarkdown(msg.content)
                    ) : (
                      <span className="flex items-center gap-2 text-zinc-500 italic">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        <span>Thinking with vault context...</span>
                      </span>
                    )}
                  </div>

                  {/* Grounded Sources */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.04]">
                      <div className="text-[10px] font-semibold text-[#71717A] dark:text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-[#71717A] dark:text-zinc-400" />
                          <span>Grounded Sources ({msg.sources.length})</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => onNavigateFile(src.filePath)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAEAEE] hover:bg-[#E0E0E6] text-[#18181B] dark:bg-[#252832] dark:hover:bg-[#2e313d] dark:text-zinc-300 text-[11px] font-medium border border-black/[0.04] dark:border-white/[0.04] transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-2.5 h-2.5 text-[#71717A] dark:text-zinc-400" />
                            <span className="truncate max-w-[120px]">{src.noteTitle}</span>
                            <span className="text-[9px] text-blue-500 dark:text-blue-400 font-mono font-semibold">
                              {src.score}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                {!isUser && msg.content && (
                  <div className="flex items-center gap-1 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
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
                        className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                        title="Insert into note"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Bottom Controls & Chat Input matching Frame 339.png */}
      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.04] bg-[#FFFFFF] dark:bg-[#272727] shrink-0 space-y-2 transition-colors">
        {/* Utilities Row: Refresh, Clear, and Provider Badge */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              title={isReindexing ? "Re-indexing..." : "Re-index vault"}
              className="w-7 h-7 rounded-full bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-[#384CFF]' : ''}`} />
            </button>
            <button
              onClick={handleClearChat}
              title="Clear chat history"
              className="w-7 h-7 rounded-full bg-[#F0F0F4] hover:bg-[#E8E8EE] dark:bg-[#3B3B3B] dark:hover:bg-[#484848] text-[#71717A] hover:text-rose-500 dark:text-[#6D6D6D] dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={onOpenSettings}
            title="Configure AI & Ollama models"
            className="px-2.5 py-0.5 rounded-full bg-[#F0F0F4] dark:bg-[#3B3B3B] text-[#71717A] hover:text-[#18181B] dark:text-[#6D6D6D] dark:hover:text-white text-[11px] font-mono cursor-pointer transition-colors"
          >
            {aiStatus?.provider ? `${aiStatus.provider} (local)` : 'ollama (local)'}
          </div>
        </div>

        {/* Input Pill */}
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask your vault anything...."
            disabled={isStreaming}
            className="w-full bg-[#F0F0F4] dark:bg-[#3B3B3B] rounded-full pl-4 pr-10 py-2.5 text-xs text-[#18181B] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-[#6D6D6D] focus:outline-none focus:ring-1 focus:ring-[#384CFF] shadow-xl transition-all"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="absolute right-2 p-1.5 rounded-full bg-[#384CFF] text-white hover:bg-[#4863ff] disabled:opacity-30 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
