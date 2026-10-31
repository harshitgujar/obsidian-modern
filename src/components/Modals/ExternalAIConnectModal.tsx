import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Globe, 
  RefreshCw, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Zap,
  Bot,
  ExternalLink,
  Code2,
  Layers
} from 'lucide-react';

interface ExternalAIConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
}

interface McpAppStatus {
  configPath: string;
  isDetected: boolean;
  isConnected: boolean;
  connectedVaultPath?: string;
}

interface McpServerStatusResponse {
  ok: boolean;
  serverPort: number;
  httpUrl: string;
  execConfig: {
    command: string;
    args: string[];
    isNodeInstalled: boolean;
    runtimeType: string;
  };
  claudeDesktopSnippet: Record<string, any>;
  cursorSnippet: Record<string, any>;
  windsurfSnippet: Record<string, any>;
  claudeCliCommand: string;
  nodeBinary: string;
  bridgePath: string;
  vaultPath: string;
  claude: McpAppStatus;
  cursor: McpAppStatus;
  windsurf: McpAppStatus;
}

export const ExternalAIConnectModal: React.FC<ExternalAIConnectModalProps> = ({
  isOpen,
  onClose,
  vaultName
}) => {
  const [status, setStatus] = useState<McpServerStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vault/ai/mcp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch MCP status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (endpoint: string, appKey: string) => {
    try {
      setActionLoading(appKey);
      setMessage(null);
      const res = await fetch(`/api/vault/ai/mcp/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Updated configuration successfully!' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update configuration.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const anyConnected = Boolean(
    status?.claude?.isConnected || status?.cursor?.isConnected || status?.windsurf?.isConnected
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1a1a20] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col overflow-hidden text-[#111113] dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#384cff] to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Connect External AI</h2>
                {anyConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Let Claude Desktop, Cursor, or Windsurf search and read your notes with 1 click.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              title="Refresh connection status"
              disabled={loading}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Vault: <strong>{vaultName}</strong></span>
            <span className="text-blue-300 dark:text-blue-700">•</span>
            <span>Bundled Engine: <strong>Zero-Setup Node</strong></span>
          </div>
          <span className="text-[11px] font-mono text-blue-700 dark:text-blue-400">
            Port :{status?.serverPort || 5175}
          </span>
        </div>

        {/* Global Feedback Alert */}
        {message && (
          <div className={`px-6 py-2 text-xs flex items-center gap-2 border-b ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
          }`}>
            {message.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          
          {/* Card 1: Claude Desktop */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-black/15 dark:hover:border-white/15 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-800/40 font-semibold text-sm">
                  C
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Claude Desktop</h3>
                    {status?.claude?.isConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        Connected
                      </span>
                    ) : status?.claude?.isDetected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                        Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Ask Claude to search your notes, find connections, and summarize research.
                  </p>
                  {status?.claude?.isConnected && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      ✓ Connected to this vault. (Restart Claude Desktop once to apply).
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {status?.claude?.isConnected ? (
                  <button
                    onClick={() => handleAction('uninstall-claude', 'claude')}
                    disabled={actionLoading === 'claude'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'claude' ? 'Updating...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('install-claude', 'claude')}
                    disabled={actionLoading === 'claude'}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384cff] hover:bg-[#2d3ecc] text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'claude' ? 'Connecting...' : '1-Click Connect'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Cursor IDE */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-black/15 dark:hover:border-white/15 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-200/60 dark:border-cyan-800/40 font-semibold text-sm">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Cursor IDE</h3>
                    {status?.cursor?.isConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        Connected
                      </span>
                    ) : status?.cursor?.isDetected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300">
                        Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Allow Cursor agent to query your documentation, notes, and architecture diagrams.
                  </p>
                  {status?.cursor?.isConnected && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      ✓ Connected to Cursor. Runagon MCP is available in chat & composer.
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => status?.cursorSnippet && copyToClipboard(JSON.stringify(status.cursorSnippet, null, 2), 'cursor-config')}
                  title="Copy Cursor JSON"
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  {copiedKey === 'cursor-config' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>JSON</span>
                </button>

                {status?.cursor?.isConnected ? (
                  <button
                    onClick={() => handleAction('uninstall-cursor', 'cursor')}
                    disabled={actionLoading === 'cursor'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'cursor' ? 'Updating...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('install-cursor', 'cursor')}
                    disabled={actionLoading === 'cursor'}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384cff] hover:bg-[#2d3ecc] text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'cursor' ? 'Connecting...' : '1-Click Connect'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Windsurf IDE */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-black/15 dark:hover:border-white/15 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-800/40 font-semibold text-sm">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Windsurf IDE (Cascade)</h3>
                    {status?.windsurf?.isConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        Connected
                      </span>
                    ) : status?.windsurf?.isDetected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300">
                        Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Connect Cascade AI agent directly to your personal notes and reference files.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {status?.windsurf?.isConnected ? (
                  <button
                    onClick={() => handleAction('uninstall-windsurf', 'windsurf')}
                    disabled={actionLoading === 'windsurf'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'windsurf' ? 'Updating...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('install-windsurf', 'windsurf')}
                    disabled={actionLoading === 'windsurf'}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384cff] hover:bg-[#2d3ecc] text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'windsurf' ? 'Connecting...' : '1-Click Connect'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Web Agents & Custom AI (HTTP & CLI) */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40 font-semibold text-sm">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Web Agents & Custom AI</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Use Runagon with ChatGPT Actions, LibreChat, OpenWebUI, or CLI tools.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => status?.httpUrl && copyToClipboard(status.httpUrl, 'http-url')}
                className="px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">Local MCP Server URL</div>
                  <div className="text-[10px] text-zinc-400 truncate max-w-[200px] font-mono">{status?.httpUrl || 'http://localhost:5175/api/vault/ai/mcp'}</div>
                </div>
                {copiedKey === 'http-url' ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
              </button>

              <button
                onClick={() => status?.claudeCliCommand && copyToClipboard(status.claudeCliCommand, 'claude-cli')}
                className="px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">Claude CLI Command</div>
                  <div className="text-[10px] text-zinc-400 truncate max-w-[200px] font-mono">claude mcp add runagon...</div>
                </div>
                {copiedKey === 'claude-cli' ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Non-Technical User FAQ Accordion */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Frequently Asked Questions
            </h4>

            {[
              {
                q: 'Do I need to install Node.js, Python, or terminal tools?',
                a: 'No! Runagon is fully self-contained. It uses its built-in runtime so any user on Windows or Mac can connect with a single click—no programming knowledge required.'
              },
              {
                q: 'Are my notes kept private and secure?',
                a: 'Yes, 100%. The MCP bridge runs completely locally on your computer (127.0.0.1). Your notes never leave your computer unless your chosen AI app accesses them in response to your explicit questions.'
              },
              {
                q: 'How do I ask Claude or Cursor to use my notes?',
                a: 'Once connected, simply ask questions normally in your AI app, such as: "Search my Runagon vault for my notes on quarterly goals" or "Read the note [[Start here]]". The AI will automatically call the vault search tools!'
              }
            ].map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/40 dark:bg-zinc-900/20 overflow-hidden text-xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full px-3 py-2 flex items-center justify-between font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <span>{faq.q}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2.5 pt-1 text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-black/[0.04] dark:border-white/[0.04] bg-white/50 dark:bg-zinc-800/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Powered by Model Context Protocol (MCP)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-medium bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
