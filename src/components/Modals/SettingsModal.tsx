import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Palette, 
  Puzzle, 
  Keyboard, 
  Info, 
  Folder, 
  Moon, 
  Sun,
  X,
  RotateCcw,
  Trash2,
  Plus,
  Search,
  Calendar,
  Clock,
  History,
  Layout,
  Sliders,
  Sparkles,
  Cpu,
  Globe,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Zap,
  Terminal,
  Bot,
  Code2,
  ShieldCheck
} from 'lucide-react';
import { VaultFile, CommandItem } from '../../types';
import { vault } from '../../services/vault';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  appConfig: Record<string, any>;
  appearanceConfig: Record<string, any>;
  corePluginsConfig: Record<string, any>;
  hotkeysConfig: Record<string, string>;
  vaultPath: string;
  files: VaultFile[];
  commands: CommandItem[];
  onSaveAppConfig: (cfg: Record<string, any>) => void;
  onSaveAppearanceConfig: (cfg: Record<string, any>) => void;
  onSaveCorePluginsConfig: (cfg: Record<string, any>) => void;
  onSaveHotkeysConfig: (cfg: Record<string, string>) => void;
  onOpenFileRecoveryModal: () => void;
  onLoadWorkspace?: (name: string) => void;
  onSaveCurrentWorkspace?: (name: string) => void;
  onOpenExternalAIConnect?: () => void;
}

