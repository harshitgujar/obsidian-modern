import React, { useRef, useEffect, useCallback } from 'react';
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

// Obsidian Dark Syntax Theme
const obsidianHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.75em', fontWeight: 'bold', color: '#f4f4f5' },
  { tag: t.heading2, fontSize: '1.4em', fontWeight: '600', color: '#f4f4f5' },
  { tag: t.heading3, fontSize: '1.2em', fontWeight: '600', color: '#e4e4e7' },
  { tag: t.heading4, fontSize: '1.05em', fontWeight: '600', color: '#e4e4e7' },
  { tag: t.strong, fontWeight: 'bold', color: '#ffffff' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#e4e4e7' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#71717a' },
  { tag: t.link, color: '#c084fc', textDecoration: 'underline' },
  { tag: t.url, color: '#a855f7' },
  { tag: t.monospace, color: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.08)', borderRadius: '3px' },
  { tag: t.comment, color: '#71717a', fontStyle: 'italic' },
  { tag: t.meta, color: '#94a3b8' },
  { tag: t.processingInstruction, color: '#a855f7' },
  { tag: t.keyword, color: '#c084fc' },
  { tag: t.atom, color: '#f59e0b' },
  { tag: t.number, color: '#10b981' },
  { tag: t.definition(t.variableName), color: '#38bdf8' },
  { tag: t.variableName, color: '#e4e4e7' },
  { tag: t.quote, color: '#a1a1aa', fontStyle: 'italic' },
  { tag: t.list, color: '#a855f7' }
]);

const obsidianEditorTheme = EditorView.theme({
  '&': {
    color: '#e4e4e7',
    backgroundColor: 'transparent',
    fontSize: '15px',
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
    caretColor: '#c084fc',
    maxWidth: '820px',
    margin: '0 auto',
    minHeight: '100%',
  },
  '.cm-line': {
    padding: '0 4px',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#c084fc',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(168, 85, 247, 0.28) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: '4px',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    outline: '1px solid #a855f7',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#52525b',
    border: 'none',
    paddingRight: '12px',
    userSelect: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: '#a1a1aa',
    fontWeight: '600',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    padding: '0 8px 0 16px',
    minWidth: '36px',
    textAlign: 'right',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#18181b !important',
    border: '1px solid #3f3f46 !important',
    borderRadius: '8px !important',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important',
    overflow: 'hidden !important',
    padding: '4px !important',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '6px 10px !important',
    borderRadius: '6px !important',
    color: '#d4d4d8 !important',
    fontSize: '13px !important',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(168, 85, 247, 0.25) !important',
    color: '#ffffff !important',
  },
});

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  showLineNumbers?: boolean;
  allFiles?: VaultFile[];
  onNavigateLink?: (targetTitle: string) => void;
  placeholder?: string;
  className?: string;
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  showLineNumbers = true,
  allFiles = [],
  onNavigateLink,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isUpdatingRef = useRef(false);

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

    const extensions: Extension[] = [
      obsidianEditorTheme,
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

    if (showLineNumbers) {
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
  }, [showLineNumbers, wikilinkCompletion]);

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
      className={`w-full h-full overflow-hidden select-text cursor-text ${className}`} 
    />
  );
};
