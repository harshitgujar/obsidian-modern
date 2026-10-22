import React, { useState } from 'react';
import { FileDown, Printer, X } from 'lucide-react';
import { VaultFile } from '../../types';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: VaultFile;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  file
}) => {
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState<'default' | 'small' | 'none'>('default');
  const [scale, setScale] = useState<number>(100);
  const [includeTitle, setIncludeTitle] = useState(true);

  if (!isOpen || !file) return null;

  const handleExport = () => {
    // Apply temporary print styles for page configuration
    const styleId = 'obsidian-pdf-export-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const marginValue = margins === 'none' ? '0mm' : margins === 'small' ? '10mm' : '20mm';
    styleEl.textContent = `
      @page {
        size: ${pageSize} ${orientation};
        margin: ${marginValue};
      }
      @media print {
        body {
          zoom: ${scale}%;
        }
        .no-print {
          display: none !important;
        }
      }
    `;

    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[460px] bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#141416]">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Export to PDF</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-300 truncate">
            <span className="text-zinc-500 font-medium mr-2">Note:</span>
            <span className="font-semibold text-zinc-100">{file.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Page size</div>
              <div className="text-[11px] text-zinc-500">Document dimensions</div>
            </div>
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="Letter">Letter (8.5 x 11 in)</option>
              <option value="Legal">Legal (8.5 x 14 in)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Orientation</div>
              <div className="text-[11px] text-zinc-500">Page layout flow</div>
            </div>
            <select
              value={orientation}
              onChange={e => setOrientation(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Margin</div>
              <div className="text-[11px] text-zinc-500">Page border spacing</div>
            </div>
            <select
              value={margins}
              onChange={e => setMargins(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="default">Default (20 mm)</option>
              <option value="small">Small (10 mm)</option>
              <option value="none">None (0 mm)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Downscale percent</div>
              <div className="text-[11px] text-zinc-500">{scale}%</div>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={scale}
              onChange={e => setScale(Number(e.target.value))}
              className="accent-purple-500 w-32"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-zinc-200">Include note title</div>
              <div className="text-[11px] text-zinc-500">Prepend note name heading at page top</div>
            </div>
            <input
              type="checkbox"
              checked={includeTitle}
              onChange={e => setIncludeTitle(e.target.checked)}
              className="accent-purple-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-800/80 bg-[#141416]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
