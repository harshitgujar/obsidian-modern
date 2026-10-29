import { WidgetType, EditorView } from '@codemirror/view';
import { parseMarkdownTable, serializeMarkdownTable, TableData } from './InteractiveTable';

export class CodeMirrorTableWidget extends WidgetType {
  constructor(
    readonly markdown: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: CodeMirrorTableWidget) {
    return this.markdown === other.markdown && this.from === other.from && this.to === other.to;
  }

  ignoreEvent() {
    // Let cell clicks, input events, and button interactions pass directly to the DOM
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const tableData: TableData = parseMarkdownTable(this.markdown) || {
      headers: ['Column 1', 'Column 2'],
      alignments: ['none', 'none'],
      rows: [['Item 1', 'Item 2']]
    };

    const container = document.createElement('div');
    container.className =
      'cm-google-docs-table-widget my-4 select-none rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#18181b] shadow-sm text-xs font-sans';

    // Helper to commit changes to CodeMirror document
    const commitChange = (newData: TableData) => {
      const newMarkdown = serializeMarkdownTable(newData);
      view.dispatch({
        changes: {
          from: this.from,
          to: this.to,
          insert: newMarkdown
        }
      });
    };

    // 1. Top Action Bar (Google Docs style)
    const topBar = document.createElement('div');
    topBar.className =
      'flex items-center justify-between px-3 py-1.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#f8f8fa] dark:bg-[#1c1c20] text-[#585860] dark:text-[#a1a1aa] rounded-t-xl';

    const infoGroup = document.createElement('div');
    infoGroup.className = 'flex items-center gap-2';

    const badge = document.createElement('span');
    badge.className =
      'flex items-center gap-1.5 text-[11px] font-medium text-[#111113] dark:text-[#f4f4f6] px-2 py-0.5 rounded-lg bg-[#ececf0] dark:bg-[#27272a] border border-black/[0.05] dark:border-white/[0.06]';
    badge.innerHTML = `
      <svg class="w-3 h-3 text-[#384cff] dark:text-[#6372ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>
      <span>${tableData.headers.length} Cols × ${tableData.rows.length} Rows</span>
    `;
    infoGroup.appendChild(badge);

    // Add Row Quick Action
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className =
      'flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#111113] dark:hover:text-white transition-colors cursor-pointer text-[11px]';
    addRowBtn.innerHTML = `
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      <span>+ Row</span>
    `;
    addRowBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newRows = [...tableData.rows, Array(tableData.headers.length).fill('')];
      commitChange({ ...tableData, rows: newRows });
    };
    infoGroup.appendChild(addRowBtn);

