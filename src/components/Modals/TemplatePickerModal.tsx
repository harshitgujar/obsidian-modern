import React, { useState, useEffect } from 'react';
import { VaultFile } from '../../types';
import { FileCode, FileText, CornerDownLeft, X } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: VaultFile[];
  templateFolder?: string;
  onSelectTemplate: (templateContent: string) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  files,
  templateFolder = 'Templates',
  onSelectTemplate
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const templateFiles = React.useMemo(() => {
    return files.filter(f =>
      f.extension === 'md' && (f.folder === templateFolder || f.path.startsWith(`${templateFolder}/`) || f.name.toLowerCase().includes('template'))
    );
  }, [files, templateFolder]);

  useEffect(() => {
    if (isOpen) setSelectedIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (file: VaultFile) => {
    onSelectTemplate(file.content);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161619]">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>Insert Template ({templateFiles.length} available)</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {templateFiles.length === 0 ? (
            <div className="text-zinc-500 text-center py-6 text-xs italic">
              No template files found in folder <code className="text-purple-300">{templateFolder}</code>.<br />
              Create a note in the Templates folder to use as a template.
            </div>
          ) : (
            templateFiles.map((file, idx) => (
              <div
                key={file.path}
                onClick={() => handleSelect(file)}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-purple-600/30 text-purple-200'
                    : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-medium truncate">{file.name.replace(/\.md$/, '')}</span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