export type SettingsSection = 
  | 'editor' 
  | 'files' 
  | 'appearance' 
  | 'plugins' 
  | 'hotkeys' 
  | 'daily-notes' 
  | 'templates' 
  | 'file-recovery' 
  | 'ai'
  | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialSection,
  appConfig,
  appearanceConfig,
  corePluginsConfig,
  hotkeysConfig,
  vaultPath,
  files,
  commands,
  onSaveAppConfig,
  onSaveAppearanceConfig,
  onSaveCorePluginsConfig,
  onSaveHotkeysConfig,
  onOpenFileRecoveryModal,
  onLoadWorkspace,
  onSaveCurrentWorkspace,
  onOpenExternalAIConnect
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || 'editor');

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // Hotkeys state
  const [hotkeySearch, setHotkeySearch] = useState('');
  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

  // Sub-settings states (Daily Notes, Templates)
  const [dailyConfig, setDailyConfig] = useState<Record<string, any>>(() => vault.getConfig('daily-notes') || {});
  const [templatesConfig, setTemplatesConfig] = useState<Record<string, any>>(() => vault.getConfig('templates') || {});

  // AI & RAG Memory State
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai'>('ollama');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [chatModel, setChatModel] = useState('qwen2.5:7b');
  const [embeddingModel, setEmbeddingModel] = useState('nomic-embed-text:latest');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.openai.com/v1/chat/completions');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [isReindexingAi, setIsReindexingAi] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  // MCP External Hub State
  const [mcpStatus, setMcpStatus] = useState<any>(null);
  const [activeMcpTab, setActiveMcpTab] = useState<'claude' | 'cursor' | 'cli' | 'raw'>('claude');
  const [isInstallingClaude, setIsInstallingClaude] = useState(false);
  const [claudeFeedback, setClaudeFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const [copiedCursorCommand, setCopiedCursorCommand] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const fetchAiStatus = async () => {
    try {
      const res = await fetch('/api/vault/ai/status');
      if (res.ok) {
        const data = await res.json();
        const s = data.status;
        setAiStatus(s);
        if (s.provider) setAiProvider(s.provider);
        if (s.ollamaUrl) setOllamaUrl(s.ollamaUrl);
        if (s.chatModel) setChatModel(s.chatModel);
        if (s.embeddingModel) setEmbeddingModel(s.embeddingModel);
        if (s.apiUrl) setApiUrl(s.apiUrl);
      }
    } catch {}
  };

  const fetchMcpStatus = async () => {
    try {
      const res = await fetch('/api/vault/ai/mcp/status');
      if (res.ok) {
        const data = await res.json();
        setMcpStatus(data);
      }
    } catch {}
  };

  const handleInstallClaude = async () => {
    setIsInstallingClaude(true);
    setClaudeFeedback(null);
    try {
      const res = await fetch('/api/vault/ai/mcp/install-claude', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to install MCP server into Claude Desktop');
      await fetchMcpStatus();
      setClaudeFeedback({
        status: 'success',
        message: 'Connected to Claude Desktop! Please restart Claude Desktop so it detects your vault memory.'
      });
    } catch (err: any) {
      setClaudeFeedback({
        status: 'error',
        message: err.message || 'Failed to connect to Claude Desktop.'
      });
    } finally {
      setIsInstallingClaude(false);
    }
  };

  const handleUninstallClaude = async () => {
    setIsInstallingClaude(true);
    setClaudeFeedback(null);
    try {
      const res = await fetch('/api/vault/ai/mcp/uninstall-claude', { method: 'POST' });
      const data = await res.json();
      await fetchMcpStatus();
      setClaudeFeedback({
        status: 'success',
        message: 'Disconnected from Claude Desktop.'
      });
    } catch (err: any) {
      setClaudeFeedback({
        status: 'error',
        message: err.message || 'Failed to disconnect.'
      });
    } finally {
      setIsInstallingClaude(false);
    }
  };

  const handleCopyCursorConfig = () => {
    if (!mcpStatus?.cursorConfig) return;
    navigator.clipboard.writeText(JSON.stringify(mcpStatus.cursorConfig, null, 2));
    setCopiedCursor(true);
    setTimeout(() => setCopiedCursor(false), 2000);
  };

  const handleCopyCursorCommand = () => {
    if (!mcpStatus) return;
    const cmd = `${mcpStatus.nodeBinary} "${mcpStatus.bridgePath}" "${mcpStatus.vaultPath}" "${mcpStatus.port}"`;
    navigator.clipboard.writeText(cmd);
    setCopiedCursorCommand(true);
    setTimeout(() => setCopiedCursorCommand(false), 2000);
  };

  const handleCopyCliCommand = () => {
    if (!mcpStatus?.claudeCliCommand) return;
    navigator.clipboard.writeText(mcpStatus.claudeCliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleSaveAndTestAiConfig = async () => {
    setIsSavingAi(true);
    setAiTestResult(null);

    const payload: any = {
      provider: aiProvider,
      chatModel,
      embeddingModel
    };

    if (aiProvider === 'ollama') {
      payload.ollamaUrl = ollamaUrl;
    } else {
      payload.apiUrl = apiUrl;
      if (apiKey) payload.apiKey = apiKey;
    }

    try {
      const res = await fetch('/api/vault/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      await fetchAiStatus();
      window.dispatchEvent(new CustomEvent('runagon-ai-config-changed'));
      window.dispatchEvent(new CustomEvent('obsidian-ai-config-changed'));

      const testRes = await fetch('/api/vault/ai/status');
      const testData = await testRes.json();
      if (testData.status?.isProviderAvailable) {
        setAiTestResult({
          status: 'success',
          message: aiProvider === 'ollama' 
            ? `Connected to local Ollama! Model "${chatModel}" is ready.`
            : 'Connected to Cloud AI API successfully!'
        });
      } else {
        setAiTestResult({
          status: 'error',
          message: testData.status?.providerError || 'Could not connect to the specified AI model. Please check the address.'
        });
      }
    } catch (err: any) {
      setAiTestResult({
        status: 'error',
        message: err.message || 'Failed to save configuration.'
      });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleTriggerReindex = async () => {
    setIsReindexingAi(true);
    setReindexSuccess(false);
    try {
      const res = await fetch('/api/vault/ai/index', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data.status);
        setReindexSuccess(true);
        setTimeout(() => setReindexSuccess(false), 4000);
      }
    } catch {} finally {
      setIsReindexingAi(false);
    }
  };

  const handleCopyMcpConfig = () => {
    const configSnippet = JSON.stringify(
      {
        mcpServers: {
          "runagon-vault": {
            url: "http://localhost:5175/api/vault/ai/mcp"
          }
        }
      },
      null,
      2
    );
    navigator.clipboard.writeText(configSnippet);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2500);
  };

  // Load configs on open or section switch
  useEffect(() => {
    if (isOpen) {
      setDailyConfig(vault.getConfig('daily-notes') || { folder: 'Daily', format: 'YYYY-MM-DD', template: 'Templates/Daily Note Template.md' });
      setTemplatesConfig(vault.getConfig('templates') || { folder: 'Templates', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' });
      if (activeSection === 'ai') {
        fetchAiStatus();
        fetchMcpStatus();
      }
    }
  }, [isOpen, activeSection]);

  // Key recording listener for custom hotkeys
  useEffect(() => {
    if (!recordingCommandId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCommandId(null);
        return;
      }

      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key);
      if (isModifierOnly) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key.toUpperCase();
      if (key === ' ') key = 'Space';
      if (key === 'ARROWUP') key = 'Up';
      if (key === 'ARROWDOWN') key = 'Down';
      if (key === 'ARROWLEFT') key = 'Left';
      if (key === 'ARROWRIGHT') key = 'Right';
      parts.push(key);

      const hotkeyStr = parts.join('+');
      const next = { ...hotkeysConfig, [recordingCommandId]: hotkeyStr };
      onSaveHotkeysConfig(next);
      setRecordingCommandId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingCommandId, hotkeysConfig, onSaveHotkeysConfig]);

  const handleSaveDailyConfig = (cfg: Record<string, any>) => {
    setDailyConfig(cfg);
    vault.saveConfig('daily-notes', cfg);
  };

  const handleSaveTemplatesConfig = (cfg: Record<string, any>) => {
    setTemplatesConfig(cfg);
    vault.saveConfig('templates', cfg);
  };

  // Filter commands for hotkeys list
  const filteredCommands = useMemo(() => {
    const q = hotkeySearch.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(c => c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q));
  }, [commands, hotkeySearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-[880px] h-[640px] bg-white rounded-3xl skeuo-modal flex overflow-hidden text-[#111113] border border-black/[0.08]">
        {/* Left Settings Sidebar */}
        <div className="w-60 bg-[#f8f8fa] border-r border-black/[0.07] p-3.5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              Options
            </div>

            <button
              onClick={() => setActiveSection('editor')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'editor'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-zinc-600" />
              <span>Editor</span>
            </button>

            <button
              onClick={() => setActiveSection('files')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'files'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-zinc-600" />
              <span>Files & Links</span>
            </button>

            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'appearance'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-zinc-600" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveSection('hotkeys')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'hotkeys'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-zinc-600" />
              <span>Hotkeys</span>
            </button>

            <div className="px-2 py-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider pt-3">
              Core Extensions
            </div>

            <button
              onClick={() => setActiveSection('plugins')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'plugins'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <Puzzle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Core Plugins</span>
            </button>

            {/* Plugin Options (Sub-settings) */}
            <div className="px-2 py-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider pt-3">
              Plugin Options
            </div>

            {corePluginsConfig['daily-notes'] !== false && (
              <button
                onClick={() => setActiveSection('daily-notes')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'daily-notes'
                    ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                    : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                <span>Daily Notes</span>
              </button>
            )}

            {corePluginsConfig['templates'] !== false && (
              <button
                onClick={() => setActiveSection('templates')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'templates'
                    ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                    : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-600" />
                <span>Templates</span>
              </button>
            )}

            {corePluginsConfig['file-recovery'] !== false && (
              <button
                onClick={() => setActiveSection('file-recovery')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'file-recovery'
                    ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                    : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
                }`}
              >
                <History className="w-3.5 h-3.5 text-zinc-600" />
                <span>File Recovery</span>
              </button>
            )}

            {/* AI & Memory Settings */}
            <button
              onClick={() => setActiveSection('ai')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'ai'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                <span>AI & Memory (RAG)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-medium">
                PRO
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-black/[0.06]">
            <button
              onClick={() => setActiveSection('about')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'about'
                  ? 'bg-white text-[#111113] font-medium shadow-xs border border-black/[0.08]'
                  : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-zinc-600" />
              <span>About</span>
            </button>
          </div>
        </div>

        {/* Right Settings Body */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-black/[0.06] bg-white">
            <h2 className="text-sm font-semibold text-[#111113] capitalize">
              {activeSection === 'files' ? 'Files & Links' : activeSection.replace(/-/g, ' ')} Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#585860] hover:text-[#111113] hover:bg-black/[0.04] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#585860]">
            {/* Section 1: Editor */}
            {activeSection === 'editor' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Default view for new tabs</div>
                    <div className="text-[#8e8e93] text-[11px]">Choose whether notes open in Live Preview, Source, or Reading view</div>
                  </div>
                  <select
                    value={appConfig.defaultViewMode || 'live'}
                    onChange={e => onSaveAppConfig({ ...appConfig, defaultViewMode: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] focus:outline-none focus:border-zinc-400"
                  >
                    <option value="reading">Reading view (High Fidelity)</option>
                    <option value="live">Live Preview (Notion-style Interactive)</option>
                    <option value="source">Source mode (Raw Markdown)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Fold heading</div>
                    <div className="text-[#8e8e93] text-[11px]">Allow folding content under markdown headings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.foldHeading !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, foldHeading: e.target.checked })}
                    className="accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Show frontmatter properties</div>
                    <div className="text-[#8e8e93] text-[11px]">Render YAML properties widget at top of note</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.showFrontmatter !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, showFrontmatter: e.target.checked })}
                    className="accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Readable line length</div>
                    <div className="text-[#8e8e93] text-[11px]">Constrain line length for optimal reading comfort</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.readableLineLength !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, readableLineLength: e.target.checked })}
                    className="accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Section 2: Files & Links */}
            {activeSection === 'files' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Automatically update internal links</div>
                    <div className="text-[#8e8e93] text-[11px]">Update [[wikilinks]] across all notes when a note is renamed or moved</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.alwaysUpdateLinks !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, alwaysUpdateLinks: e.target.checked })}
                    className="accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Default location for new notes</div>
                    <div className="text-[#8e8e93] text-[11px]">Where newly created notes are saved</div>
                  </div>
                  <select
                    value={appConfig.newFileLocation || 'root'}
                    onChange={e => onSaveAppConfig({ ...appConfig, newFileLocation: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] focus:outline-none focus:border-zinc-400"
                  >
                    <option value="root">Vault root folder</option>
                    <option value="current">Same folder as current file</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Attachment folder path</div>
                    <div className="text-[#8e8e93] text-[11px]">Folder to store pasted images and audio recordings</div>
                  </div>
                  <input
                    type="text"
                    value={appConfig.attachmentFolderPath || 'Attachments'}
                    onChange={e => onSaveAppConfig({ ...appConfig, attachmentFolderPath: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2 py-1 text-xs text-[#111113] w-40 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Appearance */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                    <div>
                      <div className="font-medium text-[#111113]">Base color scheme</div>
                      <div className="text-[#8e8e93] text-[11px]">Choose between Dark (Runagon) and Light (Moonstone)</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSaveAppearanceConfig({ ...appearanceConfig, theme: 'obsidian' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                          appearanceConfig.theme !== 'moonstone'
                            ? 'bg-[#18181b] text-white border-transparent shadow-sm'
                            : 'bg-[#f4f4f6] text-[#585860] hover:text-[#111113] hover:bg-[#ececf0] border-black/[0.08]'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => onSaveAppearanceConfig({ ...appearanceConfig, theme: 'moonstone' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                          appearanceConfig.theme === 'moonstone'
                            ? 'bg-[#18181b] text-white border-transparent shadow-sm'
                            : 'bg-[#f4f4f6] text-[#585860] hover:text-[#111113] hover:bg-[#ececf0] border-black/[0.08]'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                    <div>
                      <div className="font-medium text-[#111113]">Base font size</div>
                      <div className="text-[#8e8e93] text-[11px]">{appearanceConfig.baseFontSize || 16}px</div>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="22"
                      value={appearanceConfig.baseFontSize || 16}
                      onChange={e => onSaveAppearanceConfig({ ...appearanceConfig, baseFontSize: Number(e.target.value) })}
                      className="accent-zinc-900 w-36"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Core Plugins */}
            {activeSection === 'plugins' && (
              <div className="space-y-2">
                <div className="text-[#8e8e93] mb-3 text-[11px]">
                  Runagon built-in core extensions:
                </div>
                {Object.entries({
                  'canvas': 'Infinite Canvas (.canvas 1.0 JSON format)',
                  'graph': 'Interactive Force-Directed Graph View',
                  'backlink': 'Backlinks and Unlinked Mentions Pane',
                  'outgoing-link': 'Outgoing Links Inspector',
                  'tag-pane': 'Tag Explorer with frequency counts',
                  'properties': 'YAML Frontmatter Properties Editor',
                  'daily-notes': 'Daily Notes journal system',
                  'templates': 'Note Templates with {{date}} {{time}} expansion',
                  'command-palette': 'Global Command Palette (Ctrl+P)',
                  'switcher': 'Quick Switcher (Ctrl+O)',
                  'bookmarks': 'Vault Bookmarks (.obsidian/bookmarks.json)',
                  'outline': 'Document Outline & Table of Contents',
                  'word-count': 'Status Bar Word and Character Count',
                  'slides': 'Slide Presentation Mode (Alt+P)',
                  'audio-recorder': 'Voice Audio Recorder (.webm)',
                  'zk-prefixer': 'Zettelkasten unique timestamp prefixer',
                  'file-recovery': 'Automated local file snapshots & diff recovery',
                  'workspaces': 'Save and restore custom split pane layouts'
                }).map(([id, label]) => {
                  const isEnabled = corePluginsConfig[id] !== false;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f8fa] border border-black/[0.06]"
                    >
                      <div>
                        <div className="font-medium text-[#111113] capitalize">{id.replace(/-/g, ' ')}</div>
                        <div className="text-[11px] text-[#8e8e93]">{label}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => onSaveCorePluginsConfig({ ...corePluginsConfig, [id]: e.target.checked })}
                        className="accent-zinc-900 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section 5: Hotkeys */}
            {activeSection === 'hotkeys' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search hotkeys..."
                      value={hotkeySearch}
                      onChange={e => setHotkeySearch(e.target.value)}
                      className="w-full bg-[#f4f4f6] border border-black/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111113] focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredCommands.map(cmd => {
                    const customHotkey = hotkeysConfig[cmd.id];
                    const activeShortcut = customHotkey !== undefined ? customHotkey : cmd.shortcut;
                    const isRecording = recordingCommandId === cmd.id;

                    return (
                      <div
                        key={cmd.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#f8f8fa] border border-black/[0.06] text-xs hover:border-black/[0.12] transition-colors"
                      >
                        <div className="truncate pr-3">
                          <div className="text-[#111113] font-medium truncate">{cmd.title}</div>
                          <div className="text-[10px] text-[#8e8e93]">{cmd.category}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRecording ? (
                            <span className="px-2.5 py-1 rounded bg-[#18181b] text-white font-mono text-[11px] animate-pulse">
                              Press hotkey... (Esc to cancel)
                            </span>
                          ) : (
                            <button
                              onClick={() => setRecordingCommandId(cmd.id)}
                              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-colors ${
                                activeShortcut
                                  ? 'bg-white text-[#111113] border-black/[0.1] shadow-xs hover:border-black/[0.2]'
                                  : 'bg-black/[0.03] text-[#8e8e93] border-dashed border-black/[0.12] hover:text-[#111113]'
                              }`}
                            >
                              {activeShortcut || 'Set hotkey'}
                            </button>
                          )}

                          {customHotkey !== undefined && (
                            <button
                              onClick={() => {
                                const next = { ...hotkeysConfig };
                                delete next[cmd.id];
                                onSaveHotkeysConfig(next);
                              }}
                              title="Reset to default"
                              className="p-1 text-[#8e8e93] hover:text-[#111113] rounded hover:bg-black/[0.05]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeShortcut && (
                            <button
                              onClick={() => {
                                const next = { ...hotkeysConfig, [cmd.id]: '' };
                                onSaveHotkeysConfig(next);
                              }}
                              title="Clear hotkey"
                              className="p-1 text-[#8e8e93] hover:text-rose-600 rounded hover:bg-black/[0.05]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-setting: Daily Notes */}
            {activeSection === 'daily-notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Date format</div>
                    <div className="text-[#8e8e93] text-[11px]">Filename format for daily notes (e.g. YYYY-MM-DD or YYYY/MM/DD)</div>
                  </div>
                  <input
                    type="text"
                    value={dailyConfig.format || 'YYYY-MM-DD'}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, format: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-44 font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">New file location</div>
                    <div className="text-[#8e8e93] text-[11px]">Folder where daily notes are created</div>
                  </div>
                  <input
                    type="text"
                    value={dailyConfig.folder || 'Daily'}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, folder: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-44 focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Template file location</div>
                    <div className="text-[#8e8e93] text-[11px]">Note to use as a template for new daily notes</div>
                  </div>
                  <select
                    value={dailyConfig.template || ''}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, template: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-52 focus:outline-none focus:border-zinc-400"
                  >
                    <option value="">None</option>
                    {files.filter(f => f.extension === 'md').map(f => (
                      <option key={f.path} value={f.path}>{f.path}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Open on startup</div>
                    <div className="text-[#8e8e93] text-[11px]">Automatically open today's daily note when vault opens</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(dailyConfig.autorun)}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, autorun: e.target.checked })}
                    className="accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Sub-setting: Templates */}
            {activeSection === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Template folder location</div>
                    <div className="text-[#8e8e93] text-[11px]">Folder containing reusable markdown templates</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.folder || 'Templates'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, folder: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-44 focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Date format token</div>
                    <div className="text-[#8e8e93] text-[11px]">Format for replaces {'{{date}}'}</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.dateFormat || 'YYYY-MM-DD'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, dateFormat: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-44 font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Time format token</div>
                    <div className="text-[#8e8e93] text-[11px]">Format for replaces {'{{time}}'}</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.timeFormat || 'HH:mm'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, timeFormat: e.target.value })}
                    className="bg-[#f4f4f6] border border-black/[0.1] rounded-lg px-2.5 py-1 text-xs text-[#111113] w-44 font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* Sub-setting: File Recovery */}
            {activeSection === 'file-recovery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="font-medium text-[#111113]">Local snapshot recovery</div>
                    <div className="text-[#8e8e93] text-[11px]">Browse previous note versions or clear backup snapshots</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onOpenFileRecoveryModal}
                      className="px-3.5 py-1.5 rounded-lg skeuo-btn-dark font-medium text-xs shadow-sm"
                    >
                      View Snapshots
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Clear all recovery snapshots from disk?')) {
                          await vault.clearRecoveryHistory();
                          alert('Recovery snapshot cache cleared.');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg skeuo-btn text-rose-600 hover:text-rose-700 text-xs"
                    >
                      Clear History
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section: AI & Memory (RAG) */}
            {activeSection === 'ai' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <div className="text-base font-bold text-[#111113] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-zinc-700" />
                      <span>AI & Vault Memory (GraphRAG)</span>
                    </div>
                    <div className="text-[#585860] text-xs mt-0.5">
                      Ground every response in your private notes using hybrid semantic retrieval.
                    </div>
                  </div>
                  {aiStatus && (
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                      aiStatus.isProviderAvailable
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${aiStatus.isProviderAvailable ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span>{aiStatus.isProviderAvailable ? 'Engine Connected' : 'Engine Offline'}</span>
                    </div>
                  )}
                </div>

                {/* 1. Provider Choice Cards */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">AI Intelligence Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setAiProvider('ollama')}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        aiProvider === 'ollama'
                          ? 'bg-white border-black/[0.18] shadow-sm ring-1 ring-black/[0.08]'
                          : 'bg-[#f8f8fa] border-black/[0.06] hover:border-black/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-medium text-[#111113] text-xs">
                          <Cpu className="w-4 h-4 text-zinc-700" />
                          <span>Local Ollama</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-medium border border-black/[0.05]">
                          100% Private
                        </span>
                      </div>
                      <p className="text-[11px] text-[#585860] leading-relaxed">
                        Runs directly on your machine. Zero data sent to the cloud. Free forever.
                      </p>
                    </div>

                    <div
                      onClick={() => setAiProvider('openai')}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        aiProvider === 'openai'
                          ? 'bg-white border-black/[0.18] shadow-sm ring-1 ring-black/[0.08]'
                          : 'bg-[#f8f8fa] border-black/[0.06] hover:border-black/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-medium text-[#111113] text-xs">
                          <Globe className="w-4 h-4 text-zinc-700" />
                          <span>Cloud AI (API Key)</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-medium border border-black/[0.05]">
                          Fastest
                        </span>
                      </div>
                      <p className="text-[11px] text-[#585860] leading-relaxed">
                        Connect OpenAI, Google Gemini, Claude, DeepSeek, or OpenRouter with an API key.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Provider Specific Settings Form */}
                {aiProvider === 'ollama' ? (
                  <div className="space-y-3.5 bg-[#f8f8fa] p-4 rounded-2xl border border-black/[0.07]">
                    {/* Ollama Status Alert */}
                    {aiStatus?.isProviderAvailable ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Ollama is detected and responding locally ({aiStatus.availableModels?.length || 0} models detected).</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Ollama not detected at {ollamaUrl}. Make sure the Ollama application is running.</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#111113]">Ollama Server Address</label>
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={e => setOllamaUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434"
                        className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-[#111113]">Chat & Reasoning Model</label>
                          <button
                            onClick={fetchAiStatus}
                            title="Refresh detected models"
                            className="text-[10px] text-[#585860] hover:text-[#111113] flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Refresh</span>
                          </button>
                        </div>
                        {aiStatus?.availableModels && aiStatus.availableModels.length > 0 ? (
                          <select
                            value={chatModel}
                            onChange={e => setChatModel(e.target.value)}
                            className="w-full bg-white border border-black/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-[#111113] focus:outline-none focus:border-zinc-400"
                          >
                            {aiStatus.availableModels.map((m: string) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={chatModel}
                            onChange={e => setChatModel(e.target.value)}
                            placeholder="qwen2.5:7b or llama3.2"
                            className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#111113]">Embedding Model</label>
                        <input
                          type="text"
                          value={embeddingModel}
                          onChange={e => setEmbeddingModel(e.target.value)}
                          placeholder="nomic-embed-text:latest"
                          className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-[#f8f8fa] p-4 rounded-2xl border border-black/[0.07]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[#111113]">API Key</label>
                        <span className="text-[10px] text-[#8e8e93]">Stored locally in .obsidian/ai-config.json</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder={aiStatus?.hasApiKey ? '•••••••••••••••• (API key configured)' : 'sk-...'}
                          className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 pr-8 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(prev => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#111113]">API Base URL</label>
                        <input
                          type="text"
                          value={apiUrl}
                          onChange={e => setApiUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1/chat/completions"
                          className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#111113]">Chat Model Name</label>
                        <input
                          type="text"
                          value={chatModel}
                          onChange={e => setChatModel(e.target.value)}
                          placeholder="gpt-4o-mini"
                          className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#111113] font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#585860]">
                      <span>Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://api.openai.com/v1/chat/completions');
                          setChatModel('gpt-4o-mini');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#f4f4f6] text-[#111113] text-[10px] border border-black/[0.08] shadow-xs"
                      >
                        OpenAI (GPT-4o Mini)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://openrouter.ai/api/v1/chat/completions');
                          setChatModel('anthropic/claude-3.5-sonnet');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#f4f4f6] text-[#111113] text-[10px] border border-black/[0.08] shadow-xs"
                      >
                        OpenRouter (Claude 3.5)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://api.groq.com/openai/v1/chat/completions');
                          setChatModel('llama-3.3-70b-versatile');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#f4f4f6] text-[#111113] text-[10px] border border-black/[0.08] shadow-xs"
                      >
                        Groq (Llama 3.3)
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Save & Test Button */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveAndTestAiConfig}
                      disabled={isSavingAi}
                      className="px-4 py-2 rounded-xl skeuo-btn-dark font-medium text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isSavingAi ? 'animate-bounce' : ''}`} />
                      <span>{isSavingAi ? 'Testing Connection...' : 'Save & Test Connection'}</span>
                    </button>
                  </div>

                  {aiTestResult && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${
                      aiTestResult.status === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                      {aiTestResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{aiTestResult.message}</span>
                    </div>
                  )}
                </div>

                {/* 4. Vault Memory Index Status */}
                <div className="p-4 rounded-2xl bg-[#f8f8fa] border border-black/[0.07] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-zinc-700" />
                      <span className="font-semibold text-[#111113] text-xs">Vault Vector Index Health</span>
                    </div>
                    <button
                      onClick={handleTriggerReindex}
                      disabled={isReindexingAi}
                      className="px-2.5 py-1 rounded-lg skeuo-btn text-[#111113] border border-black/[0.1] text-[11px] font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isReindexingAi ? 'animate-spin' : ''}`} />
                      <span>{isReindexingAi ? 'Re-indexing...' : 'Re-index Vault'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-white p-2.5 rounded-xl border border-black/[0.06] shadow-xs">
                      <div className="text-[10px] text-[#8e8e93]">Indexed Notes</div>
                      <div className="text-sm font-bold text-[#111113] mt-0.5">
                        {aiStatus?.indexedFiles ?? 0} / {aiStatus?.totalFiles ?? 0}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-black/[0.06] shadow-xs">
                      <div className="text-[10px] text-[#8e8e93]">Memory Chunks</div>
                      <div className="text-sm font-bold text-[#111113] mt-0.5">
                        {aiStatus?.totalChunks ?? 0} chunks
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-black/[0.06] shadow-xs">
                      <div className="text-[10px] text-[#8e8e93]">Active Embedding</div>
                      <div className="text-xs font-semibold text-[#111113] mt-1 truncate" title={aiStatus?.embeddingModel}>
                        {aiStatus?.embeddingModel ? aiStatus.embeddingModel.split(':')[0] : 'Local Hash'}
                      </div>
                    </div>
                  </div>

                  {reindexSuccess && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vault index refreshed successfully! All notes are synchronized into RAG memory.</span>
                    </div>
                  )}
                </div>

                {/* 5. 1-Click External AI Hub (Claude Desktop & Cursor MCP) */}
                <div className="p-4 rounded-2xl bg-[#f8f8fa] border border-black/[0.07] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#111113] text-xs flex items-center gap-2">
                        <Bot className="w-4 h-4 text-zinc-700" />
                        <span>1-Click External AI Hub (Model Context Protocol)</span>
                      </div>
                      <p className="text-[11px] text-[#585860] mt-0.5">
                        Connect Claude Desktop, Cursor, or terminal assistants to your vault memory seamlessly.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenExternalAIConnect && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenExternalAIConnect();
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#384cff] hover:bg-[#2d3ecc] text-white flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Open 1-Click Connector</span>
                        </button>
                      )}

                      {/* Claude status pill */}
                      {mcpStatus && (
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 ${
                          mcpStatus.isClaudeConnected 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${mcpStatus.isClaudeConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          <span>{mcpStatus.isClaudeConnected ? 'Claude Connected' : 'Claude Ready'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hub Tabs */}
                  <div className="flex items-center gap-1.5 border-b border-black/[0.06] pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveMcpTab('claude')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        activeMcpTab === 'claude' 
                          ? 'bg-white text-[#111113] shadow-xs border border-black/[0.08]' 
                          : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.03]'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Claude Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMcpTab('cursor')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        activeMcpTab === 'cursor' 
                          ? 'bg-white text-[#111113] shadow-xs border border-black/[0.08]' 
                          : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.03]'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Cursor IDE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMcpTab('cli')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        activeMcpTab === 'cli' 
                          ? 'bg-white text-[#111113] shadow-xs border border-black/[0.08]' 
                          : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.03]'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Claude Code CLI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMcpTab('raw')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        activeMcpTab === 'raw' 
                          ? 'bg-white text-[#111113] shadow-xs border border-black/[0.08]' 
                          : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.03]'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Direct Spec</span>
                    </button>
                  </div>

                  {/* Tab 1: Claude Desktop (1-Click Auto Installer) */}
                  {activeMcpTab === 'claude' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-white border border-black/[0.06] shadow-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-[#111113] text-xs">
                              {mcpStatus?.isClaudeConnected 
                                ? '✓ Connected to Claude Desktop' 
                                : '1-Click Claude Desktop Integration'}
                            </div>
                            <p className="text-[11px] text-[#585860] leading-relaxed">
                              {mcpStatus?.isClaudeConnected
                                ? 'Claude Desktop is configured to query your notes using standard MCP tools. If Claude was open, restart it to load the memory tools.'
                                : 'Click below to automatically configure Claude Desktop. No manual JSON editing or terminal commands required.'}
                            </p>
                          </div>

                          {mcpStatus?.isClaudeConnected ? (
                            <button
                              onClick={handleUninstallClaude}
                              disabled={isInstallingClaude}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-all shrink-0 disabled:opacity-50"
                            >
                              {isInstallingClaude ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                          ) : (
                            <button
                              onClick={handleInstallClaude}
                              disabled={isInstallingClaude}
                              className="px-3.5 py-1.5 rounded-xl skeuo-btn-dark text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shrink-0 disabled:opacity-50"
                            >
                              <Zap className={`w-3.5 h-3.5 ${isInstallingClaude ? 'animate-bounce' : ''}`} />
                              <span>{isInstallingClaude ? 'Connecting...' : 'Connect to Claude Desktop'}</span>
                            </button>
                          )}
                        </div>

                        {mcpStatus?.isDifferentVault && (
                          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
                            <span className="truncate">Claude is currently connected to: <code className="text-amber-900 font-semibold">{mcpStatus.connectedVaultPath}</code></span>
                            <button
                              onClick={handleInstallClaude}
                              disabled={isInstallingClaude}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold shrink-0"
                            >
                              Switch to Current Vault
                            </button>
                          </div>
                        )}

                        {claudeFeedback && (
                          <div className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                            claudeFeedback.status === 'success' 
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                              : 'bg-rose-50 border border-rose-200 text-rose-800'
                          }`}>
                            {claudeFeedback.status === 'success' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span>{claudeFeedback.message}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-[#8e8e93] font-mono break-all pt-1">
                          Config target: {mcpStatus?.claudeConfigPath || '~/Library/Application Support/Claude/claude_desktop_config.json'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Cursor IDE */}
                  {activeMcpTab === 'cursor' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-white border border-black/[0.06] shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#111113]">Cursor MCP Setup</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleCopyCursorConfig}
                              className="px-2.5 py-1 rounded-lg skeuo-btn-dark text-[11px] font-medium flex items-center gap-1.5 shadow-xs"
                            >
                              {copiedCursor ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCursor ? 'Copied Full JSON!' : 'Copy Cursor Config'}</span>
                            </button>
                            <button
                              onClick={handleCopyCursorCommand}
                              className="px-2.5 py-1 rounded-lg skeuo-btn text-[#111113] text-[11px] font-medium flex items-center gap-1.5 border border-black/[0.08]"
                            >
                              {copiedCursorCommand ? <Check className="w-3 h-3 text-emerald-600" /> : <Terminal className="w-3 h-3" />}
                              <span>{copiedCursorCommand ? 'Copied Command!' : 'Copy Command Only'}</span>
                            </button>
                          </div>
                        </div>

                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#585860] leading-relaxed">
                          <li>Open Cursor Settings (<kbd className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 border border-zinc-200">Cmd+,</kbd> or <kbd className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 border border-zinc-200">Ctrl+,</kbd>) &gt; <strong>Features</strong> &gt; <strong>MCP</strong>.</li>
                          <li>Click <strong>Add New MCP Server</strong> and paste this configuration:</li>
                        </ol>

                        <div className="bg-[#f4f4f6] p-2.5 rounded-xl border border-black/[0.06] font-mono text-[10px] text-zinc-800 select-all overflow-x-auto">
                          {mcpStatus?.cursorConfig 
                            ? JSON.stringify(mcpStatus.cursorConfig, null, 2)
                            : 'Loading configuration...'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Claude Code CLI */}
                  {activeMcpTab === 'cli' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-white border border-black/[0.06] shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#111113]">Claude Code CLI Terminal Command</span>
                          <button
                            onClick={handleCopyCliCommand}
                            className="px-2.5 py-1 rounded-lg skeuo-btn-dark text-[11px] font-medium flex items-center gap-1.5 shadow-xs"
                          >
                            {copiedCli ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCli ? 'Copied Command!' : 'Copy Command'}</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-[#585860]">
                          Run this single command in your terminal to enable vault memory in Claude Code:
                        </p>

                        <div className="bg-[#f4f4f6] p-2.5 rounded-xl border border-black/[0.06] font-mono text-[10px] text-zinc-800 select-all overflow-x-auto whitespace-pre-wrap break-all">
                          {mcpStatus?.claudeCliCommand || 'claude mcp add runagon-vault-memory node ...'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Direct Spec / HTTP */}
                  {activeMcpTab === 'raw' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-white border border-black/[0.06] shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#111113]">Direct HTTP Endpoint</span>
                          <button
                            onClick={handleCopyMcpConfig}
                            className="px-2.5 py-1 rounded-lg skeuo-btn text-[#111113] text-[11px] flex items-center gap-1.5 border border-black/[0.08]"
                          >
                            {copiedMcp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedMcp ? 'Copied!' : 'Copy URL Config'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#585860]">
                          For custom AI agents and HTTP MCP clients:
                        </p>
                        <div className="bg-[#f4f4f6] p-2.5 rounded-xl border border-black/[0.06] font-mono text-[10px] text-zinc-800 select-all overflow-x-auto">
                          {`{ "mcpServers": { "runagon-vault": { "url": "http://localhost:${mcpStatus?.port || 5175}/api/vault/ai/mcp" } } }`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Privacy & Local Security Notice */}
                  <div className="pt-1 flex items-center gap-2 text-[10.5px] text-[#8e8e93]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>100% Private & Local: All queries are executed directly on 127.0.0.1. Your notes never leave your computer.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 6: About */}
            {activeSection === 'about' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#f8f8fa] border border-black/[0.07] flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-black/[0.08] shadow-sm flex items-center justify-center shrink-0">
                    <img src="/logo-symbol.png" alt="Runagon" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-bold text-[#111113] flex items-center gap-2">
                      <span>Runagon</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 font-mono">v1.0.0</span>
                    </div>
                    <p className="text-[#585860] text-xs leading-relaxed">
                      100% private, local-first knowledge base and AI memory engine. All notes, canvases, bookmarks, CSS snippets, and graph indices live directly on your disk.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[#8e8e93] uppercase tracking-wider text-[10px] font-semibold">Active Vault Directory</div>
                  <div className="font-mono text-[#111113] text-xs bg-[#f8f8fa] p-2.5 rounded-xl border border-black/[0.07] break-all select-text">
                    {vaultPath}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[#8e8e93] uppercase tracking-wider text-[10px] font-semibold">Engine Features</div>
                  <ul className="list-disc pl-4 space-y-1 text-[#585860] text-xs">
                    <li>Dynamic CSS Snippet Injection from <code className="text-[#111113] font-semibold">.obsidian/snippets/</code></li>
                    <li>Configurable Hotkeys remapped into <code className="text-[#111113] font-semibold">.obsidian/hotkeys.json</code></li>
                    <li>Web Worker AST & CachedMetadata parsing (<code className="text-[#111113] font-semibold">worker.js</code>)</li>
                    <li>Barnes-Hut Quadtree physics simulation (<code className="text-[#111113] font-semibold">sim.js</code>)</li>
                    <li>JSON Canvas 1.0 viewer & editor (<code className="text-[#111113] font-semibold">.canvas</code>)</li>
                    <li>Automatic link refactoring across vault on rename and folder move</li>
                    <li>Automated local file recovery snapshots (<code className="text-[#111113] font-semibold">.obsidian/file-recovery</code>)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
