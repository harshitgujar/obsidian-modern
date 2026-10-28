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
  Zap
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
  onSaveCurrentWorkspace
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
          "obsidian-vault": {
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
      fetchAiStatus();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-2xl select-none animate-in fade-in duration-150">
      <div className="w-[860px] h-[620px] glass-panel-elevated rounded-2xl shadow-[0_32px_96px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] flex overflow-hidden text-zinc-100">
        {/* Left Settings Sidebar */}
        <div className="w-60 bg-black/30 border-r border-white/[0.08] p-3.5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Options
            </div>

            <button
              onClick={() => setActiveSection('editor')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'editor'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <button
              onClick={() => setActiveSection('files')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'files'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Files & Links</span>
            </button>

            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'appearance'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveSection('hotkeys')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'hotkeys'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Hotkeys</span>
            </button>

            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pt-3">
              Core Extensions
            </div>

            <button
              onClick={() => setActiveSection('plugins')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'plugins'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>Core Plugins</span>
            </button>

            {/* Plugin Options (Sub-settings) */}
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pt-3">
              Plugin Options
            </div>

            {corePluginsConfig['daily-notes'] !== false && (
              <button
                onClick={() => setActiveSection('daily-notes')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'daily-notes'
                    ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Notes</span>
              </button>
            )}

            {corePluginsConfig['templates'] !== false && (
              <button
                onClick={() => setActiveSection('templates')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'templates'
                    ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
            )}

            {corePluginsConfig['file-recovery'] !== false && (
              <button
                onClick={() => setActiveSection('file-recovery')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                  activeSection === 'file-recovery'
                    ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>File Recovery</span>
              </button>
            )}

            {/* AI & Memory Settings */}
            <button
              onClick={() => setActiveSection('ai')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'ai'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-purple-300 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI & Memory (RAG)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-500/30 font-medium">
                PRO
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-850">
            <button
              onClick={() => setActiveSection('about')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border-none ${
                activeSection === 'about'
                  ? 'bg-[#705dcf] text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
          </div>
        </div>

        {/* Right Settings Body */}
        <div className="flex-1 flex flex-col h-full bg-[#18181b] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/80 bg-[#161619]">
            <h2 className="text-sm font-semibold text-zinc-200 capitalize">
              {activeSection === 'files' ? 'Files & Links' : activeSection.replace(/-/g, ' ')} Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300">
            {/* Section 1: Editor */}
            {activeSection === 'editor' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Default view for new tabs</div>
                    <div className="text-zinc-500 text-[11px]">Choose whether notes open in Live Preview, Source, or Reading view</div>
                  </div>
                  <select
                    value={appConfig.defaultViewMode || 'live'}
                    onChange={e => onSaveAppConfig({ ...appConfig, defaultViewMode: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="reading">Reading view (High Fidelity)</option>
                    <option value="live">Live Preview (Notion-style Interactive)</option>
                    <option value="source">Source mode (Raw Markdown)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Fold heading</div>
                    <div className="text-zinc-500 text-[11px]">Allow folding content under markdown headings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.foldHeading !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, foldHeading: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Show frontmatter properties</div>
                    <div className="text-zinc-500 text-[11px]">Render YAML properties widget at top of note</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.showFrontmatter !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, showFrontmatter: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Readable line length</div>
                    <div className="text-zinc-500 text-[11px]">Constrain line length for optimal reading comfort</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.readableLineLength !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, readableLineLength: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Section 2: Files & Links */}
            {activeSection === 'files' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Automatically update internal links</div>
                    <div className="text-zinc-500 text-[11px]">Update [[wikilinks]] across all notes when a note is renamed or moved</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.alwaysUpdateLinks !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, alwaysUpdateLinks: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Default location for new notes</div>
                    <div className="text-zinc-500 text-[11px]">Where newly created notes are saved</div>
                  </div>
                  <select
                    value={appConfig.newFileLocation || 'root'}
                    onChange={e => onSaveAppConfig({ ...appConfig, newFileLocation: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="root">Vault root folder</option>
                    <option value="current">Same folder as current file</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Attachment folder path</div>
                    <div className="text-zinc-500 text-[11px]">Folder to store pasted images and audio recordings</div>
                  </div>
                  <input
                    type="text"
                    value={appConfig.attachmentFolderPath || 'Attachments'}
                    onChange={e => onSaveAppConfig({ ...appConfig, attachmentFolderPath: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 w-40"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Appearance */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                    <div>
                      <div className="font-medium text-zinc-200">Base color scheme</div>
                      <div className="text-zinc-500 text-[11px]">Choose between Dark (Obsidian) and Light (Moonstone)</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSaveAppearanceConfig({ ...appearanceConfig, theme: 'obsidian' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border-none font-medium transition-all ${
                          appearanceConfig.theme !== 'moonstone'
                            ? 'bg-[#705dcf] text-white shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => onSaveAppearanceConfig({ ...appearanceConfig, theme: 'moonstone' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border-none font-medium transition-all ${
                          appearanceConfig.theme === 'moonstone'
                            ? 'bg-[#705dcf] text-white shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                    <div>
                      <div className="font-medium text-zinc-200">Base font size</div>
                      <div className="text-zinc-500 text-[11px]">{appearanceConfig.baseFontSize || 16}px</div>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="22"
                      value={appearanceConfig.baseFontSize || 16}
                      onChange={e => onSaveAppearanceConfig({ ...appearanceConfig, baseFontSize: Number(e.target.value) })}
                      className="accent-purple-500 w-36"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Core Plugins */}
            {activeSection === 'plugins' && (
              <div className="space-y-2">
                <div className="text-zinc-400 mb-3 text-[11px]">
                  Obsidian built-in core extensions:
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
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70"
                    >
                      <div>
                        <div className="font-medium text-zinc-200 capitalize">{id.replace(/-/g, ' ')}</div>
                        <div className="text-[11px] text-zinc-500">{label}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => onSaveCorePluginsConfig({ ...corePluginsConfig, [id]: e.target.checked })}
                        className="accent-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section 5: Hotkeys */}
            {activeSection === 'hotkeys' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search hotkeys..."
                      value={hotkeySearch}
                      onChange={e => setHotkeySearch(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/50"
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
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-xs hover:border-zinc-700/60 transition-colors"
                      >
                        <div className="truncate pr-3">
                          <div className="text-zinc-200 font-medium truncate">{cmd.title}</div>
                          <div className="text-[10px] text-zinc-500">{cmd.category}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRecording ? (
                            <span className="px-2.5 py-1 rounded bg-purple-600 text-white font-mono text-[11px] animate-pulse">
                              Press hotkey... (Esc to cancel)
                            </span>
                          ) : (
                            <button
                              onClick={() => setRecordingCommandId(cmd.id)}
                              className={`px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
                                activeShortcut
                                  ? 'bg-zinc-800 text-purple-300 border-zinc-700 hover:border-purple-500'
                                  : 'bg-zinc-900/80 text-zinc-500 border-dashed border-zinc-700 hover:text-zinc-300'
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
                              className="p-1 text-zinc-500 hover:text-purple-300 rounded hover:bg-zinc-800"
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
                              className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800"
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
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Date format</div>
                    <div className="text-zinc-500 text-[11px]">Filename format for daily notes (e.g. YYYY-MM-DD or YYYY/MM/DD)</div>
                  </div>
                  <input
                    type="text"
                    value={dailyConfig.format || 'YYYY-MM-DD'}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, format: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">New file location</div>
                    <div className="text-zinc-500 text-[11px]">Folder where daily notes are created</div>
                  </div>
                  <input
                    type="text"
                    value={dailyConfig.folder || 'Daily'}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, folder: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Template file location</div>
                    <div className="text-zinc-500 text-[11px]">Note to use as a template for new daily notes</div>
                  </div>
                  <select
                    value={dailyConfig.template || ''}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, template: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-52"
                  >
                    <option value="">None</option>
                    {files.filter(f => f.extension === 'md').map(f => (
                      <option key={f.path} value={f.path}>{f.path}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Open on startup</div>
                    <div className="text-zinc-500 text-[11px]">Automatically open today's daily note when vault opens</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(dailyConfig.autorun)}
                    onChange={e => handleSaveDailyConfig({ ...dailyConfig, autorun: e.target.checked })}
                    className="accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Sub-setting: Templates */}
            {activeSection === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Template folder location</div>
                    <div className="text-zinc-500 text-[11px]">Folder containing reusable markdown templates</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.folder || 'Templates'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, folder: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Date format token</div>
                    <div className="text-zinc-500 text-[11px]">Format for replaces {'{{date}}'}</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.dateFormat || 'YYYY-MM-DD'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, dateFormat: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Time format token</div>
                    <div className="text-zinc-500 text-[11px]">Format for replaces {'{{time}}'}</div>
                  </div>
                  <input
                    type="text"
                    value={templatesConfig.timeFormat || 'HH:mm'}
                    onChange={e => handleSaveTemplatesConfig({ ...templatesConfig, timeFormat: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Sub-setting: File Recovery */}
            {activeSection === 'file-recovery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Local snapshot recovery</div>
                    <div className="text-zinc-500 text-[11px]">Browse previous note versions or clear backup snapshots</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onOpenFileRecoveryModal}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors shadow-sm"
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
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-750 text-xs transition-colors"
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
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div>
                    <div className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>AI & Vault Memory (GraphRAG)</span>
                    </div>
                    <div className="text-zinc-400 text-xs mt-0.5">
                      Ground every response in your private notes using hybrid semantic retrieval.
                    </div>
                  </div>
                  {aiStatus && (
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                      aiStatus.isProviderAvailable
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${aiStatus.isProviderAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>{aiStatus.isProviderAvailable ? 'Engine Connected' : 'Engine Offline'}</span>
                    </div>
                  )}
                </div>

                {/* 1. Provider Choice Cards */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">AI Intelligence Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setAiProvider('ollama')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        aiProvider === 'ollama'
                          ? 'bg-purple-950/30 border-purple-500/80 ring-2 ring-purple-500/20'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-medium text-zinc-100 text-xs">
                          <Cpu className="w-4 h-4 text-purple-400" />
                          <span>Local Ollama</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-medium">
                          100% Private
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Runs directly on your machine. Zero data sent to the cloud. Free forever.
                      </p>
                    </div>

                    <div
                      onClick={() => setAiProvider('openai')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        aiProvider === 'openai'
                          ? 'bg-purple-950/30 border-purple-500/80 ring-2 ring-purple-500/20'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-medium text-zinc-100 text-xs">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <span>Cloud AI (API Key)</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 font-medium">
                          Fastest
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Connect OpenAI, Google Gemini, Claude, DeepSeek, or OpenRouter with an API key.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Provider Specific Settings Form */}
                {aiProvider === 'ollama' ? (
                  <div className="space-y-3.5 bg-black/20 p-4 rounded-xl border border-white/[0.06]">
                    {/* Ollama Status Alert */}
                    {aiStatus?.isProviderAvailable ? (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Ollama is detected and responding locally ({aiStatus.availableModels?.length || 0} models detected).</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Ollama not detected at {ollamaUrl}. Make sure the Ollama application is running.</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-200">Ollama Server Address</label>
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={e => setOllamaUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-200">Chat & Reasoning Model</label>
                          <button
                            onClick={fetchAiStatus}
                            title="Refresh detected models"
                            className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Refresh</span>
                          </button>
                        </div>
                        {aiStatus?.availableModels && aiStatus.availableModels.length > 0 ? (
                          <select
                            value={chatModel}
                            onChange={e => setChatModel(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
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
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-200">Embedding Model</label>
                        <input
                          type="text"
                          value={embeddingModel}
                          onChange={e => setEmbeddingModel(e.target.value)}
                          placeholder="nomic-embed-text:latest"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-black/20 p-4 rounded-xl border border-white/[0.06]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-200">API Key</label>
                        <span className="text-[10px] text-zinc-500">Stored locally in .obsidian/ai-config.json</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder={aiStatus?.hasApiKey ? '•••••••••••••••• (API key configured)' : 'sk-...'}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(prev => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-200">API Base URL</label>
                        <input
                          type="text"
                          value={apiUrl}
                          onChange={e => setApiUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1/chat/completions"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-200">Chat Model Name</label>
                        <input
                          type="text"
                          value={chatModel}
                          onChange={e => setChatModel(e.target.value)}
                          placeholder="gpt-4o-mini"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-400">
                      <span>Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://api.openai.com/v1/chat/completions');
                          setChatModel('gpt-4o-mini');
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                      >
                        OpenAI (GPT-4o Mini)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://openrouter.ai/api/v1/chat/completions');
                          setChatModel('anthropic/claude-3.5-sonnet');
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                      >
                        OpenRouter (Claude 3.5)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApiUrl('https://api.groq.com/openai/v1/chat/completions');
                          setChatModel('llama-3.3-70b-versatile');
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
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
                      className="px-4 py-2 rounded-lg bg-[#705dcf] hover:bg-[#5e4db5] text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isSavingAi ? 'animate-bounce' : ''}`} />
                      <span>{isSavingAi ? 'Testing Connection...' : 'Save & Test Connection'}</span>
                    </button>
                  </div>

                  {aiTestResult && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 transition-all ${
                      aiTestResult.status === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border border-rose-500/40 text-rose-200'
                    }`}>
                      {aiTestResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{aiTestResult.message}</span>
                    </div>
                  )}
                </div>

                {/* 4. Vault Memory Index Status */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-zinc-100 text-xs">Vault Vector Index Health</span>
                    </div>
                    <button
                      onClick={handleTriggerReindex}
                      disabled={isReindexingAi}
                      className="px-2.5 py-1 rounded-md bg-purple-900/50 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isReindexingAi ? 'animate-spin' : ''}`} />
                      <span>{isReindexingAi ? 'Re-indexing...' : 'Re-index Vault'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="text-[10px] text-zinc-400">Indexed Notes</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {aiStatus?.indexedFiles ?? 0} / {aiStatus?.totalFiles ?? 0}
                      </div>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="text-[10px] text-zinc-400">Memory Chunks</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {aiStatus?.totalChunks ?? 0} chunks
                      </div>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="text-[10px] text-zinc-400">Active Embedding</div>
                      <div className="text-xs font-semibold text-purple-300 mt-1 truncate" title={aiStatus?.embeddingModel}>
                        {aiStatus?.embeddingModel ? aiStatus.embeddingModel.split(':')[0] : 'Local Hash'}
                      </div>
                    </div>
                  </div>

                  {reindexSuccess && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Vault index refreshed successfully! All notes are synchronized into RAG memory.</span>
                    </div>
                  )}
                </div>

                {/* 5. External Tool Integration Hub (Claude Desktop & Cursor MCP) */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-zinc-200 text-xs flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                      <span>Connect Claude Desktop & Cursor (MCP Server)</span>
                    </div>
                    <button
                      onClick={handleCopyMcpConfig}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1.5 transition-colors border border-zinc-700"
                    >
                      {copiedMcp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedMcp ? 'Copied Config!' : 'Copy MCP Config'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    This vault runs an embedded Model Context Protocol (MCP) server. External AI assistants can search your notes natively as a tool.
                  </p>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-zinc-300 select-all overflow-x-auto">
                    {`{ "mcpServers": { "obsidian-vault": { "url": "http://localhost:5175/api/vault/ai/mcp" } } }`}
                  </div>
                </div>
              </div>
            )}

            {/* Section 6: About */}
            {activeSection === 'about' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                  <div className="text-base font-bold text-purple-300">Obsidian 1.13.7 Engine</div>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    100% real local-first architecture reverse-engineered from genuine <code className="text-purple-300">obsidian-1.13.7.asar</code>. All notes, canvases, bookmarks, CSS snippets, and configs live on disk without any mock data.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Active Vault Directory</div>
                  <div className="font-mono text-zinc-300 text-xs bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 break-all select-text">
                    {vaultPath}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Engine Features</div>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-xs">
                    <li>Dynamic CSS Snippet Injection from <code className="text-zinc-300">.obsidian/snippets/</code></li>
                    <li>Configurable Hotkeys remapped into <code className="text-zinc-300">.obsidian/hotkeys.json</code></li>
                    <li>Web Worker AST & CachedMetadata parsing (<code className="text-zinc-300">worker.js</code>)</li>
                    <li>Barnes-Hut Quadtree physics simulation (<code className="text-zinc-300">sim.js</code>)</li>
                    <li>JSON Canvas 1.0 viewer & editor (<code className="text-zinc-300">.canvas</code>)</li>
                    <li>Automatic link refactoring across vault on rename and folder move</li>
                    <li>Automated local file recovery snapshots (<code className="text-zinc-300">.obsidian/file-recovery</code>)</li>
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
