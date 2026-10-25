import React, { useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { 
  EditorView, 
  lineNumbers, 
  highlightActiveLineGutter, 
  highlightActiveLine, 
  drawSelection, 
  dropCursor, 
  keymap 
} from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap, CompletionContext } from '@codemirror/autocomplete';
import { VaultFile } from '../../types';
import { createLivePreviewPlugin } from './CodeMirrorLivePreview';

// Obsidian Dark Syntax Theme
const obsidianHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.75em', fontWeight: 'bold', color: 'var(--cm-heading, #f4f4f5)' },
  { tag: t.heading2, fontSize: '1.4em', fontWeight: '600', color: 'var(--cm-heading, #f4f4f5)' },
  { tag: t.heading3, fontSize: '1.2em', fontWeight: '600', color: 'var(--cm-heading, #e4e4e7)' },
  { tag: t.heading4, fontSize: '1.05em', fontWeight: '600', color: 'var(--cm-heading, #e4e4e7)' },
  { tag: t.strong, fontWeight: 'bold', color: 'var(--cm-strong, #ffffff)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--cm-emphasis, #e4e4e7)' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--cm-strikethrough, #71717a)' },
  { tag: t.link, color: 'var(--cm-link, #c084fc)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--cm-url, #a855f7)' },
  { tag: t.monospace, color: 'var(--cm-code, #f43f5e)', backgroundColor: 'var(--cm-code-bg, rgba(244, 63, 94, 0.08))', borderRadius: '3px' },
  { tag: t.comment, color: 'var(--cm-comment, #71717a)', fontStyle: 'italic' },
  { tag: t.meta, color: 'var(--cm-meta, #94a3b8)' },
  { tag: t.processingInstruction, color: 'var(--cm-link, #a855f7)' },
  { tag: t.keyword, color: 'var(--cm-keyword, #c084fc)' },
  { tag: t.atom, color: 'var(--cm-atom, #f59e0b)' },
  { tag: t.number, color: 'var(--cm-number, #10b981)' },
  { tag: t.definition(t.variableName), color: 'var(--cm-variable, #38bdf8)' },
  { tag: t.variableName, color: 'var(--cm-variable, #e4e4e7)' },
  { tag: t.quote, color: 'var(--cm-quote, #a1a1aa)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--accent, #a855f7)' }
]);

const obsidianEditorTheme = EditorView.theme({
  '&': {
    color: 'var(--text-primary, #e4e4e7)',
    backgroundColor: 'transparent',
    fontSize: 'inherit',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: '1.75',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '24px 0',
    caretColor: 'var(--accent, #c084fc)',
    minHeight: '100%',
  },
  '.cm-line': {
    padding: '0 4px',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent, #c084fc)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--selection-bg, rgba(168, 85, 247, 0.28)) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--cm-active-line, rgba(255, 255, 255, 0.025))',
    borderRadius: '4px',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--accent-subtle, rgba(168, 85, 247, 0.2))',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'var(--accent-subtle, rgba(168, 85, 247, 0.25))',
    outline: '1px solid var(--accent, #a855f7)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted, #52525b)',
    border: 'none',
    paddingRight: '12px',
    userSelect: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--text-primary, #a1a1aa)',
    fontWeight: '600',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    padding: '0 8px 0 16px',
    minWidth: '36px',
    textAlign: 'right',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--bg-elevated, #18181b) !important',
    border: '1px solid var(--border-color, #3f3f46) !important',
    borderRadius: '8px !important',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important',
    overflow: 'hidden !important',
    padding: '4px !important',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '6px 10px !important',
    borderRadius: '6px !important',
    color: 'var(--text-primary, #d4d4d8) !important',
    fontSize: '13px !important',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--accent-subtle, rgba(168, 85, 247, 0.25)) !important',
    color: '#ffffff !important',
  },
});

export interface CodeMirrorEditorRef {
  formatSelection: (before: string, after: string, fallback?: string) => void;
  insertBlock: (block: string) => void;
  insertHeading: (level: number) => void;
  deleteSelection: () => void;
  getSelection: () => string;
  selectRange: (from: number, to: number) => void;
  setCursorPos: (coords: { x: number; y: number }) => void;
  focus: () => void;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  showLineNumbers?: boolean;
  readableLineLength?: boolean;
  livePreview?: boolean;
  allFiles?: VaultFile[];
  onNavigateLink?: (targetTitle: string) => void;
  onMediaContextMenu?: (e: MouseEvent | any, targetFile: VaultFile | undefined, rawText: string) => void;
  placeholder?: string;
  className?: string;
}

