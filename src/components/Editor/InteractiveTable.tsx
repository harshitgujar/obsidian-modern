import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ChevronDown, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Code2, 
  Check, 
  Table as TableIcon 
} from 'lucide-react';

export interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right' | 'none')[];
  rows: string[][];
}

export function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) return null;

  const parseRow = (line: string) => {
    return line
      .slice(1, -1)
      .split('|')
      .map(c => c.trim());
  };

  const rawHeaders = parseRow(lines[0]);
  if (!rawHeaders || rawHeaders.length === 0) return null;

  const rawDelim = parseRow(lines[1]);
  if (!rawDelim) return null;

  const alignments: ('left' | 'center' | 'right' | 'none')[] = rawDelim.map(col => {
    const c = col.trim();
    const hasLeft = c.startsWith(':');
    const hasRight = c.endsWith(':');
    if (hasLeft && hasRight) return 'center';
    if (hasRight) return 'right';
    if (hasLeft) return 'left';
    return 'none';
  });

  const headers = rawHeaders;
  const colCount = headers.length;

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const r = parseRow(lines[i]);
    if (r) {
      const padded = [...r];
      while (padded.length < colCount) padded.push('');
      rows.push(padded.slice(0, colCount));
    }
  }

  return { headers, alignments, rows };
}

export function serializeMarkdownTable(data: TableData): string {
  const { headers, alignments, rows } = data;
  const colCount = headers.length;

  // Calculate clean column padding widths
  const widths = headers.map((h, i) => {
    let max = Math.max(h.length, 3);
    for (const r of rows) {
      if (r[i]) max = Math.max(max, r[i].length);
    }
    return max;
  });

  const headerLine = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';

  const delimLine = '| ' + alignments.map((a, i) => {
    const w = widths[i];
    if (a === 'center') return ':' + '-'.repeat(Math.max(w - 2, 1)) + ':';
    if (a === 'right') return '-'.repeat(Math.max(w - 1, 2)) + ':';
    if (a === 'left') return ':' + '-'.repeat(Math.max(w - 1, 2));
    return '-'.repeat(w);
  }).join(' | ') + ' |';

  const rowLines = rows.map(r => {
    return '| ' + headers.map((_, i) => (r[i] || '').padEnd(widths[i])).join(' | ') + ' |';
  });

  return [headerLine, delimLine, ...rowLines].join('\n');
}

interface InteractiveTableProps {
  initialMarkdown: string;
  onChange?: (newMarkdown: string) => void;
  isEditable?: boolean;
  className?: string;
}

