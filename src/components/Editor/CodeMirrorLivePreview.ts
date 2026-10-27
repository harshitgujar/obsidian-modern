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
      'cm-wikilink-pill inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded bg-[#705dcf] hover:bg-[#5e4db5] text-white text-[13px] font-medium cursor-pointer transition-all shadow-sm select-none align-middle border-none';
    span.title = `Click to open [[${this.target}]]`;

    const icon = document.createElement('span');
    icon.innerHTML = `<svg class="w-3 h-3 text-purple-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
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

    if (this.alt) {
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
        f => f.path === cleanPath || f.name === cleanPath || f.name.replace(/\.[^/.]+$/, '') === cleanPath
      );
      this.onContextMenu?.(e, targetFile, this.rawText);
    });

    return container;
  }
}

export function createLivePreviewPlugin(options: LivePreviewOptions = {}): Extension {
  // Wikilink Match Decorator
  const wikilinkDecorator = new MatchDecorator({
    regexp: /(?<!\!)\[\[([^\]\n]+)\]\]/g,
    decoration: (match, view, pos) => {
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      // If cursor touches or is inside wikilink, uncollapse to allow direct editing
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

  // Highlight Match Decorator: ==text==
  const highlightDecorator = new MatchDecorator({
    regexp: /(?<!=)==([^=\n]+)==(?!=)/g,
    decoration: (match, view, pos) => {
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

  // Divider (---) Decorator
  const hrDecorator = new MatchDecorator({
    regexp: /^(?:---|___|\*\*\*)\s*$/gm,
    decoration: (match, view, pos) => {
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

  // Image Embed Decorator: ![[file.png]] or ![alt](url)
  const imageDecorator = new MatchDecorator({
    regexp: /!\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\(([^)\n]+)\)/g,
    decoration: (match, view, pos) => {
      const { from, to } = view.state.selection.main;
      const matchFrom = pos;
      const matchTo = pos + match[0].length;
      if (from >= matchFrom && to <= matchTo) {
        return null;
      }

      let src = '';
      let alt = '';
      if (match[1]) {
        // ![[wiki-image.png|300]]
        const parts = match[1].split('|');
        const filename = parts[0].trim();
        alt = parts[1]?.trim() || filename;
        src = `/api/vault/file/raw?path=${encodeURIComponent(filename)}`;
      } else if (match[3]) {
        // ![alt](src)
        alt = match[2]?.trim() || '';
        src = match[3].trim();
        if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          src = `/api/vault/file/raw?path=${encodeURIComponent(src)}`;
        }
      }

      return Decoration.replace({
        widget: new ImageEmbedWidget(src, alt, match[0], options.onMediaContextMenu, options.allFiles, options.getAllFiles)
      });
    }
  });

  const imagePlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = imageDecorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = imageDecorator.updateDeco(update, this.decorations);
        }
      }
    },
    { decorations: v => v.decorations }
  );

  // Heading & Line Styling ViewPlugin
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
        const activeLine = view.state.doc.lineAt(selFrom);

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);
            const lineText = line.text;

            // Check Heading: # H1, ## H2, etc.
            const hMatch = lineText.match(/^(#{1,6})\s+/);
            if (hMatch) {
              const level = hMatch[1].length;
              const isCursorOnLine = line.from <= selTo && line.to >= selFrom;

              // Line-level styling
              builder.add(
                line.from,
                line.from,
                Decoration.line({
                  class: `cm-line-heading cm-line-h${level}`
                })
              );

              // Prefix decoration (#, ##, ###)
              const prefixLen = hMatch[0].length;
              if (!isCursorOnLine) {
                // Hide the # prefix when not editing that heading
                builder.add(
                  line.from,
                  line.from + prefixLen,
                  Decoration.mark({
                    class: 'cm-heading-prefix-hidden'
                  })
                );
              } else {
                // Reveal subtle prefix when cursor is on the line
                builder.add(
                  line.from,
                  line.from + prefixLen,
                  Decoration.mark({
                    class: 'cm-heading-prefix-active'
                  })
                );
              }
            } else if (lineText.trim().startsWith('>')) {
              // Blockquote line
              builder.add(
                line.from,
                line.from,
                Decoration.line({
                  class: 'cm-line-blockquote'
                })
              );
            }

            pos = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    { decorations: v => v.decorations }
  );

  return [
    wikilinkPlugin,
    highlightPlugin,
    strikethroughPlugin,
    checkboxPlugin,
    hrPlugin,
    imagePlugin,
    headingLinePlugin
  ];
}
