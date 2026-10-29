import React, { useState } from 'react';
import { Table, Check, Plus } from 'lucide-react';

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  onClose?: () => void;
  maxCols?: number;
  maxRows?: number;
}

export const TableGridPicker: React.FC<TableGridPickerProps> = ({
  onSelect,
  onClose,
  maxCols = 8,
  maxRows = 8
}) => {
  const [hoveredRows, setHoveredRows] = useState(3);
  const [hoveredCols, setHoveredCols] = useState(3);
  const [customRows, setCustomRows] = useState('3');
  const [customCols, setCustomCols] = useState('3');

  const handleCellClick = (r: number, c: number) => {
    onSelect(r, c);
    onClose?.();
  };

  const handleCustomInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Math.max(1, Math.min(50, parseInt(customRows, 10) || 3));
    const c = Math.max(1, Math.min(20, parseInt(customCols, 10) || 3));
    onSelect(r, c);
    onClose?.();
  };

  return (
    <div 
      className="skeuo-card p-3 shadow-2xl rounded-2xl w-64 select-none text-xs text-[#111113] dark:text-[#f4f4f6] animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      {/* Header with Title and Dimensions */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          <Table className="w-3.5 h-3.5 text-[#384cff] dark:text-[#6372ff]" />
          <span>Insert Table</span>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#ececf0] dark:bg-[#27272a] text-[#384cff] dark:text-[#6372ff] border border-black/[0.05] dark:border-white/[0.08]">
          {hoveredCols} × {hoveredRows}
        </span>
      </div>

      {/* Google Docs-Style Interactive 8x8 Grid */}
      <div 
        className="flex flex-col gap-1 items-center justify-center p-1.5 bg-[#f8f8fa] dark:bg-[#141416] rounded-xl border border-black/[0.05] dark:border-white/[0.06] mb-3 cursor-pointer"
        onMouseLeave={() => {
          // Keep current or reset to 3x3
        }}
      >
        {Array.from({ length: maxRows }, (_, rIdx) => {
          const r = rIdx + 1;
          return (
            <div key={r} className="flex gap-1">
              {Array.from({ length: maxCols }, (_, cIdx) => {
                const c = cIdx + 1;
                const isHighlighted = r <= hoveredRows && c <= hoveredCols;
                return (
                  <div
                    key={c}
                    onMouseEnter={() => {
                      setHoveredRows(r);
                      setHoveredCols(c);
                    }}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-5 h-5 rounded-[4px] transition-all duration-75 border ${
                      isHighlighted
                        ? 'bg-[#384cff] dark:bg-[#6372ff] border-[#2e41ea] dark:border-[#7c88ff] scale-105 shadow-xs'
                        : 'bg-white dark:bg-[#202024] border-black/[0.1] dark:border-white/[0.08] hover:border-black/[0.25]'
                    }`}
                    title={`${c} × ${r}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Quick Dimension Presets */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-[#8e8e93] dark:text-[#71717a]">
          Quick Presets
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            [2, 2],
            [3, 3],
            [4, 3],
            [5, 4]
          ].map(([c, r]) => (
            <button
              key={`${c}x${r}`}
              type="button"
              onClick={() => handleCellClick(r, c)}
              className="py-1 px-1.5 rounded-lg text-center font-mono text-[10.5px] bg-[#ececf0] dark:bg-[#27272a] hover:bg-[#384cff] hover:text-white dark:hover:bg-[#6372ff] dark:hover:text-white border border-black/[0.05] dark:border-white/[0.08] transition-colors"
            >
              {c}×{r}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Dimension Input */}
      <form onSubmit={handleCustomInsert} className="mt-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            min="1"
            max="30"
            value={customCols}
            onChange={e => setCustomCols(e.target.value)}
            className="w-full text-center px-1.5 py-1 text-xs rounded-lg bg-white dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-[#384cff]"
            placeholder="Cols"
            title="Columns"
          />
          <span className="text-[#8e8e93] text-[10px]">×</span>
          <input
            type="number"
            min="1"
            max="50"
            value={customRows}
            onChange={e => setCustomRows(e.target.value)}
            className="w-full text-center px-1.5 py-1 text-xs rounded-lg bg-white dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-[#384cff]"
            placeholder="Rows"
            title="Rows"
          />
        </div>
        <button
          type="submit"
          className="px-2.5 py-1 rounded-lg bg-[#384cff] dark:bg-[#6372ff] hover:bg-[#2e41ea] dark:hover:bg-[#5262ff] text-white text-[11px] font-medium transition-colors shrink-0"
        >
          Insert
        </button>
      </form>
    </div>
  );
};

export function generateMarkdownTable(rows: number, cols: number): string {
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);

  const headers = Array.from({ length: safeCols }, (_, i) => `Column ${i + 1}`);
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${Array(safeCols).fill('--------').join(' | ')} |`;
  
  const dataLines = Array.from({ length: safeRows }, (_, rIdx) => {
    const cells = Array.from({ length: safeCols }, (_, cIdx) => `Item ${rIdx + 1}.${cIdx + 1}`);
    return `| ${cells.join(' | ')} |`;
  });

  return `\n${headerLine}\n${separatorLine}\n${dataLines.join('\n')}\n`;
}
