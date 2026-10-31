import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  MatchDecorator
} from '@codemirror/view';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { VaultFile } from '../../types';
import { CodeMirrorTableWidget } from './CodeMirrorTableWidget';
import { parseMarkdownTable } from './InteractiveTable';

export interface LivePreviewOptions {
  onNavigateLink?: (targetTitle: string) => void;
  allFiles?: VaultFile[];
  getAllFiles?: () => VaultFile[];
  onMediaContextMenu?: (e: React.MouseEvent | MouseEvent, targetFile: VaultFile | undefined, rawText: string) => void;
}

// 1. Wikilink Pill Widget (Apple-style solid pill)
class WikilinkPillWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly alias: string | undefined,
    readonly onNavigate?: (target: string) => void
  ) {
    super();
  }

  eq(other: WikilinkPillWidget) {
    return this.target === other.target && this.alias === other.alias;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className =
      'cm-wikilink-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-full bg-[#ebebef] hover:bg-[#e4e4e9] text-[#1c1c1e] text-[12px] font-medium cursor-pointer transition-all border border-black/[0.05] shadow-xs select-none align-middle';
    span.title = `Click to open [[${this.target}]]`;

    const icon = document.createElement('span');
    icon.innerHTML = `<svg class="w-3 h-3 text-[#18181b] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    span.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = this.alias || this.target;
    span.appendChild(label);

    span.addEventListener('mousedown', e => {
      e.stopPropagation();
    });

    span.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this.onNavigate?.(this.target);
    });

    return span;
  }

  ignoreEvent() {
    return false;
  }
}

// 2. Markdown Highlight Widget (==text==)
class HighlightWidget extends WidgetType {
  constructor(readonly text: string, readonly pos: number) {
    super();
  }

  eq(other: HighlightWidget) {
    return this.text === other.text && this.pos === other.pos;
  }

  toDOM(view: EditorView) {
    const mark = document.createElement('mark');
    mark.className =
      'cm-highlight-mark bg-amber-500/22 text-amber-200 dark:text-amber-100 font-medium px-1.5 py-0.5 rounded-sm mx-0.5 cursor-text select-text transition-colors';
    mark.textContent = this.text;

    mark.addEventListener('mousedown', e => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.pos }
      });
      view.focus();
    });

    return mark;
  }

  ignoreEvent() {
    return false;
  }
}

// 3. Strikethrough Widget (~~text~~)
class StrikethroughWidget extends WidgetType {
  constructor(readonly text: string, readonly pos: number) {
    super();
  }

  eq(other: StrikethroughWidget) {
    return this.text === other.text && this.pos === other.pos;
  }

  toDOM(view: EditorView) {
    const del = document.createElement('del');
    del.className =
      'cm-strikethrough-mark line-through text-zinc-400 dark:text-zinc-500 cursor-text select-text mx-0.5';
    del.textContent = this.text;

    del.addEventListener('mousedown', e => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.pos }
      });
      view.focus();
    });

    return del;
  }

  ignoreEvent() {
    return false;
  }
}

// 2. Interactive Task Checkbox Widget
class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return this.checked === other.checked && this.pos === other.pos;
  }

  toDOM(view: EditorView) {
    const span = document.createElement('span');
    span.className = 'cm-task-widget inline-flex items-center mx-1 select-none align-middle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className =
      'w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600';

    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('change', e => {
      e.stopPropagation();
      const newChar = this.checked ? ' ' : 'x';
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 1, insert: newChar }
      });
    });

    span.appendChild(input);
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

// 3. Horizontal Rule Divider Widget
class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.className = 'cm-hr-divider my-4 border-t border-zinc-800/80 w-full select-none';
    return hr;
  }
}

// 4. Image Embed Widget
class ImageEmbedWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly rawText: string,
    readonly onContextMenu?: (e: MouseEvent, file: VaultFile | undefined, rawText: string) => void,
    readonly allFiles?: VaultFile[],
    readonly getAllFiles?: () => VaultFile[]
  ) {
    super();
  }

  eq(other: ImageEmbedWidget) {
    return this.src === other.src && this.alt === other.alt;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className =
      'cm-image-widget my-4 flex flex-col items-center justify-center select-none cursor-default group';

    const frame = document.createElement('div');
    frame.className =
      'rounded-xl overflow-hidden shadow-2xl bg-[#141416] p-1 max-w-full hover:ring-2 hover:ring-purple-500/40 transition-all';

    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.className = 'max-h-[50vh] w-auto object-contain rounded-lg';
    frame.appendChild(img);
    container.appendChild(frame);

    if (this.alt && this.alt !== this.src) {
      const caption = document.createElement('div');
      caption.className = 'text-xs text-zinc-400 mt-2 italic';
      caption.textContent = this.alt;
      container.appendChild(caption);
    }

    container.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      const cleanPath = this.rawText.replace(/^!\[\[|\]\]$/g, '').split('|')[0].trim();
      const files = this.getAllFiles ? this.getAllFiles() : (this.allFiles || []);
      const targetFile = files.find(
        f => f.path === cleanPath || f.name === cleanPath || (f.name && f.name.replace(/\.[^/.]+$/, '') === cleanPath)
      );
      this.onContextMenu?.(e, targetFile, this.rawText);
    });

    return container;
  }
}

// 5. Note Transclusion (Note Embed) Widget: ![[Note Title]] or ![[Note#Heading]]
class NoteEmbedWidget extends WidgetType {
  constructor(
    readonly targetTitle: string,
    readonly fragment: string | undefined,
    readonly rawText: string,
    readonly onNavigate?: (target: string) => void,
    readonly allFiles?: VaultFile[],
    readonly getAllFiles?: () => VaultFile[]
  ) {
    super();
  }

  eq(other: NoteEmbedWidget) {
    return this.targetTitle === other.targetTitle && this.fragment === other.fragment && this.rawText === other.rawText;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className =
      'cm-note-embed-widget my-3 rounded-xl border border-white/[0.08] bg-black/25 backdrop-blur-xl overflow-hidden shadow-lg select-none hover:border-purple-500/40 transition-colors cursor-default';

    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between px-3.5 py-2 bg-white/[0.03] border-b border-white/[0.06] text-xs font-medium text-zinc-300';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'flex items-center gap-2 truncate cursor-pointer hover:text-white transition-colors';
    const subHeading = this.fragment ? ` > ${this.fragment.replace(/^[#^]/, '')}` : '';
    titleGroup.innerHTML = `
      <svg class="w-3.5 h-3.5 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      <span class="font-semibold text-zinc-100">${this.targetTitle}</span>
      <span class="text-zinc-500 text-[11px]">${subHeading}</span>
    `;
    titleGroup.onclick = (e) => {
      e.stopPropagation();
      this.onNavigate?.(this.targetTitle);
    };

    const badge = document.createElement('span');
    badge.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30';
    badge.textContent = 'Transclusion';

    header.appendChild(titleGroup);
    header.appendChild(badge);
    container.appendChild(header);

    // Body content resolution
    const files = this.getAllFiles ? this.getAllFiles() : (this.allFiles || []);
    const cleanTitle = this.targetTitle.trim().replace(/\.md$/, '');
    const targetFile = files.find(f => 
      f.path === cleanTitle || 
      f.path === `${cleanTitle}.md` || 
      f.name === cleanTitle || 
      f.name === `${cleanTitle}.md` ||
      (f.name && f.name.replace(/\.md$/, '') === cleanTitle)
    );

    const body = document.createElement('div');
    body.className = 'p-3.5 text-xs text-[#111113] leading-relaxed font-sans space-y-2 border-l-2 border-[#18181b] bg-[#f4f4f6]/50';

    if (targetFile) {
      let contentToShow = (targetFile.content || '').replace(/^---[\s\S]*?---\n*/, '').trim();

      if (this.fragment) {
        const cleanHeading = this.fragment.replace(/^[#^]/, '').trim().toLowerCase();
        const lines = contentToShow.split('\n');
        let found = false;
        let headingLevel = 0;
        const sectionLines: string[] = [];

        for (const line of lines) {
          const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (hMatch) {
            const hText = hMatch[2].replace(/[*_~`#\[\]]/g, '').trim().toLowerCase();
            if (!found && hText.includes(cleanHeading)) {
              found = true;
              headingLevel = hMatch[1].length;
              continue;
            } else if (found) {
              const currentLevel = hMatch[1].length;
              if (currentLevel <= headingLevel) break;
            }
          }
          if (found) {
            sectionLines.push(line);
          }
        }
        if (found) {
          contentToShow = sectionLines.join('\n').trim();
        }
      }

      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const displayLines = contentToShow.split('\n').slice(0, 16);
      const renderedHtml = displayLines.map(l => {
        const trimmed = l.trim();
        if (!trimmed) return '<div class="h-1"></div>';
        if (trimmed.startsWith('#')) return `<div class="font-bold text-zinc-100 mt-1">${escapeHtml(trimmed.replace(/^#+\s*/, ''))}</div>`;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return `<div class="flex items-start gap-1.5 pl-1"><span class="text-[#18181b]">•</span><span>${escapeHtml(trimmed.slice(2))}</span></div>`;
        }
        return `<div>${escapeHtml(trimmed)}</div>`;
      }).join('');

      body.innerHTML = renderedHtml || '<span class="italic text-zinc-500">Note has no content.</span>';
    } else {
      body.innerHTML = `<span class="italic text-zinc-500">Note "${this.targetTitle}" not found in vault.</span>`;
    }

    container.appendChild(body);
    return container;
  }
}

// 6. Audio Embed Widget
class AudioEmbedWidget extends WidgetType {
  constructor(readonly src: string, readonly filename: string) {
    super();
  }
  eq(other: AudioEmbedWidget) {
    return this.src === other.src;
  }
  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-audio-widget my-3 p-3 rounded-xl bg-black/30 border border-white/[0.08] shadow-md flex flex-col gap-2 max-w-md';
    const header = document.createElement('div');
    header.className = 'text-xs font-medium text-zinc-300 flex items-center gap-1.5';
    header.innerHTML = `
      <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
      <span>${this.filename}</span>
    `;
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = this.src;
    audio.className = 'w-full h-8';
    container.appendChild(header);
    container.appendChild(audio);
    return container;
  }
}

// 7. Bold Format Widget (**text** or __text__)
class BoldWidget extends WidgetType {
  constructor(readonly text: string, readonly pos: number) {
    super();
  }
  eq(other: BoldWidget) {
    return this.text === other.text && this.pos === other.pos;
  }
  toDOM(view: EditorView) {
    const strong = document.createElement('strong');
    strong.className = 'cm-bold-mark font-bold text-white cursor-text select-text';
    strong.textContent = this.text;
    strong.addEventListener('mousedown', e => {
      e.stopPropagation();
      view.dispatch({ selection: { anchor: this.pos + 2 } });
      view.focus();
    });
    return strong;
  }
  ignoreEvent() {
    return false;
  }
}

// 8. Italic Format Widget (*text* or _text_)
class ItalicWidget extends WidgetType {
  constructor(readonly text: string, readonly pos: number) {
    super();
  }
  eq(other: ItalicWidget) {
    return this.text === other.text && this.pos === other.pos;
  }
  toDOM(view: EditorView) {
    const em = document.createElement('em');
    em.className = 'cm-italic-mark italic text-zinc-200 cursor-text select-text';
    em.textContent = this.text;
    em.addEventListener('mousedown', e => {
      e.stopPropagation();
      view.dispatch({ selection: { anchor: this.pos + 1 } });
      view.focus();
    });
    return em;
  }
  ignoreEvent() {
    return false;
  }
}

// 9. Inline Code Widget (`code`)
class InlineCodeWidget extends WidgetType {
  constructor(readonly text: string, readonly pos: number) {
    super();
  }
  eq(other: InlineCodeWidget) {
    return this.text === other.text && this.pos === other.pos;
  }
  toDOM(view: EditorView) {
    const code = document.createElement('code');
    code.className = 'cm-inline-code font-mono text-[13px] bg-black/40 text-purple-300 px-1.5 py-0.5 rounded border border-white/[0.08] cursor-text select-text';
    code.textContent = this.text;
    code.addEventListener('mousedown', e => {
      e.stopPropagation();
      view.dispatch({ selection: { anchor: this.pos + 1 } });
      view.focus();
    });
    return code;
  }
  ignoreEvent() {
    return false;
  }
}

// Fast helper to detect if a position is inside a fenced code block
function isPosInsideCodeBlock(doc: any, pos: number): boolean {
  try {
    const line = doc.lineAt(pos);
    if (line.text.trim().startsWith('```')) return true;
    let inCode = false;
    for (let i = 1; i < line.number; i++) {
      if (doc.line(i).text.trim().startsWith('```')) {
        inCode = !inCode;
      }
    }
    return inCode;
  } catch {
    return false;
  }
}

export function createLivePreviewPlugin(options: LivePreviewOptions = {}): Extension {
  // Wikilink Match Decorator
  const wikilinkDecorator = new MatchDecorator({
    regexp: /(?<!\!)\[\[([^\]\n]+)\]\]/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      const [rawTarget, alias] = match[1].split('|');
      return Decoration.replace({
        widget: new WikilinkPillWidget(rawTarget.trim(), alias?.trim(), options.onNavigateLink)
      });
    }
  });

  const wikilinkPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = wikilinkDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = wikilinkDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Bold Match Decorator: **text** or __text__
  const boldDecorator = new MatchDecorator({
    regexp: /(?<!\*)\*\*([^*\n]+)\*\*(?!\*)|(?<!_)__([^_\n]+)__(?!_)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      const boldText = match[1] || match[2];
      return Decoration.replace({
        widget: new BoldWidget(boldText, pos)
      });
    }
  });

  const boldPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = boldDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = boldDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Italic Match Decorator: *text* or _text_
  const italicDecorator = new MatchDecorator({
    regexp: /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const fullText = view.state.doc.sliceString(Math.max(0, pos - 1), Math.min(view.state.doc.length, pos + match[0].length + 1));
      if (fullText.includes('**') || fullText.includes('__')) return null;

      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      const italicText = match[1] || match[2];
      return Decoration.replace({
        widget: new ItalicWidget(italicText, pos)
      });
    }
  });

  const italicPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = italicDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = italicDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Inline Code Match Decorator: `code`
  const inlineCodeDecorator = new MatchDecorator({
    regexp: /(?<!`)`([^`\n]+)`(?!`)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      return Decoration.replace({
        widget: new InlineCodeWidget(match[1], pos)
      });
    }
  });

  const inlineCodePlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = inlineCodeDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = inlineCodeDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Highlight Match Decorator: ==text==
  const highlightDecorator = new MatchDecorator({
    regexp: /(?<!=)==([^=\n]+)==(?!=)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      return Decoration.replace({
        widget: new HighlightWidget(match[1], pos)
      });
    }
  });

  const highlightPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = highlightDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = highlightDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Strikethrough Match Decorator: ~~text~~
  const strikethroughDecorator = new MatchDecorator({
    regexp: /(?<!~)~~([^~\n]+)~~(?!~)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      return Decoration.replace({
        widget: new StrikethroughWidget(match[1], pos)
      });
    }
  });

  const strikethroughPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = strikethroughDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = strikethroughDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Checkbox Match Decorator: - [ ] or - [x]
  const checkboxDecorator = new MatchDecorator({
    regexp: /(?<=^\s*[-*+]\s+)\[([ xX])\](?=\s+)/gm,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      const isChecked = match[1].toLowerCase() === 'x';
      return Decoration.replace({
        widget: new TaskCheckboxWidget(isChecked, pos + 1)
      });
    }
  });

  const checkboxPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = checkboxDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = checkboxDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Horizontal Rule Decorator
  const hrDecorator = new MatchDecorator({
    regexp: /^(?:---|\*\*\*|___)\s*$/gm,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }
      return Decoration.replace({
        widget: new HrWidget()
      });
    }
  });

  const hrPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = hrDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = hrDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Universal Embed Decorator: Images, Audio, and Note Transclusions
  const embedDecorator = new MatchDecorator({
    regexp: /!\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\(([^)\n]+)\)/g,
    decoration: (match, view, pos) => {
      if (isPosInsideCodeBlock(view.state.doc, pos)) return null;

      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }

      if (match[1]) {
        const parts = match[1].split('|');
        const rawTarget = parts[0].trim();
        const [targetPath, fragment] = rawTarget.split('#');
        const alias = parts[1]?.trim();

        // 1. Audio Embed
        if (/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(targetPath)) {
          const src = `/api/vault/file/raw?path=${encodeURIComponent(targetPath)}`;
          return Decoration.replace({
            widget: new AudioEmbedWidget(src, targetPath)
          });
        }

        // 2. Image Embed
        if (/\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(targetPath)) {
          const src = `/api/vault/file/raw?path=${encodeURIComponent(targetPath)}`;
          return Decoration.replace({
            widget: new ImageEmbedWidget(src, alias || targetPath, match[0], options.onMediaContextMenu, options.allFiles, options.getAllFiles)
          });
        }

        // 3. Markdown Note Transclusion (Note Embed)
        return Decoration.replace({
          widget: new NoteEmbedWidget(targetPath, fragment, match[0], options.onNavigateLink, options.allFiles, options.getAllFiles)
        });
      } else if (match[3]) {
        // ![alt](src)
        const alt = match[2]?.trim() || '';
        let src = match[3].trim();
        if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          src = `/api/vault/file/raw?path=${encodeURIComponent(src)}`;
        }
        return Decoration.replace({
          widget: new ImageEmbedWidget(src, alt, match[0], options.onMediaContextMenu, options.allFiles, options.getAllFiles)
        });
      }

      return null;
    }
  });

  const embedPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = embedDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = embedDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Line & CodeBlock Styling ViewPlugin
  const headingLinePlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const { from: selFrom, to: selTo } = view.state.selection.main;

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          let inCodeBlock = false;
          const startLine = view.state.doc.lineAt(from).number;
          for (let l = 1; l < startLine; l++) {
            if (view.state.doc.line(l).text.trim().startsWith('```')) {
              inCodeBlock = !inCodeBlock;
            }
          }

          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);
            const lineText = line.text;
            const trimmed = lineText.trim();

            if (trimmed.startsWith('```')) {
              inCodeBlock = !inCodeBlock;
              builder.add(
                line.from,
                line.from,
                Decoration.line({ class: 'cm-codeblock-delimiter' })
              );
            } else if (inCodeBlock) {
              builder.add(
                line.from,
                line.from,
                Decoration.line({ class: 'cm-codeblock-line' })
              );
            } else {
              // Check Heading: # H1, ## H2, etc.
              const hMatch = lineText.match(/^(#{1,6})\s+/);
              if (hMatch) {
                const level = hMatch[1].length;
                const isCursorOnLine = line.from <= selTo && line.to >= selFrom;

                builder.add(
                  line.from,
                  line.from,
                  Decoration.line({
                    class: `cm-line-heading cm-line-h${level}`
                  })
                );

                const prefixLen = hMatch[0].length;
                if (!isCursorOnLine) {
                  builder.add(
                    line.from,
                    line.from + prefixLen,
                    Decoration.mark({
                      class: 'cm-heading-prefix-hidden'
                    })
                  );
                } else {
                  builder.add(
                    line.from,
                    line.from + prefixLen,
                    Decoration.mark({
                      class: 'cm-heading-prefix-active'
                    })
                  );
                }
              } else if (trimmed.startsWith('>')) {
                builder.add(
                  line.from,
                  line.from,
                  Decoration.line({
                    class: 'cm-line-blockquote'
                  })
                );
              }
            }

            pos = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    { decorations: v => v.decorations }
  );

  // 11. Google Docs High-Fidelity Table ViewPlugin
  const tablePlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;
        let inCodeBlock = false;
        let lineNo = 1;

        while (lineNo <= doc.lines) {
          const line = doc.line(lineNo);
          const trimmed = line.text.trim();

          if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            lineNo++;
            continue;
          }

          if (!inCodeBlock && trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableStartLine = lineNo;
            let tableEndLine = lineNo;

            while (tableEndLine < doc.lines) {
              const nextLine = doc.line(tableEndLine + 1);
              const nextTrimmed = nextLine.text.trim();
              if (nextTrimmed.startsWith('|') && nextTrimmed.endsWith('|')) {
                tableEndLine++;
              } else {
                break;
              }
            }

            if (tableEndLine > tableStartLine) {
              const tableLines: string[] = [];
              for (let l = tableStartLine; l <= tableEndLine; l++) {
                tableLines.push(doc.line(l).text);
              }
              const tableMarkdown = tableLines.join('\n');
              const parsed = parseMarkdownTable(tableMarkdown);
              if (parsed) {
                const startFrom = doc.line(tableStartLine).from;
                const endTo = doc.line(tableEndLine).to;
                builder.add(
                  startFrom,
                  endTo,
                  Decoration.replace({
                    widget: new CodeMirrorTableWidget(tableMarkdown, startFrom, endTo),
                    block: true
                  })
                );
                lineNo = tableEndLine + 1;
                continue;
              }
            }
          }

          lineNo++;
        }

        return builder.finish();
      }
    },
    { decorations: v => v.decorations }
  );

  return [
    wikilinkPlugin,
    boldPlugin,
    italicPlugin,
    inlineCodePlugin,
    highlightPlugin,
    strikethroughPlugin,
    checkboxPlugin,
    hrPlugin,
    embedPlugin,
    headingLinePlugin,
    tablePlugin
  ];
}