export const CodeMirrorEditor = React.forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(({
  value,
  onChange,
  showLineNumbers = true,
  readableLineLength = true,
  livePreview = false,
  allFiles = [],
  onNavigateLink,
  onMediaContextMenu,
  placeholder,
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isUpdatingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    formatSelection: (before: string, after: string, fallback: string = '') => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const textToWrap = selected || fallback;
      const newText = `${before}${textToWrap}${after}`;

      view.dispatch({
        changes: { from, to, insert: newText },
        selection: selected
          ? { anchor: from, head: from + newText.length }
          : { anchor: from + before.length, head: from + before.length + textToWrap.length }
      });
      view.focus();
    },

    insertBlock: (block: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const isLineEmpty = line.text.trim().length === 0;

      if (from !== to) {
        // Replace current selection
        view.dispatch({
          changes: { from, to, insert: block },
          selection: { anchor: from + block.length }
        });
      } else if (isLineEmpty) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: block },
          selection: { anchor: line.from + block.length }
        });
      } else {
        const textToInsert = `\n${block}`;
        view.dispatch({
          changes: { from: to, to, insert: textToInsert },
          selection: { anchor: to + textToInsert.length }
        });
      }
      view.focus();
    },

    insertHeading: (level: number) => {
      const view = viewRef.current;
      if (!view) return;
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const prefix = '#'.repeat(level) + ' ';

      const match = line.text.match(/^#{1,6}\s+/);
      if (match) {
        view.dispatch({
          changes: { from: line.from, to: line.from + match[0].length, insert: prefix },
          selection: { anchor: line.from + prefix.length + (line.text.length - match[0].length) }
        });
      } else {
        view.dispatch({
          changes: { from: line.from, to: line.from, insert: prefix },
          selection: { anchor: line.from + prefix.length + line.text.length }
        });
      }
      view.focus();
    },

    deleteSelection: () => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      if (from !== to) {
        view.dispatch({
          changes: { from, to, insert: '' },
          selection: { anchor: from }
        });
      }
      view.focus();
    },

    getSelection: () => {
      const view = viewRef.current;
      if (!view) return '';
      const { from, to } = view.state.selection.main;
      return view.state.sliceDoc(from, to);
    },

    selectRange: (from: number, to: number) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        selection: { anchor: from, head: to },
        scrollIntoView: true
      });
      view.focus();
    },

    setCursorPos: (coords: { x: number; y: number }) => {
      const view = viewRef.current;
      if (!view) return;
      const pos = view.posAtCoords(coords);
      if (pos !== null) {
        const { from, to } = view.state.selection.main;
        if (from === to) {
          view.dispatch({
            selection: { anchor: pos }
          });
        }
      }
    },

    focus: () => {
      viewRef.current?.focus();
    }
  }));

  // Wikilink Autocomplete completion source
  const wikilinkCompletion = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\[\[[\w\s\-_/.]*/);
    if (!word) return null;

    const query = word.text.slice(2).toLowerCase();
    const options = allFiles
      .filter(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase().includes(query))
      .slice(0, 10)
      .map(f => {
        const title = f.name.replace(/\.[^/.]+$/, '');
        return {
          label: title,
          detail: f.folder ? ` in ${f.folder}` : undefined,
          apply: `${title}]]`,
          type: 'keyword'
        };
      });

    return {
      from: word.from + 2,
      options
    };
  }, [allFiles]);

  // Setup CodeMirror View
  useEffect(() => {
    if (!containerRef.current) return;

    // Wrap formatting keymaps
    const customKeymap = keymap.of([
      {
        key: 'Mod-b',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selected = view.state.sliceDoc(from, to) || 'bold text';
          view.dispatch({
            changes: { from, to, insert: `**${selected}**` },
            selection: { anchor: from + 2, head: from + 2 + selected.length }
          });
          return true;
        }
      },
      {
        key: 'Mod-i',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selected = view.state.sliceDoc(from, to) || 'italic text';
          view.dispatch({
            changes: { from, to, insert: `*${selected}*` },
            selection: { anchor: from + 1, head: from + 1 + selected.length }
          });
          return true;
        }
      },
      {
        key: 'Mod-k',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selected = view.state.sliceDoc(from, to) || 'Note Title';
          view.dispatch({
            changes: { from, to, insert: `[[${selected}]]` },
            selection: { anchor: from + 2, head: from + 2 + selected.length }
          });
          return true;
        }
      }
    ]);

    const layoutTheme = EditorView.theme({
      '.cm-content': {
        maxWidth: readableLineLength ? '820px' : 'none',
        margin: readableLineLength ? '0 auto' : '0',
        paddingLeft: readableLineLength ? '0' : '28px',
        paddingRight: readableLineLength ? '0' : '28px'
      }
    });

    const extensions: Extension[] = [
      obsidianEditorTheme,
      layoutTheme,
      EditorState.allowMultipleSelections.of(true),
      highlightActiveLine(),
      drawSelection(),
      dropCursor(),
      history(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ override: [wikilinkCompletion] }),
      markdown(),
      syntaxHighlighting(obsidianHighlightStyle),
      customKeymap,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          isUpdatingRef.current = true;
          onChange(update.state.doc.toString());
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 0);
        }
      }),
      EditorView.lineWrapping
    ];

    if (livePreview) {
      extensions.push(
        createLivePreviewPlugin({
          onNavigateLink,
          allFiles,
          onMediaContextMenu
        })
      );
    }

    if (showLineNumbers && !livePreview) {
      extensions.push(lineNumbers(), highlightActiveLineGutter());
    }

    const state = EditorState.create({
      doc: value,
      extensions
    });

    const view = new EditorView({
      state,
      parent: containerRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [showLineNumbers, readableLineLength, livePreview, wikilinkCompletion, onNavigateLink, allFiles, onMediaContextMenu]);

  // Sync external changes
  useEffect(() => {
    if (isUpdatingRef.current || !viewRef.current) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (value !== currentDoc) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value }
      });
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      onClick={(e) => {
        if (e.target === containerRef.current && viewRef.current) {
          const docLength = viewRef.current.state.doc.length;
          viewRef.current.dispatch({
            selection: { anchor: docLength }
          });
          viewRef.current.focus();
        }
      }}
      className={`w-full h-full overflow-hidden select-text cursor-text ${livePreview ? 'cm-live-editor' : ''} ${className}`} 
    />
  );
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
