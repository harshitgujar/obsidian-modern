# Runagon (Minimal, Fast, Local-First Knowledge Base & AI Memory)

An authentic, modern, and lightweight open-source knowledge base application built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite** with optional **Electron** desktop wrapper.

---

## ⚡ Core Features

- **Local-First Vault Architecture**:
  - Direct local folder sync via the native **File System Access API** (`window.showDirectoryPicker()`).
  - Seamless fallback to persistent browser storage.
  - One-click **Export Entire Vault as ZIP** and **Import from ZIP**.
  - Pre-seeded with a rich starter vault demonstrating Zettelkasten, daily notes, task management, and callouts.

- **Bi-Directional Linking & Knowledge Graph**:
  - `[[Wikilinks]]` with auto-complete: type `[[` to open an instant note search popover.
  - Click to navigate: clicking any `[[Link]]` immediately opens or creates that note.
  - In-memory reactive graph indexer mapping all nodes and edges.
  - **Backlinks Pane**:
    - **Linked Mentions**: Notes that explicitly link to the active note with context snippets.
    - **Unlinked Mentions**: Notes that mention the note's title without brackets, with a 1-click **"Link"** button!

- **Interactive 2D Force-Directed Graph View**:
  - High-performance HTML5 Canvas physics engine with Retina scaling.
  - Repulsive Coulomb charge, Hooke spring link attraction, center gravity, and friction damping.
  - Drag nodes, pan camera, mousewheel zoom.
  - Node hover highlights connected neighbors and dims unrelated notes.
  - Search filter and unconnected notes toggle.
  - Mini **Local Graph** view in the right inspector showing the neighborhood of the active note.

- **Live Preview & Multi-Mode Editor**:
  - **Live Preview**: WYSIWYG Markdown rendering headers, math, code blocks with copy button, tables, and callouts inline.
  - **Interactive Checklists**: Click `- [ ]` checkboxes to toggle `- [x]` directly in the note.
  - **Callout Boxes**: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!QUOTE]`.
  - **Properties Card**: Visual frontmatter inspector for tags, status, created date, and metadata.
  - **Source Mode**: Raw markdown editor with line numbers, indentation, and bracket auto-closing.
  - **Reading View**: Clean document mode.

- **Fast Navigation & Productivity**:
  - **Quick Switcher (`Ctrl+O` / `Cmd+O`)**: Fuzzy search across all notes in vault.
  - **Command Palette (`Ctrl+P` / `Cmd+P`)**: Fast shortcut launcher for all app functions.
  - **Daily Notes (`Ctrl+Shift+D` or Ribbon button)**: Automatically opens or creates today's note with a daily template.
  - **Multi-Tab System**: Open multiple notes in tabs across the top.
  - **Document Outline**: Interactive Table of Contents extracted from headings.
  - **Tags Explorer**: Vault-wide index of all `#tags`.

---

## 🚀 Getting Started

### 1. Web / Browser Mode
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Native Desktop Mode (Electron)
```bash
npm run desktop
```

### 3. Production Build
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+O` / `Cmd+O` | Quick Switcher (Fuzzy Note Search) |
| `Ctrl+P` / `Cmd+P` | Command Palette |
| `Ctrl+G` | Toggle Global Graph View |
| `Ctrl+N` | Create New Note |
| `Ctrl+Shift+D` | Open Today's Daily Note |
| `[[` | Trigger Wikilink Autocomplete |