export const InteractiveTable: React.FC<InteractiveTableProps> = ({
  initialMarkdown,
  onChange,
  isEditable = true,
  className = ''
}) => {
  const [data, setData] = useState<TableData>(() => {
    return parseMarkdownTable(initialMarkdown) || {
      headers: ['Column 1', 'Column 2'],
      alignments: ['none', 'none'],
      rows: [['Item 1', 'Item 2']]
    };
  });

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellDraft, setCellDraft] = useState('');
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const [activeColMenu, setActiveColMenu] = useState<number | null>(null);
  const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parsed = parseMarkdownTable(initialMarkdown);
    if (parsed) {
      setData(parsed);
    }
  }, [initialMarkdown]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const commitDataChange = (newData: TableData) => {
    setData(newData);
    if (onChange) {
      onChange(serializeMarkdownTable(newData));
    }
  };

  const startEditing = (row: number, col: number) => {
    if (!isEditable) return;
    const currentVal = row === -1 ? data.headers[col] : (data.rows[row]?.[col] || '');
    setEditingCell({ row, col });
    setCellDraft(currentVal);
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;

    if (row === -1) {
      const nextHeaders = [...data.headers];
      nextHeaders[col] = cellDraft.trim() || `Column ${col + 1}`;
      commitDataChange({ ...data, headers: nextHeaders });
    } else {
      const nextRows = data.rows.map((r, rIdx) => {
        if (rIdx !== row) return r;
        const nextRow = [...r];
        nextRow[col] = cellDraft;
        return nextRow;
      });
      commitDataChange({ ...data, rows: nextRows });
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const totalRows = data.rows.length;
    const totalCols = data.headers.length;

    if (e.key === 'Enter') {
      e.preventDefault();
      commitCellEdit();
      // Move to cell below
      if (row < totalRows - 1) {
        startEditing(row + 1, col);
      } else if (row === totalRows - 1) {
        // Add new row if pressing Enter on last row
        handleAddRow();
        setTimeout(() => startEditing(row + 1, col), 50);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitCellEdit();
      if (!e.shiftKey) {
        // Move to next cell
        if (col < totalCols - 1) {
          startEditing(row, col + 1);
        } else if (row < totalRows - 1) {
          startEditing(row + 1, 0);
        } else {
          // Bottom-right cell: Google Docs auto-creates new row!
          handleAddRow();
          setTimeout(() => startEditing(row + 1, 0), 50);
        }
      } else {
        // Shift+Tab: Move to previous cell
        if (col > 0) {
          startEditing(row, col - 1);
        } else if (row > -1) {
          startEditing(row - 1, totalCols - 1);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Google Docs Row Operations
  const handleAddRow = (atIndex?: number) => {
    const insertIdx = atIndex !== undefined ? atIndex : data.rows.length;
    const newRow = Array(data.headers.length).fill('');
    const nextRows = [...data.rows];
    nextRows.splice(insertIdx, 0, newRow);
    commitDataChange({ ...data, rows: nextRows });
    setActiveRowMenu(null);
  };

  const handleDeleteRow = (index: number) => {
    if (data.rows.length <= 1) return;
    const nextRows = data.rows.filter((_, idx) => idx !== index);
    commitDataChange({ ...data, rows: nextRows });
    setActiveRowMenu(null);
  };

  // Google Docs Column Operations
  const handleAddColumn = (atIndex?: number) => {
    const insertIdx = atIndex !== undefined ? atIndex : data.headers.length;
    const nextHeaders = [...data.headers];
    nextHeaders.splice(insertIdx, 0, `Column ${nextHeaders.length + 1}`);

    const nextAlignments = [...data.alignments];
    nextAlignments.splice(insertIdx, 0, 'none');

    const nextRows = data.rows.map(r => {
      const nextR = [...r];
      nextR.splice(insertIdx, 0, '');
      return nextR;
    });

    commitDataChange({
      headers: nextHeaders,
      alignments: nextAlignments,
      rows: nextRows
    });
    setActiveColMenu(null);
  };

  const handleDeleteColumn = (index: number) => {
    if (data.headers.length <= 1) return;
    const nextHeaders = data.headers.filter((_, idx) => idx !== index);
    const nextAlignments = data.alignments.filter((_, idx) => idx !== index);
    const nextRows = data.rows.map(r => r.filter((_, idx) => idx !== index));

    commitDataChange({
      headers: nextHeaders,
      alignments: nextAlignments,
      rows: nextRows
    });
    setActiveColMenu(null);
  };

  const handleSetAlignment = (colIndex: number, align: 'left' | 'center' | 'right' | 'none') => {
    const nextAlignments = [...data.alignments];
    nextAlignments[colIndex] = align;
    commitDataChange({ ...data, alignments: nextAlignments });
    setActiveColMenu(null);
  };

  const getAlignmentClass = (align: 'left' | 'center' | 'right' | 'none') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className={`my-4 relative group/table select-none ${className}`}>
      {/* 1. Google Docs Floating Action Bar */}
      {isEditable && (
        <div className="flex items-center justify-between gap-1 mb-2 px-1 text-xs text-[#585860] dark:text-[#a1a1aa] transition-opacity">
          <div className="flex items-center gap-1.5 font-medium">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#ececf0] dark:bg-[#202024] text-[#111113] dark:text-[#f4f4f6] border border-black/[0.06] dark:border-white/[0.08] text-[11px]">
              <TableIcon className="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" />
              <span>{data.headers.length} Cols × {data.rows.length} Rows</span>
            </div>

            {/* Quick Insert Actions */}
            <button
              onClick={() => handleAddRow()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08]"
              title="Add row at bottom"
            >
              <Plus className="w-3 h-3" />
              <span>Row</span>
            </button>

            <button
              onClick={() => handleAddColumn()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white transition-colors border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08]"
              title="Add column at right"
            >
              <Plus className="w-3 h-3" />
              <span>Column</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowRawMarkdown(prev => !prev)}
              className={`p-1 rounded-lg transition-colors ${
                showRawMarkdown
                  ? 'bg-[#384cff] text-white'
                  : 'hover:bg-[#ececf0] dark:hover:bg-[#27272a] hover:text-[#111113] dark:hover:text-white'
              }`}
              title={showRawMarkdown ? "Show visual table" : "View Markdown source"}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Raw Markdown Preview Mode */}
      {showRawMarkdown ? (
        <div className="p-3 bg-[#18181b] text-[#f4f4f6] font-mono text-xs rounded-xl border border-white/[0.08] overflow-x-auto whitespace-pre">
          {serializeMarkdownTable(data)}
        </div>
      ) : (
        /* 3. High Fidelity Visual Google Docs Table */
        <div className="relative overflow-x-auto rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-sm">
          <table className="w-full text-xs border-collapse">
            {/* Header Row */}
            <thead>
              <tr className="bg-[#f8f8fa] dark:bg-[#1f1f23] border-b border-black/[0.08] dark:border-white/[0.08]">
                {/* Row Number Header */}
                <th className="w-8 px-2 py-2 text-center text-[10px] font-mono text-[#8e8e93] dark:text-[#71717a] border-r border-black/[0.06] dark:border-white/[0.06]">
                  #
                </th>

                {data.headers.map((header, colIdx) => {
                  const isEditing = editingCell?.row === -1 && editingCell?.col === colIdx;
                  const align = data.alignments[colIdx] || 'none';

                  return (
                    <th
                      key={colIdx}
                      className={`relative px-3 py-2.5 font-semibold text-[#111113] dark:text-[#f4f4f6] border-r border-black/[0.06] dark:border-white/[0.06] last:border-r-0 group/col ${getAlignmentClass(align)}`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={cellDraft}
                          onChange={e => setCellDraft(e.target.value)}
                          onBlur={commitCellEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-[#27272a] text-[#111113] dark:text-[#f4f4f6] border border-[#384cff] dark:border-[#6372ff] rounded outline-none ring-2 ring-[#384cff]/30 font-semibold"
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(-1, colIdx)}
                          className="cursor-text py-0.5 truncate flex items-center justify-between gap-1 group/header"
                        >
                          <span className="truncate">{header}</span>

                          {/* Column Menu Trigger Button */}
                          {isEditable && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setActiveColMenu(activeColMenu === colIdx ? null : colIdx);
                              }}
                              className="opacity-0 group-hover/col:opacity-100 p-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#8e8e93] hover:text-[#111113] dark:hover:text-white transition-opacity"
                              title="Column Options"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Column Dropdown Menu */}
                      {activeColMenu === colIdx && (
                        <div
                          className="absolute right-1 top-full mt-1 z-30 w-44 bg-white dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl shadow-xl p-1 text-xs text-[#111113] dark:text-[#f4f4f6] flex flex-col gap-0.5 animate-in fade-in zoom-in-95"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleAddColumn(colIdx)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-left transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 text-[#384cff]" />
                            <span>Insert column left</span>
                          </button>
                          <button
                            onClick={() => handleAddColumn(colIdx + 1)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-left transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-[#384cff]" />
                            <span>Insert column right</span>
                          </button>

                          <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.06] my-0.5" />

                          <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#8e8e93] tracking-wider">
                            Alignment
                          </div>
                          <div className="flex items-center gap-1 px-1">
                            <button
                              onClick={() => handleSetAlignment(colIdx, 'left')}
                              className={`flex-1 p-1 rounded flex justify-center hover:bg-[#ececf0] dark:hover:bg-[#27272a] ${align === 'left' ? 'text-[#384cff]' : ''}`}
                              title="Align Left"
                            >
                              <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSetAlignment(colIdx, 'center')}
                              className={`flex-1 p-1 rounded flex justify-center hover:bg-[#ececf0] dark:hover:bg-[#27272a] ${align === 'center' ? 'text-[#384cff]' : ''}`}
                              title="Align Center"
                            >
                              <AlignCenter className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSetAlignment(colIdx, 'right')}
                              className={`flex-1 p-1 rounded flex justify-center hover:bg-[#ececf0] dark:hover:bg-[#27272a] ${align === 'right' ? 'text-[#384cff]' : ''}`}
                              title="Align Right"
                            >
                              <AlignRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.06] my-0.5" />

                          <button
                            onClick={() => handleDeleteColumn(colIdx)}
                            disabled={data.headers.length <= 1}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete column</span>
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {data.rows.map((row, rowIdx) => {
                return (
                  <tr
                    key={rowIdx}
                    className="border-b border-black/[0.05] dark:border-white/[0.05] last:border-b-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors group/row"
                  >
                    {/* Row Handle / Number */}
                    <td className="w-8 px-2 py-2 text-center font-mono text-[10px] text-[#8e8e93] dark:text-[#71717a] border-r border-black/[0.06] dark:border-white/[0.06] bg-[#fafafc] dark:bg-[#1a1a1e] relative">
                      <span className="group-hover/row:hidden">{rowIdx + 1}</span>
                      {isEditable && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveRowMenu(activeRowMenu === rowIdx ? null : rowIdx);
                          }}
                          className="hidden group-hover/row:inline-flex p-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#111113] dark:text-white"
                          title="Row Options"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}

                      {/* Row Dropdown Menu */}
                      {activeRowMenu === rowIdx && (
                        <div
                          className="absolute left-full top-0 ml-1 z-30 w-40 bg-white dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl shadow-xl p-1 text-xs text-[#111113] dark:text-[#f4f4f6] flex flex-col gap-0.5 animate-in fade-in zoom-in-95"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleAddRow(rowIdx)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-left transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-[#384cff]" />
                            <span>Insert row above</span>
                          </button>
                          <button
                            onClick={() => handleAddRow(rowIdx + 1)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#ececf0] dark:hover:bg-[#27272a] text-left transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-[#384cff]" />
                            <span>Insert row below</span>
                          </button>

                          <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.06] my-0.5" />

                          <button
                            onClick={() => handleDeleteRow(rowIdx)}
                            disabled={data.rows.length <= 1}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete row</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Cell Data */}
                    {data.headers.map((_, colIdx) => {
                      const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                      const cellValue = row[colIdx] || '';
                      const align = data.alignments[colIdx] || 'none';

                      return (
                        <td
                          key={colIdx}
                          className={`px-3 py-2 text-[#111113] dark:text-[#f4f4f6] border-r border-black/[0.06] dark:border-white/[0.06] last:border-r-0 ${getAlignmentClass(align)}`}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={cellDraft}
                              onChange={e => setCellDraft(e.target.value)}
                              onBlur={commitCellEdit}
                              onKeyDown={handleKeyDown}
                              className="w-full px-1.5 py-0.5 bg-white dark:bg-[#27272a] text-[#111113] dark:text-[#f4f4f6] border border-[#384cff] dark:border-[#6372ff] rounded outline-none ring-2 ring-[#384cff]/30"
                            />
                          ) : (
                            <div
                              onClick={() => startEditing(rowIdx, colIdx)}
                              className="cursor-text py-0.5 min-h-[20px] break-words"
                            >
                              {cellValue || <span className="opacity-0 select-none">-</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Quick Row Append Button at bottom (Google Docs style) */}
          {isEditable && (
            <div className="border-t border-black/[0.05] dark:border-white/[0.05] bg-[#fafafc] dark:bg-[#17171a] p-1 flex justify-center">
              <button
                onClick={() => handleAddRow()}
                className="w-full py-1 text-center text-[11px] font-medium text-[#8e8e93] hover:text-[#111113] dark:text-[#71717a] dark:hover:text-[#f4f4f6] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add row</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
