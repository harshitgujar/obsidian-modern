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
  isAppInstalled?: boolean;
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
    (status?.claude?.isConnected && status?.claude?.isAppInstalled) ||
    (status?.cursor?.isConnected && status?.cursor?.isAppInstalled) ||
    (status?.windsurf?.isConnected && status?.windsurf?.isAppInstalled)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-[#272727] rounded-2xl shadow-2xl border border-white/[0.08] flex flex-col overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header matching Image 4 */}
        <div className="px-6 py-4.5 border-b border-white/[0.06] flex items-center justify-between bg-[#272727]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#384CFF] flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Connect External AI</h2>
                {anyConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#3B3B3B] text-[#6D6D6D] border border-white/[0.05]">
                    Ready for Connection
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Let Claude Desktop, Cursor, or Windsurf search and read your notes with 1 click.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchStatus}
              title="Refresh connection status"
              disabled={loading}
              className="p-2 rounded-lg text-[#6D6D6D] hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#6D6D6D] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Banner matching Image 4 */}
        <div className="px-6 py-2.5 bg-[#3B3B3B] border-b border-white/[0.05] flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Vault: <strong className="text-white">{vaultName}</strong></span>
            <span className="text-[#6D6D6D]">•</span>
            <span>Bundled Engine: <strong className="text-white">Zero-Setup Node</strong></span>
          </div>
          <span className="text-[11px] font-mono text-white/60">
            Port :{status?.serverPort || 5175}
          </span>
        </div>

        {/* Global Feedback Alert */}
        {message && (
          <div className={`px-6 py-2 text-xs flex items-center gap-2 border-b ${
            message.type === 'success' 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          }`}>
            {message.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Body Container matching Image 4 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5">
          
          {/* Card 1: Claude Desktop */}
          {(() => {
            const isInstalled = Boolean(status?.claude?.isAppInstalled);
            const isConnected = Boolean(status?.claude?.isConnected && isInstalled);
            return (
              <div className="p-4 rounded-xl border border-white/[0.05] bg-[#3B3B3B] hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 font-semibold text-sm">
                      C
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-white">Claude Desktop</h3>
                        {isConnected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Connected
                          </span>
                        ) : isInstalled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#384CFF]/15 text-[#384CFF] border border-[#384CFF]/30">
                            App Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#272727] text-[#6D6D6D] border border-white/[0.05]">
                            Not Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {!isInstalled
                          ? 'Claude Desktop app was not found in your Applications. Install it first, or use the CLI command.'
                          : isConnected
                            ? '✓ Connected to this vault. (Restart Claude Desktop once to apply).'
                            : 'Ask Claude to search your notes, find connections, and summarize research.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => handleAction('uninstall-claude', 'claude')}
                        disabled={actionLoading === 'claude'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] bg-[#272727] text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === 'claude' ? 'Updating...' : 'Disconnect'}
                      </button>
                    ) : isInstalled ? (
                      <button
                        onClick={() => handleAction('install-claude', 'claude')}
                        disabled={actionLoading === 'claude'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384CFF] hover:bg-[#4863ff] text-white shadow-lg shadow-blue-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{actionLoading === 'claude' ? 'Connecting...' : '1-Click Connect'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => status?.claudeCliCommand && copyToClipboard(status.claudeCliCommand, 'claude-cli')}
                        title="Copy Claude CLI Command"
                        className="px-2.5 py-1.5 rounded-lg text-xs border border-white/[0.06] bg-[#272727] text-white hover:bg-[#34343a] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'claude-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-[#6D6D6D]" />}
                        <span>CLI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 2: Cursor IDE */}
          {(() => {
            const isInstalled = Boolean(status?.cursor?.isAppInstalled);
            const isConnected = Boolean(status?.cursor?.isConnected && isInstalled);
            return (
              <div className="p-4 rounded-xl border border-white/[0.05] bg-[#3B3B3B] hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 font-semibold text-sm">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-white">Cursor IDE</h3>
                        {isConnected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Connected
                          </span>
                        ) : isInstalled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            App Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#272727] text-[#6D6D6D] border border-white/[0.05]">
                            Not Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {!isInstalled
                          ? 'Cursor IDE is not installed on this computer. Install Cursor first, or copy the configuration JSON below.'
                          : isConnected
                            ? '✓ Connected to Cursor. Runagon MCP is available in chat & composer.'
                            : 'Allow Cursor agent to query your documentation, notes, and architecture diagrams.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => status?.cursorSnippet && copyToClipboard(JSON.stringify(status.cursorSnippet, null, 2), 'cursor-config')}
                      title="Copy Cursor JSON"
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-white/[0.06] bg-[#272727] text-white hover:bg-[#34343a] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'cursor-config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#6D6D6D]" />}
                      <span>JSON</span>
                    </button>

                    {isConnected ? (
                      <button
                        onClick={() => handleAction('uninstall-cursor', 'cursor')}
                        disabled={actionLoading === 'cursor'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] bg-[#272727] text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === 'cursor' ? 'Updating...' : 'Disconnect'}
                      </button>
                    ) : isInstalled ? (
                      <button
                        onClick={() => handleAction('install-cursor', 'cursor')}
                        disabled={actionLoading === 'cursor'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384CFF] hover:bg-[#4863ff] text-white shadow-lg shadow-blue-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{actionLoading === 'cursor' ? 'Connecting...' : '1-Click Connect'}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 3: Windsurf IDE (Cascade) */}
          {(() => {
            const isInstalled = Boolean(status?.windsurf?.isAppInstalled);
            const isConnected = Boolean(status?.windsurf?.isConnected && isInstalled);
            return (
              <div className="p-4 rounded-xl border border-white/[0.05] bg-[#3B3B3B] hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 font-semibold text-sm">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-white">Windsurf IDE (Cascade)</h3>
                        {isConnected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Connected
                          </span>
                        ) : isInstalled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/15 text-teal-400 border border-teal-500/30">
                            Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#272727] text-[#6D6D6D] border border-white/[0.05]">
                            Not Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {!isInstalled
                          ? 'Windsurf IDE was not found in your Applications. Install it first, or copy the JSON config below.'
                          : isConnected
                            ? '✓ Connected to Windsurf Cascade agent.'
                            : 'Connect Cascade AI agent directly to your personal notes and reference files.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => handleAction('uninstall-windsurf', 'windsurf')}
                        disabled={actionLoading === 'windsurf'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] bg-[#272727] text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === 'windsurf' ? 'Updating...' : 'Disconnect'}
                      </button>
                    ) : isInstalled ? (
                      <button
                        onClick={() => handleAction('install-windsurf', 'windsurf')}
                        disabled={actionLoading === 'windsurf'}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#384CFF] hover:bg-[#4863ff] text-white shadow-lg shadow-blue-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{actionLoading === 'windsurf' ? 'Connecting...' : '1-Click Connect'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => status?.windsurfSnippet && copyToClipboard(JSON.stringify(status.windsurfSnippet, null, 2), 'windsurf-config')}
                        title="Copy Windsurf JSON"
                        className="px-2.5 py-1.5 rounded-lg text-xs border border-white/[0.06] bg-[#272727] text-white hover:bg-[#34343a] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'windsurf-config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#6D6D6D]" />}
                        <span>JSON</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 4: Web Agents & Custom AI (matching Image 4) */}
          <div className="p-4 rounded-xl border border-white/[0.05] bg-[#3B3B3B]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 font-semibold text-sm">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Web Agents & Custom AI</h3>
                <p className="text-xs text-white/60">
                  Use Runagon with ChatGPT Actions, LibreChat, OpenWebUI, or CLI tools.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => status?.httpUrl && copyToClipboard(status.httpUrl, 'http-url')}
                className="px-3 py-2 rounded-lg border border-white/[0.06] bg-[#272727] hover:bg-[#34343a] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-[11px] font-medium text-white/80">Local MCP Server URL</div>
                  <div className="text-[10px] text-white/40 truncate max-w-[200px] font-mono">{status?.httpUrl || 'http://localhost:5175/api/vault/...'}</div>
                </div>
                {copiedKey === 'http-url' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#6D6D6D] shrink-0" />}
              </button>

              <button
                onClick={() => status?.claudeCliCommand && copyToClipboard(status.claudeCliCommand, 'claude-cli')}
                className="px-3 py-2 rounded-lg border border-white/[0.06] bg-[#272727] hover:bg-[#34343a] transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-[11px] font-medium text-white/80">Claude CLI Command</div>
                  <div className="text-[10px] text-white/40 truncate max-w-[200px] font-mono">claude mcp add runagon...</div>
                </div>
                {copiedKey === 'claude-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Terminal className="w-3.5 h-3.5 text-[#6D6D6D] shrink-0" />}
              </button>
            </div>
          </div>

          {/* Non-Technical User FAQ Accordion matching Image 4 */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6D6D6D]">
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
                  className="rounded-lg border border-white/[0.05] bg-[#3B3B3B] overflow-hidden text-xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between font-medium text-white/90 hover:text-white hover:bg-white/[0.03] transition-colors text-left cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6D6D6D]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6D6D6D]" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3.5 pb-2.5 pt-1 text-white/60 leading-relaxed border-t border-white/[0.04] bg-[#272727]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer matching Image 4 */}
        <div className="px-6 py-3.5 bg-[#272727] border-t border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-[#6D6D6D]">
            Powered by Model Context Protocol (MCP)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg font-medium bg-[#3B3B3B] hover:bg-[#484848] text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};