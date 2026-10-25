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
  Sliders
} from 'lucide-react';
import { VaultFile, CommandItem } from '../../types';
import { vault } from '../../services/vault';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

type SettingsSection = 
  | 'editor' 
  | 'files' 
  | 'appearance' 
  | 'plugins' 
  | 'hotkeys' 
  | 'daily-notes' 
  | 'templates' 
  | 'zk-prefixer' 
  | 'file-recovery' 
  | 'workspaces' 
  | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
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
  const [activeSection, setActiveSection] = useState<SettingsSection>('editor');

  // Hotkeys state
  const [hotkeySearch, setHotkeySearch] = useState('');
  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

  // Sub-settings states (Daily Notes, Templates, ZK, File Recovery, Workspaces)
  const [dailyConfig, setDailyConfig] = useState<Record<string, any>>(() => vault.getConfig('daily-notes') || {});
  const [templatesConfig, setTemplatesConfig] = useState<Record<string, any>>(() => vault.getConfig('templates') || {});
  const [zkConfig, setZkConfig] = useState<Record<string, any>>(() => vault.getConfig('zk-prefixer') || {});
  const [recoveryConfig, setRecoveryConfig] = useState<Record<string, any>>(() => vault.getConfig('file-recovery') || {});
  const [workspacesConfig, setWorkspacesConfig] = useState<Record<string, any>>(() => vault.getConfig('workspaces') || {});
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Load configs on open or section switch
  useEffect(() => {
    if (isOpen) {
      setDailyConfig(vault.getConfig('daily-notes') || { folder: 'Daily', format: 'YYYY-MM-DD', template: 'Templates/Daily Note Template.md' });
      setTemplatesConfig(vault.getConfig('templates') || { folder: 'Templates', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' });
      setZkConfig(vault.getConfig('zk-prefixer') || { folder: '', format: 'YYYYMMDDHHmm', template: 'Templates/Zettelkasten Note.md' });
      setRecoveryConfig(vault.getConfig('file-recovery') || { intervalMinutes: 5, retentionDays: 7 });
      setWorkspacesConfig(vault.getConfig('workspaces') || { active: 'default', workspaces: {} });
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

  const handleSaveZkConfig = (cfg: Record<string, any>) => {
    setZkConfig(cfg);
    vault.saveConfig('zk-prefixer', cfg);
  };

  const handleSaveRecoveryConfig = (cfg: Record<string, any>) => {
    setRecoveryConfig(cfg);
    vault.saveConfig('file-recovery', cfg);
  };

  // Filter commands for hotkeys list
  const filteredCommands = useMemo(() => {
    const q = hotkeySearch.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(c => c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q));
  }, [commands, hotkeySearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[840px] h-[600px] bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl flex overflow-hidden text-zinc-100">
        {/* Left Settings Sidebar */}
        <div className="w-60 bg-[#121214] border-r border-zinc-800/80 p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Options
            </div>

            <button
              onClick={() => setActiveSection('editor')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'editor'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <button
              onClick={() => setActiveSection('files')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'files'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Files & Links</span>
            </button>

            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'appearance'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveSection('hotkeys')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'hotkeys'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
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
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'plugins'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
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
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeSection === 'daily-notes'
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
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
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeSection === 'templates'
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
            )}

            {corePluginsConfig['zk-prefixer'] !== false && (
              <button
                onClick={() => setActiveSection('zk-prefixer')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeSection === 'zk-prefixer'
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Unique Note Creator</span>
              </button>
            )}

            {corePluginsConfig['file-recovery'] !== false && (
              <button
                onClick={() => setActiveSection('file-recovery')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeSection === 'file-recovery'
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>File Recovery</span>
              </button>
            )}

            {corePluginsConfig['workspaces'] !== false && (
              <button
                onClick={() => setActiveSection('workspaces')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeSection === 'workspaces'
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Workspaces</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-850">
            <button
              onClick={() => setActiveSection('about')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeSection === 'about'
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
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
                    value={appConfig.defaultViewMode || 'reading'}
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
                    <div className="font-medium text-zinc-200">Show line numbers</div>
                    <div className="text-zinc-500 text-[11px]">Display line number gutter in the editor</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appConfig.showLineNumber !== false}
                    onChange={e => onSaveAppConfig({ ...appConfig, showLineNumber: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
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

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Strict line breaks</div>
                    <div className="text-zinc-500 text-[11px]">Require two spaces or a blank line for line breaks</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(appConfig.strictLineBreaks)}
                    onChange={e => onSaveAppConfig({ ...appConfig, strictLineBreaks: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Vim key bindings</div>
                    <div className="text-zinc-500 text-[11px]">Enable modal Vim key bindings in code and markdown editors</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(appConfig.vimMode)}
                    onChange={e => onSaveAppConfig({ ...appConfig, vimMode: e.target.checked })}
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

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Deleted files storage</div>
                    <div className="text-zinc-500 text-[11px]">Move deleted files to .trash folder in vault</div>
                  </div>
                  <select
                    value={appConfig.trashOption || 'local'}
                    onChange={e => onSaveAppConfig({ ...appConfig, trashOption: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <option value="local">Move to Obsidian .trash folder</option>
                    <option value="system">Permanent delete</option>
                  </select>
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                          appearanceConfig.theme !== 'moonstone'
                            ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => onSaveAppearanceConfig({ ...appearanceConfig, theme: 'moonstone' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                          appearanceConfig.theme === 'moonstone'
                            ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
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

            {/* Sub-setting: Unique Note Creator (ZK) */}
            {activeSection === 'zk-prefixer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">New file location</div>
                    <div className="text-zinc-500 text-[11px]">Folder where new Zettelkasten notes are created</div>
                  </div>
                  <input
                    type="text"
                    value={zkConfig.folder || ''}
                    onChange={e => handleSaveZkConfig({ ...zkConfig, folder: e.target.value })}
                    placeholder="Vault root"
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Unique prefix format</div>
                    <div className="text-zinc-500 text-[11px]">Timestamp pattern prepended to note titles</div>
                  </div>
                  <input
                    type="text"
                    value={zkConfig.format || 'YYYYMMDDHHmm'}
                    onChange={e => handleSaveZkConfig({ ...zkConfig, format: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Template file location</div>
                    <div className="text-zinc-500 text-[11px]">Template note to populate new ZK notes</div>
                  </div>
                  <select
                    value={zkConfig.template || ''}
                    onChange={e => handleSaveZkConfig({ ...zkConfig, template: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-52"
                  >
                    <option value="">None</option>
                    {files.filter(f => f.extension === 'md').map(f => (
                      <option key={f.path} value={f.path}>{f.path}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Sub-setting: File Recovery */}
            {activeSection === 'file-recovery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Snapshot interval</div>
                    <div className="text-zinc-500 text-[11px]">Minimum interval (in minutes) between local backups</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={recoveryConfig.intervalMinutes || 5}
                    onChange={e => handleSaveRecoveryConfig({ ...recoveryConfig, intervalMinutes: Number(e.target.value) })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-24"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">History retention</div>
                    <div className="text-zinc-500 text-[11px]">Number of days to retain snapshots before cleanup</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={recoveryConfig.retentionDays || 7}
                    onChange={e => handleSaveRecoveryConfig({ ...recoveryConfig, retentionDays: Number(e.target.value) })}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-24"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="font-medium text-zinc-200">Local snapshot archives</div>
                    <div className="text-zinc-500 text-[11px]">Browse previous versions or clear recovery cache</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onOpenFileRecoveryModal}
                      className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs"
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
                      className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-700 text-xs"
                    >
                      Clear History
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-setting: Workspaces */}
            {activeSection === 'workspaces' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div>
                    <div className="font-medium text-zinc-200">Save active layout as workspace</div>
                    <div className="text-zinc-500 text-[11px]">Preserve current split panes, open tabs, and sidebars</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Workspace name..."
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
                    />
                    <button
                      onClick={() => {
                        if (newWorkspaceName.trim() && onSaveCurrentWorkspace) {
                          onSaveCurrentWorkspace(newWorkspaceName.trim());
                          setNewWorkspaceName('');
                          setWorkspacesConfig(vault.getConfig('workspaces') || {});
                        }
                      }}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-500"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-zinc-300">Saved workspaces:</div>
                  {Object.keys(workspacesConfig.workspaces || {}).length === 0 ? (
                    <div className="p-3 text-center text-zinc-500 bg-zinc-900/40 rounded-lg border border-zinc-800/60 text-[11px]">
                      No workspaces saved yet. Save your current layout above.
                    </div>
                  ) : (
                    Object.entries(workspacesConfig.workspaces || {}).map(([wsName]) => (
                      <div
                        key={wsName}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/70"
                      >
                        <div className="flex items-center gap-2">
                          <Layout className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-medium text-zinc-200">{wsName}</span>
                          {workspacesConfig.active === wsName && (
                            <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/50">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onLoadWorkspace && onLoadWorkspace(wsName)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => {
                              const nextWs = { ...workspacesConfig.workspaces };
                              delete nextWs[wsName];
                              const updated = { ...workspacesConfig, workspaces: nextWs };
                              setWorkspacesConfig(updated);
                              vault.saveConfig('workspaces', updated);
                            }}
                            className="p-1 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
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
