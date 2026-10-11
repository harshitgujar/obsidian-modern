import { VaultFile } from '../types';

export const DEFAULT_VAULT_FILES: VaultFile[] = [
  {
    id: 'welcome',
    name: 'Welcome to Obsidian.md',
    path: 'Welcome to Obsidian.md',
    folder: '',
    updatedAt: Date.now(),
    createdAt: Date.now() - 86400000 * 2,
    content: `---
title: Welcome to Obsidian
tags: [welcome, pkm, obsidian]
created: 2026-10-11
status: active
---

# Welcome to your Modern Obsidian Knowledge Base

Obsidian is a powerful, extensible knowledge base that works on top of a local folder of plain-text Markdown files. Making connections between ideas is the key to expanding your mind.

> [!TIP]
> Press **Ctrl+O** (or **Cmd+O**) at any time to open the **Quick Switcher**, or **Ctrl+P** / **Cmd+P** to open the **Command Palette**!

---

## ⚡ Key Core Features

1. **Bi-directional Linking**: Link any note using double brackets like [[Zettelkasten Method]] or [[Second Brain]].
2. **Interactive Graph View**: Visualize every note as a physics-driven node in your personal knowledge graph.
3. **Live Preview Editor**: Write in clean Markdown with rendered headers, interactive checklists, code blocks, and math!
4. **Local-First & Private**: Your notes belong to you. Open any local folder on your computer or export your entire vault as a ZIP file.

> [!NOTE]
> Try clicking on any link like [[Markdown Cheat Sheet]] to navigate, or **Ctrl+Click** on a link to open it in a new tab!

## 🧠 Getting Started

- Learn the timeless note-taking technique: [[Zettelkasten Method]]
- Explore digital personal knowledge management: [[Second Brain]]
- Check your current tasks in [[Active Projects]]
- See how to format notes with [[Markdown Cheat Sheet]]
- Open today's journal entry in [[Daily Notes]]

---

### Daily Habits
- [x] Set up new Obsidian workspace
- [x] Connect thoughts with [[Zettelkasten Method]]
- [ ] Explore the interactive Graph View
- [ ] Create your first custom note!
`
  },
  {
    id: 'zettelkasten',
    name: 'Zettelkasten Method.md',
    path: 'Zettelkasten Method.md',
    folder: '',
    updatedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 3,
    content: `---
title: Zettelkasten Method
tags: [productivity, zettelkasten, pkm]
author: Niklas Luhmann
---

# The Zettelkasten Method

The **Zettelkasten** (German for "slip box") is a knowledge management and note-taking method pioneered by sociologist Niklas Luhmann, who wrote more than 70 books and 400 scholarly articles using it.

> [!QUOTE]
> "One cannot think without writing." — Niklas Luhmann

## 🧩 The Three Types of Notes

### 1. Fleeting Notes
Temporary thoughts, quick ideas jotted down during the day without friction. These are typically captured in your [[Daily Notes]].

### 2. Literature Notes
Summaries of what you read, watch, or listen to. Always written in your own words, with proper citations.

### 3. Permanent Notes
Self-contained, atomic ideas that survive the test of time. Each permanent note contains **one single idea** and is heavily linked to other notes, such as [[Second Brain]] and [[Welcome to Obsidian]].

---

## 🕸️ How Links Create Insight
Instead of rigid folders, you link notes horizontally:
- A note about cognitive load links to [[Modern Architecture]]
- A note about mental models links to [[Second Brain]]

When you view your **Graph View**, clusters of related notes emerge organically.
`
  },
  {
    id: 'second-brain',
    name: 'Second Brain.md',
    path: 'Second Brain.md',
    folder: '',
    updatedAt: Date.now() - 7200000,
    createdAt: Date.now() - 86400000 * 4,
    content: `---
title: Building a Second Brain
tags: [pkm, framework, productivity]
author: Tiago Forte
---

# Building a Second Brain (BASB)

A **Second Brain** is an external, digital repository for your ideas, insights, and references to free up your biological brain for creativity and problem-solving.

> [!IMPORTANT]
> Your brain is designed for having ideas, not for holding them!

## The C.O.D.E. Framework

| Stage | Action | Description |
| :--- | :--- | :--- |
| **C** | **Capture** | Keep what resonates from articles, books, and meetings |
| **O** | **Organize** | Save notes based on actionability rather than topic |
| **D** | **Distill** | Progressively summarize your notes down to their core essence |
| **E** | **Express** | Turn your notes into tangible outputs and [[Active Projects]] |

## 🔗 Related Notes
- Intersects directly with the [[Zettelkasten Method]]
- Implemented in software design: [[Modern Architecture]]
- Quick reference: [[Welcome to Obsidian]]
`
  },
  {
    id: 'active-projects',
    name: 'Active Projects.md',
    path: 'Projects/Active Projects.md',
    folder: 'Projects',
    updatedAt: Date.now() - 1800000,
    createdAt: Date.now() - 86400000 * 1,
    content: `---
title: Active Projects
tags: [projects, tasks, focus]
status: in-progress
---

# 🚀 Active Projects Dashboard

Track ongoing engineering and writing tasks.

> [!WARNING]
> Keep active projects to a maximum of 3 at any time to avoid context switching fatigue.

## 🎯 Current Sprints

### 1. Minimal & Modern Obsidian App
- [x] Design minimal UI with dark/light theme support
- [x] Implement live bi-directional Wikilink parser
- [x] Build interactive 2D physics Graph View
- [x] Implement live preview Markdown editor with callouts
- [ ] Connect with [[Modern Architecture]]

### 2. Personal Knowledge Base Refactor
- [x] Import legacy notes
- [ ] Standardize metadata with [[Second Brain]] guidelines
- [ ] Review connections in [[Daily Notes]]

---

## Notes & Scratchpad
Check [[Welcome to Obsidian]] for keyboard shortcuts and workflow tips.
`
  },
  {
    id: 'modern-architecture',
    name: 'Modern Architecture.md',
    path: 'Technical/Modern Architecture.md',
    folder: 'Technical',
    updatedAt: Date.now() - 5000000,
    createdAt: Date.now() - 86400000 * 5,
    content: `---
title: Modern Architecture
tags: [tech, architecture, local-first]
type: technical-spec
---

# Modern Local-First Architecture

Software like Obsidian thrives on a **Local-First** philosophy: users own their data on their own file system, and apps operate at the speed of local hardware.

\`\`\`typescript
interface KnowledgeGraph {
  nodes: Map<string, NoteNode>;
  edges: Set<LinkEdge>;
  reindex(): void;
  resolveBacklinks(target: string): NoteNode[];
}
\`\`\`

## 🛠️ The Core Pillars

1. **Local Files as Source of Truth**: Files are standard Markdown (.md). No vendor lock-in.
2. **In-Memory Graph Index**: Wikilinks (\`[[...]]\`) are indexed reactively for instantaneous backlink lookups.
3. **Canvas-Based Graph Visualization**: Ultra-fast physics rendering using HTML5 Canvas and force simulation.
4. **Resilient Offline Operation**: Zero network dependency for core reading and writing.

> [!TIP]
> Read more about how atomic ideas interact in [[Zettelkasten Method]] and organize your work in [[Active Projects]].
`
  },
  {
    id: 'markdown-cheat-sheet',
    name: 'Markdown Cheat Sheet.md',
    path: 'Guides/Markdown Cheat Sheet.md',
    folder: 'Guides',
    updatedAt: Date.now() - 10000000,
    createdAt: Date.now() - 86400000 * 6,
    content: `---
title: Markdown Cheat Sheet
tags: [guide, markdown, syntax]
---

# Markdown & Obsidian Syntax Guide

Everything you need to know about formatting in Obsidian!

---

## 📌 Headers
# Heading 1
## Heading 2
### Heading 3

---

## 🎨 Text Formatting
- **Bold text**: \`**bold**\`
- *Italic text*: \`*italic*\`
- ~~Strikethrough~~: \`~~strikethrough~~\`
- \`Inline code\`: \`\`code\`\`
- [External Web Link](https://obsidian.md)

---

## 🗂️ Obsidian Wikilinks
- Simple link: \`[[Welcome to Obsidian]]\` -> [[Welcome to Obsidian]]
- Link to [[Zettelkasten Method]]

---

## 🗃️ Callouts / Admonitions

> [!NOTE]
> This is a standard note callout. Useful for secondary information.

> [!TIP]
> This is a tip! You can use tips to highlight best practices.

> [!WARNING]
> Be careful when editing raw files outside your vault.

> [!IMPORTANT]
> This is an important callout for critical notices.

---

## 📐 Math Equations (LaTeX)
Inline math: $E = mc^2$ or $\\sqrt{a^2 + b^2} = c$

Block equation:
$$f(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi$$

---

## 📊 Tables

| Feature | Obsidian | Traditional Note Apps |
| :--- | :--- | :--- |
| **Storage** | Plain Local .md Files | Proprietary Cloud DB |
| **Links** | Bi-directional [[Wikilinks]] | Unidirectional or None |
| **Graph** | Visual Knowledge Graph | None |
| **Offline** | 100% Native Offline | Sync required |
`
  },
  {
    id: 'daily-notes',
    name: 'Daily Notes.md',
    path: 'Guides/Daily Notes.md',
    folder: 'Guides',
    updatedAt: Date.now() - 12000000,
    createdAt: Date.now() - 86400000 * 7,
    content: `---
title: Daily Notes Guide
tags: [daily, journal, habits]
---

# 📅 Daily Notes Philosophy

Daily notes serve as an inbox for your mind. Rather than figuring out where a thought belongs immediately, write it in today's daily note!

## 💡 Recommended Daily Template
- **🎯 Top 3 Priorities**: What must get done today?
- **📝 Stream of Consciousness**: Quick notes from conversations and readings.
- **🔗 Connections**: Link to relevant projects like [[Active Projects]] and conceptual frameworks like [[Second Brain]].

Check out [[Daily/2026-10-11]] for today's active journal entry!
`
  },
  {
    id: 'daily-today',
    name: '2026-10-11.md',
    path: 'Daily/2026-10-11.md',
    folder: 'Daily',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    content: `---
title: 2026-10-11 Daily Note
tags: [daily, log]
date: 2026-10-11
---

# 📅 Daily Note — October 11, 2026

## 🎯 Priorities for Today
- [x] Launch the new modern Obsidian app
- [x] Test bi-directional link navigation to [[Welcome to Obsidian]]
- [ ] Connect project tasks with [[Active Projects]]
- [ ] Review [[Zettelkasten Method]] principles

## 💭 Notes & Thoughts
Building software with a **Local-First** mindset feels astonishingly fast. Having instant reactive search and interactive graph views transforms static notes into an alive second brain.

## 🔗 Connected Notes
- [[Welcome to Obsidian]]
- [[Active Projects]]
- [[Modern Architecture]]
`
  }
];