    // Add Column Quick Action
    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className =
      'flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#111113] dark:hover:text-white transition-colors cursor-pointer text-[11px]';
    addColBtn.innerHTML = `
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      <span>+ Column</span>
    `;
    addColBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextHeaders = [...tableData.headers, `Column ${tableData.headers.length + 1}`];
      const nextAlignments: TableData['alignments'] = [...tableData.alignments, 'none'];
      const nextRows = tableData.rows.map(r => [...r, '']);
      commitChange({
        headers: nextHeaders,
        alignments: nextAlignments,
        rows: nextRows
      });
    };
    infoGroup.appendChild(addColBtn);

    topBar.appendChild(infoGroup);

    // Right tools: Source View Toggle
    const toolsGroup = document.createElement('div');
    toolsGroup.className = 'flex items-center gap-1';

    const sourceBtn = document.createElement('button');
    sourceBtn.type = 'button';
    sourceBtn.title = 'Edit Raw Markdown';
    sourceBtn.className =
      'p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#111113] dark:hover:text-white transition-colors cursor-pointer';
    sourceBtn.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    
    toolsGroup.appendChild(sourceBtn);
    topBar.appendChild(toolsGroup);
    container.appendChild(topBar);

    // 2. Table Element
    const tableScroll = document.createElement('div');
    tableScroll.className = 'overflow-x-auto';

    const tableEl = document.createElement('table');
    tableEl.className = 'w-full text-xs border-collapse';

    // Thead
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    headerTr.className =
      'bg-[#f8f8fa] dark:bg-[#1f1f23] border-b border-black/[0.08] dark:border-white/[0.08] text-[#111113] dark:text-[#f4f4f6] font-semibold';

    // Row number header '#'
    const numTh = document.createElement('th');
    numTh.className =
      'w-8 px-2 py-2 text-center text-[10px] font-mono text-[#8e8e93] dark:text-[#71717a] border-r border-black/[0.06] dark:border-white/[0.06]';
    numTh.textContent = '#';
    headerTr.appendChild(numTh);

    tableData.headers.forEach((hText, colIdx) => {
      const th = document.createElement('th');
      th.className =
        'px-3 py-2 border-r border-black/[0.06] dark:border-white/[0.06] last:border-r-0 relative group/th';

      const cellInput = document.createElement('input');
      cellInput.type = 'text';
      cellInput.value = hText;
      cellInput.className =
        'w-full bg-transparent font-semibold text-[#111113] dark:text-[#f4f4f6] focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-1 focus:ring-[#384cff] dark:focus:ring-[#6372ff] rounded px-1.5 py-0.5 transition-all truncate';
      
      cellInput.addEventListener('mousedown', e => e.stopPropagation());
      cellInput.addEventListener('blur', () => {
        if (cellInput.value !== hText) {
          const nextHeaders = [...tableData.headers];
          nextHeaders[colIdx] = cellInput.value.trim() || `Column ${colIdx + 1}`;
          commitChange({ ...tableData, headers: nextHeaders });
        }
      });

      cellInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          cellInput.blur();
        }
      });

      th.appendChild(cellInput);
      headerTr.appendChild(th);
    });

    thead.appendChild(headerTr);
    tableEl.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');
    tableData.rows.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      tr.className =
        'border-b border-black/[0.05] dark:border-white/[0.05] last:border-b-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors';

      // Row Number
      const rowNumTd = document.createElement('td');
      rowNumTd.className =
        'w-8 px-2 py-2 text-center font-mono text-[10px] text-[#8e8e93] dark:text-[#71717a] border-r border-black/[0.06] dark:border-white/[0.06] bg-[#fafafc] dark:bg-[#1a1a1e]';
      rowNumTd.textContent = String(rowIdx + 1);
      tr.appendChild(rowNumTd);

      // Data Cells
      tableData.headers.forEach((_, colIdx) => {
        const td = document.createElement('td');
        td.className =
          'px-3 py-1.5 border-r border-black/[0.06] dark:border-white/[0.06] last:border-r-0';

        const cellInput = document.createElement('input');
        cellInput.type = 'text';
        cellInput.value = row[colIdx] || '';
        cellInput.className =
          'w-full bg-transparent text-[#111113] dark:text-[#f4f4f6] focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-1 focus:ring-[#384cff] dark:focus:ring-[#6372ff] rounded px-1.5 py-0.5 transition-all';

        cellInput.addEventListener('mousedown', e => e.stopPropagation());
        
        cellInput.addEventListener('blur', () => {
          if (cellInput.value !== (row[colIdx] || '')) {
            const nextRows = tableData.rows.map((r, rI) => {
              if (rI !== rowIdx) return r;
              const nR = [...r];
              nR[colIdx] = cellInput.value;
              return nR;
            });
            commitChange({ ...tableData, rows: nextRows });
          }
        });

        cellInput.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            cellInput.blur();
            const isLastCol = colIdx === tableData.headers.length - 1;
            const isLastRow = rowIdx === tableData.rows.length - 1;

            if (!e.shiftKey) {
              if (isLastCol && isLastRow) {
                // Auto append row on last cell (Google Docs style)
                const nextRows = [...tableData.rows, Array(tableData.headers.length).fill('')];
                commitChange({ ...tableData, rows: nextRows });
              } else {
                // Focus next input in table
                const allInputs = Array.from(tbody.querySelectorAll('input'));
                const currentIdx = allInputs.indexOf(cellInput);
                if (currentIdx >= 0 && currentIdx < allInputs.length - 1) {
                  allInputs[currentIdx + 1].focus();
                  allInputs[currentIdx + 1].select();
                }
              }
            } else {
              // Shift+Tab
              const allInputs = Array.from(tbody.querySelectorAll('input'));
              const currentIdx = allInputs.indexOf(cellInput);
              if (currentIdx > 0) {
                allInputs[currentIdx - 1].focus();
                allInputs[currentIdx - 1].select();
              }
            }
          } else if (e.key === 'Enter') {
            e.preventDefault();
            cellInput.blur();
            // Move to cell directly below
            const allInputs = Array.from(tbody.querySelectorAll('input'));
            const numCols = tableData.headers.length;
            const currentIdx = allInputs.indexOf(cellInput);
            const nextBelowIdx = currentIdx + numCols;
            if (nextBelowIdx < allInputs.length) {
              allInputs[nextBelowIdx].focus();
              allInputs[nextBelowIdx].select();
            } else {
              // Append row
              const nextRows = [...tableData.rows, Array(tableData.headers.length).fill('')];
              commitChange({ ...tableData, rows: nextRows });
            }
          }
        });

        td.appendChild(cellInput);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    tableEl.appendChild(tbody);
    tableScroll.appendChild(tableEl);
    container.appendChild(tableScroll);

    // 3. Quick Bottom Row Button
    const bottomBar = document.createElement('div');
    bottomBar.className =
      'border-t border-black/[0.05] dark:border-white/[0.05] bg-[#fafafc] dark:bg-[#17171a] p-1 flex justify-center rounded-b-xl';

    const appendBtn = document.createElement('button');
    appendBtn.type = 'button';
    appendBtn.className =
      'w-full py-1 text-center text-[11px] font-medium text-[#8e8e93] hover:text-[#111113] dark:text-[#71717a] dark:hover:text-[#f4f4f6] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer';
    appendBtn.innerHTML = `
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      <span>Add row</span>
    `;
    appendBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextRows = [...tableData.rows, Array(tableData.headers.length).fill('')];
      commitChange({ ...tableData, rows: nextRows });
    };
    bottomBar.appendChild(appendBtn);
    container.appendChild(bottomBar);

    // Raw Markdown toggle handler
    sourceBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Select the table range in CodeMirror so user can view/edit in source mode if needed
      view.dispatch({
        selection: { anchor: this.from, head: this.to }
      });
      view.focus();
    };

    return container;
  }
}
