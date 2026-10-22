---
title: "Project Review 1: Reverse-Engineering Obsidian"
date: "2026-10-13"
tags:
  - exhibition
  - review1
  - obsidian
---

# Project Exhibition: Reverse-Engineering Obsidian 1.13.7

## Slide 1: Title & Overview
- **Project Title**: Building a Production-Grade Obsidian Clone via Reverse Engineering (REA)
- **Domain**: Local-First Personal Knowledge Management (PKM), Desktop & Web Systems, Graph Data Engines
- **Target App Analyzed**: Obsidian 1.13.7 ASAR bundle (25.7 MB)
- **Tooling**: REA (Reverse Engineer Anything), TypeScript, React 18, Vite, Node.js, Electron

---

## Slide 2: Problem Statement & Motivation
- Modern note-taking systems trap user data in proprietary cloud silos.
- Obsidian revolutionized the industry with **Local-First Plaintext Markdown**:
  - The filesystem is the single source of truth.
  - Zero proprietary databases; all notes are real `.md` files in a folder.
  - Real-time link graph indexing and bi-directional `[[wikilinks]]`.
- **Goal**: Recreate Obsidian with exact architectural fidelity—nothing mocked, zero hardcoding.

---

## Slide 3: Reverse-Engineering Findings (REA Analysis)
- Extracted and decompiled **obsidian-1.13.7.asar**:
  - **main.js**: Electron main process with 45 IPC channels (`vault`, `vault-list`, `sandbox`, `trash`, `open-url`).
  - **app.js**: Core application managing 125 commands, 24 core plugins, and `.obsidian/` configuration directory.
  - **sim.js**: Barnes-Hut Quadtree physics engine streaming 60 FPS coordinates to canvas.
  - **worker.js**: Web Worker parsing Markdown AST, YAML properties, and `CachedMetadata`.

---

## Slide 4: Real Filesystem & Backend Architecture
- **Zero Mock Storage**: Every note, folder, image, and canvas lives on the local disk.
- **.obsidian/ Configuration Persistence**:
  - `app.json`: Editor settings, link refactoring, trash options.
  - `appearance.json`: Theme (Dark/Light), accent colors, font sizes.
  - `core-plugins.json`: Feature toggles for all 24 built-in plugins.
  - `bookmarks.json`: Persistent bookmarked items.
  - `workspace.json`: Split pane layouts, active leaves, open tabs.
  - `file-recovery/`: Automated historical snapshots and rollback.
- **Live File Watcher**: Node.js `fs.watch` with Server-Sent Events (SSE) updates the UI immediately when files are edited externally.

---

## Slide 5: Core Capabilities & Live Demonstration
- **Multi-Split Workspace**: Split panes vertically or horizontally with pinned tabs.
- **Live Preview & Source Mode**: Real markdown rendering with Callouts (`> [!NOTE]`), Tables, Math (`$$...$$`), Checklists, and Highlighting (`==text==`).
- **Interactive JSON Canvas 1.0**: Infinite 2D whiteboard supporting text cards, embedded note cards, and directed edges (`.canvas` files).
- **Interactive Force-Directed Graph View**: Global and local graph views with folder/tag clustering and spring physics.
- **Audio Voice Notes**: Built-in audio recorder saving `.webm` files to disk and transcluding into notes.
- **Automatic Link Refactoring**: Renaming any note automatically updates internal `[[wikilinks]]` across the entire vault.
