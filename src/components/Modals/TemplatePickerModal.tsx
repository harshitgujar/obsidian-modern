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
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-black/[0.08] rounded-3xl skeuo-modal overflow-hidden flex flex-col text-sm text-[#111113]"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-[#f8f8fa]">
          <div className="flex items-center gap-2 text-[#111113] font-semibold text-xs">
            <FileCode className="w-4 h-4 text-zinc-700" />
            <span>Insert Template ({templateFiles.length} available)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8e8e93] hover:text-[#111113] hover:bg-black/[0.04] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1.5">
          {templateFiles.length === 0 ? (
            <div className="text-[#8e8e93] text-center py-8 text-xs italic">
              No template files found in folder <code className="text-[#111113] font-semibold">{templateFolder}</code>.<br />
              Create a note in the Templates folder to use as a template.
            </div>
          ) : (
            templateFiles.map((file, idx) => (
              <div
                key={file.path}
                onClick={() => handleSelect(file)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  idx === selectedIndex
                    ? 'bg-[#18181b] text-white border-transparent shadow-sm'
                    : 'bg-[#f8f8fa] text-[#111113] border-black/[0.05] hover:bg-[#ececf0]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className={`w-4 h-4 shrink-0 ${idx === selectedIndex ? 'text-white' : 'text-zinc-600'}`} />
                  <span className="font-medium truncate">{file.name.replace(/\.md$/, '')}</span>
                </div>
                <CornerDownLeft className={`w-3.5 h-3.5 shrink-0 ${idx === selectedIndex ? 'text-white/80' : 'text-[#8e8e93]'}`} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
