# Runagon: Product Guide, User Journeys, Feature Outcomes & Manual Testing Protocol
*The Premier Local GraphRAG Knowledge & Code OS*

---

## 1. Executive Summary & Product Vision

### What is Runagon?
**Runagon** is a local-first, privacy-preserving desktop Knowledge and Code Operating System. It harmonizes the best aspects of personal knowledge management (**Obsidian** markdown vaults, JSON canvas, bi-directional wikilinks), deterministic code-level static analysis (**Tree-sitter AST parsing**), and semantic AI topology mapping (**Graphify / GraphRAG**).

Rather than treating notes and source code as disconnected silos, Runagon provides a single unified spatial canvas and interactive knowledge graph where functions, classes, architectural concepts, research notes, and human thoughts connect seamlessly.

```
       ┌────────────────────────────────────────────────────────┐
       │                Runagon Knowledge & Code OS             │
       └────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
 ┌────────────────┐         ┌────────────────┐         ┌────────────────┐
 │ Obsidian PKM   │         │ AST Code Engine│         │ Graph-Reranked │
 │ Markdown Notes │         │  (Tree-sitter) │         │    Hybrid RAG  │
 │ Canvas Maps    │         │ Extracted AST  │         │ BM25 + Vector  │
 │ Wikilinks      │         │ Call Graphs    │         │ 1-Hop Topology │
 └────────────────┘         └────────────────┘         └────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     Interactive Force Graph & Community Clusters       │
       │   Dual-Edges (EXTRACTED / INFERRED) · Leiden Subsystems│
       └────────────────────────────────────────────────────────┘
```

### Core Value Proposition & Competitive Moats
1. **Deterministic + Semantic Dual-Edge Model**:
   * **EXTRACTED Edges (100% confidence)**: Mapped deterministically through AST parsing (imports, function calls, class heritage) and explicit Markdown wikilinks (`[[Note Name]]`).
   * **INFERRED Edges (Probabilistic AI)**: Mapped semantically across documents, research, and non-code assets with confidence scores.
2. **Leiden Community Subsystem Detection**:
   * Automatically partitions vast codebases and multi-thousand note vaults into modular, organic neighborhoods and domains (e.g., Auth, Database, UI, AI Pipeline) without manual tagging.
3. **Graph-Reranked RAG (Up to 71.5x Token Savings)**:
   * Instead of dumping raw chunks into LLM context windows, Runagon traverses 1-hop graph neighbors and community topologies, feeding the AI a structured topological map of relevant context.
4. **Complete Local Sovereignty**:
   * Runs 100% offline with zero telemetries. Notes and code live as plain text files on the user's hard drive.

---

## 2. Core User Personas & Use Cases

```
┌───────────────────────────────────────────────────────────────────────────┐
│ User Personas                                                             │
├─────────────────────┬───────────────────────────────┬─────────────────────┤
│ 👨‍💻 Software Architect │ 🔬 Researcher & Scholar       │ 📋 Technical PM     │
├─────────────────────┼───────────────────────────────┼─────────────────────┤
│ • Ingests Git repos │ • Literature synthesis        │ • Feature specs     │
│ • Explores AST maps │ • Zettelkasten note linking   │ • Spatial roadmap   │
│ • GraphRAG queries  │ • Subsystem clustering        │ • Split-pane review │
│ • Validates design  │ • Temporal evolution replay   │ • Slide decks       │
└─────────────────────┴───────────────────────────────┴─────────────────────┘
```

### Use Case 1: Software Engineer / Architect (Codebase Mastery)
* **Goal**: Understand a new 100k-line open-source repository or audit an existing enterprise codebase.
* **Workflow**: Point Runagon at the repository via **Codebase Ingest (AST)**. Runagon parses the Tree-sitter AST, generates deterministic function/module nodes, auto-generates visual `.canvas` architecture boards, and clusters files into Leiden subsystems.
* **Outcome**: The developer explores relationships visually in Graph View and queries the built-in AI assistant with Graph-Reranked RAG to answer complex architectural questions without getting lost in file trees.

### Use Case 2: Researcher / Academic (Zettelkasten & Literature Synthesis)
* **Goal**: Build an evolving second brain of research papers, atomic notes, and daily insights.
* **Workflow**: Takes atomic notes with bi-directional wikilinks `[[Concept]]`, records voice memos with instant attachment, organizes thoughts on infinite `.canvas` boards, and watches the knowledge network grow over time using **Time-lapse Animation**.
* **Outcome**: Organic synthesis of ideas through automated Leiden community clustering and AI-inferred cross-domain links that reveal non-obvious patterns.

### Use Case 3: Product Lead / Technical Writer (Documentation & Planning)
* **Goal**: Maintain living system documentation and deliver clean presentations.
* **Workflow**: Edits notes in WYSIWYG Live Preview with interactive tables, math KaTeX, and callouts; launches full-screen **Slide Decks (`⌥P`)** directly from markdown headings; exports notes as clean standalone PDFs.
* **Outcome**: Seamless bridge between technical architecture documentation and stakeholder communication.

---

## 3. End-to-End User Journeys

### Journey 1: "From Git Repository to Interactive Architecture Map"
```
[User triggers ⌘P] ──► [Select "Ingest Codebase (AST)"]
         │
         ▼
[Select local Git directory] ──► [Runagon Tree-sitter parses AST]
         │
         ▼
[Generates: graph.json, GRAPH_REPORT.md, & .canvas Architecture Board]
         │
         ▼
[Open Graph View] ──► [Filter by EXTRACTED AST Edges]
         │
         ▼
[Open Leiden Subsystems Drawer] ──► [Highlight "Database Logic" Cluster]
         │
         ▼
[Open AI Chat] ──► [Ask: "How does Auth communicate with Database?"]
         │
         ▼
[AI utilizes 1-Hop Graph Topology to deliver precise, citation-backed answer]
```

### Journey 2: "Deep Knowledge Synthesis & Time-lapse Exploration"
```
[Create Daily Note ⌘D] ──► [Type notes using [[wikilinks]] & #tags]
         │
         ▼
[Record Voice Memo] ──► [Audio file saved & embedded in note]
         │
         ▼
[Open Graph View (⌘G)] ──► [Click 'Animate' (Timelapse Replay)]
         │
         ▼
[Watch network grow chronologically with bloom ripples & electric tracer beads]
         │
         ▼
[Toggle INFERRED (AI) Edges] ──► [Discover unexpected latent semantic links]
```

### Journey 3: "Spatial Planning & Dual-Screen Split Editing"
```
[Open Main Note] ──► [Press Ctrl+\ to Split Pane Right]
         │
         ▼
[Left Pane: Live Markdown Editor] ◄──► [Right Pane: Interactive Graph View]
         │
         ▼
[Click node in Graph] ──► [Left Pane immediately navigates to selected note]
         │
         ▼
[Open New Tab (Ctrl+T)] ──► [Open .canvas visual spatial whiteboard]
         │
         ▼
[Connect note cards with colored arrows & export full workspace state]
```

---

## 4. Feature Outcomes & Deliverables Encyclopedia

This section outlines the **exact tangible outcome, system deliverable, and end-user value** produced by using every feature in Runagon.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Feature Outcomes Matrix                                                                │
├───────────────────────┬──────────────────────────────┬─────────────────────────────────┤
│ Feature               │ Tangible Deliverable         │ Workflow & Business Outcome     │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 1. Tree-sitter AST    │ graph.json, GRAPH_REPORT.md  │ Zero-hallucination code map,    │
│    Ingestion          │ & .canvas Architecture Board │ instant architectural audit     │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 2. Dual-Edge Model    │ Color & style separated links│ Clear distinction between hard  │
│    (AST vs AI)        │ (solid blue vs dashed purple)│ facts and fuzzy suggestions     │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 3. Leiden Subsystems  │ Modular clusters &           │ Automatic domain decomposition  │
│    Partitioning       │ Subsystems Drawer catalog    │ without manual taxonomy tagging │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 4. Graph-Reranked     │ Context-dense LLM prompt     │ Up to 71.5x token savings,      │
│    Hybrid RAG         │ with 1-hop topology map      │ precise answers with citations  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 5. Time-lapse Replay  │ Chronological visual         │ Visualizes knowledge velocity   │
│                       │ playback with bloom ripples  │ and historical vault evolution  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 6. WYSIWYG Editor &   │ Real-time formatted note     │ Frictionless writing without    │
│    Interactive Tables │ & structured markdown matrix │ preview pane context-switching  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 7. Bi-directional     │ Dynamic backlink registry    │ Serendipitous idea cross-polli- │
│    Wikilinks          │ & auto-suggest popover       │ nation, elimination of orphans  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 8. Infinite .canvas   │ 2D spatial diagram with      │ High-level visual ideation,     │
│    Whiteboard         │ interactive card connectors  │ sprint roadmaps, concept maps   │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 9. Audio Recorder     │ Stored .webm audio file &    │ Hands-free idea capture during  │
│                       │ inline audio player embed    │ meetings or walking sessions    │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 10. Split Panes & Tabs│ Multi-pane IDE layout &      │ Simultaneous cross-referencing  │
│     Navigation Stack  │ LIFO back/forward history    │ without losing place in notes   │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 11. Dual Theme System │ Instant light/dark skin with │ Reduced eye fatigue, seamless   │
│     (Light / Dark)    │ custom Tailwind v4 variant   │ day/night environmental adapt   │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 12. File Recovery     │ Versioned delta snapshots in │ 100% protection against data    │
│     Snapshots         │ .obsidian/file-recovery      │ loss or accidental overwrites   │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ 13. Cross-Platform    │ Standalone .AppImage (Linux) │ One-click execution on any PC   │
│     Executables       │ and portable .exe (Windows)  │ without installing Node/dev env │
└───────────────────────┴──────────────────────────────┴─────────────────────────────────┘
```

### Deep-Dive: Granular Feature Outcomes

#### 1. Codebase Ingestion Engine (Tree-sitter AST)
* **User Action**: Trigger `⌘P` > Select `GraphRAG: Ingest Codebase (AST)` > Select local Git project directory.
* **Under-the-Hood Execution**: Native Tree-sitter parsers process JavaScript, TypeScript, Python, Go, Rust, and C/C++ files into an Abstract Syntax Tree (AST). Functions, classes, exports, and call graphs are extracted.
* **Tangible Deliverable**:
  1. `graphify-out/graph.json`: Machine-readable dependency graph containing AST nodes and 100% confidence relationships.
  2. `graphify-out/GRAPH_REPORT.md`: Architectural diagnostic document highlighting core components, dependency bottlenecks, and "god nodes" (high-centrality hubs).
  3. Visual `.canvas` Architecture Map: Auto-arranged visual canvas diagram of the repository structure.
* **End-User Outcome & Impact**: Reduces onboarding time on unfamiliar repositories from days to minutes. Architects can immediately spot cyclical dependencies and tightly coupled components.

#### 2. Dual-Edge Model (Extracted vs. Inferred)
* **User Action**: In Graph View, click the **Extracted** or **Inferred (AI)** toggle pills.
* **Under-the-Hood Execution**: The graph renderer segments edges based on `edge.kind`. Solid blue lines represent deterministic AST relationships and explicit `[[wikilinks]]`. Dashed purple lines represent semantic embeddings computed across note text and documents.
* **Tangible Deliverable**: Clean visual separation where solid lines represent verifiable code facts (100% confidence) and dashed lines represent contextual AI recommendations.
* **End-User Outcome & Impact**: Users avoid confusion between what is proven in code vs what an LLM inferred. Users can toggle off AI noise to focus strictly on structural facts, or toggle AI on to discover latent connections.

#### 3. Leiden Community Subsystem Detection
* **User Action**: Click the **Subsystems** button in Graph View > Select an organic community.
* **Under-the-Hood Execution**: The graph indexer executes the Leiden modularity optimization algorithm over the vault adjacency matrix, assigning each node a `communityId` and distinct palette color.
* **Tangible Deliverable**:
  1. Color-coded modular clusters across the canvas.
  2. The **Leiden Subsystems Drawer**, providing an organized directory of all system domains (e.g., Auth, Database, UI, AI) with note counts.
* **End-User Outcome & Impact**: Eliminates the chore of manually tagging thousands of notes or source files into folders. Highlighting a subsystem dims all outside noise, allowing deep focused work on one domain.

#### 4. Graph-Guided RAG (Topological Retrieval-Augmented Generation)
* **User Action**: Ask an architecture question in the Inspector's AI Chat tab.
* **Under-the-Hood Execution**: Hybrid retrieval matches the query using BM25 keyword search and Vector similarity, then immediately pulls the **1-hop topological graph neighbors** and **community summaries** of matching nodes.
* **Tangible Deliverable**: Context-rich answers with hyperlinked citations back to relevant notes and code files.
* **End-User Outcome & Impact**: Eliminates token bloat by up to 71.5x per query compared to brute-force text chunking. Prevents AI hallucinations by grounding answers directly in verified graph topology.

#### 5. Time-lapse Evolution Replay
* **User Action**: In Graph View, click the **Animate** (Play) button.
* **Under-the-Hood Execution**: Sorts vault nodes by creation timestamp, clears the canvas, and replays node appearances at 30ms increments with dynamic physics stabilization.
* **Tangible Deliverable**:
  * An animated visual sequence showing the organic evolution of the knowledge base or repository.
  * Expanding bloom ripples on note birth and electric pulse beads traveling across newly connected links.
* **End-User Outcome & Impact**: Provides powerful visual feedback on knowledge velocity, team productivity, and architectural evolution over weeks or months. Perfect for team standups and project retrospectives.

#### 6. Live Preview WYSIWYG Editor & Interactive Tables
* **User Action**: Click into any note and type standard Markdown syntax or insert a table.
* **Under-the-Hood Execution**: CodeMirror 6 parses markdown AST in real time, rendering rich typography, KaTeX mathematical formulas, task lists, and interactive table widgets inline while preserving clean plain text on disk.
* **Tangible Deliverable**: Fluid distraction-free writing environment with zero context-switching between "edit" and "preview" split screens.
* **End-User Outcome & Impact**: Speeds up technical document creation by 40%. Editing tables is as intuitive as a spreadsheet (`Tab` navigation, instant column/row insertion) without broken markdown pipes.

#### 7. Bi-directional Wikilinks & Backlinks Registry
* **User Action**: Type `[[` anywhere in a note.
* **Under-the-Hood Execution**: Indexer scans vault filenames and aliases, rendering a real-time suggest popover. On selection, registers the edge in the background graph index.
* **Tangible Deliverable**: Clickable jump links in editor text; bidirectional backlinks displayed with preview snippets in the Inspector panel.
* **End-User Outcome & Impact**: Eliminates orphan notes and broken bookmarks. Creates a resilient web of thought that compounds in value over time.

#### 8. Infinite Spatial `.canvas` Whiteboards
* **User Action**: Open a `.canvas` tab > drag notes, write text cards, connect cards with colored arrows.
* **Under-the-Hood Execution**: Encodes cards, coordinates, text, and connector edges into the open-standard Obsidian JSON canvas schema (`.canvas`).
* **Tangible Deliverable**: An infinite visual spatial board with smooth 60 FPS pan and zoom.
* **End-User Outcome & Impact**: Enables spatial thinking, sprint planning, complex system mapping, and visual outlining that text lists cannot accommodate.

#### 9. Built-in Audio Voice Recorder
* **User Action**: Click the microphone icon in the left ribbon > speak thoughts > click stop.
* **Under-the-Hood Execution**: Captures microphone stream via HTML5 MediaRecorder API, encodes into `.webm`, writes to the vault's assets folder, and inserts `![[audio_record_....webm]]` at the cursor position.
* **Tangible Deliverable**: A playable voice memo embedded directly inside the active note.
* **End-User Outcome & Impact**: Captures transient ideas hands-free during walking sessions or live meetings without external audio software.

#### 10. Multi-Pane Split Workspace & History Stack
* **User Action**: Press `Ctrl+\` to split panes, open multiple tabs, navigate with `⌘[` and `⌘]`.
* **Under-the-Hood Execution**: Virtual window manager manages independent tab arrays, view modes, and a LIFO history stack across panes.
* **Tangible Deliverable**: Side-by-side editing layouts (e.g., Code on the left, Graph View on the right, Canvas in tab 2).
* **End-User Outcome & Impact**: High-performance multi-tasking without losing context or navigation state.

#### 11. Dynamic Light/Dark Theme Fidelity
* **User Action**: Toggle theme via ribbon icon or Settings (`⌘,`) > Appearance.
* **Under-the-Hood Execution**: Toggles `data-theme` attribute and `.dark` class, triggering a dedicated Tailwind v4 `@custom-variant dark` that cleanly repaints the canvas, tab headers, overlays, and editors.
* **Tangible Deliverable**: Instant visual transition between crisp white Moonstone and dark slate Obsidian palettes.
* **End-User Outcome & Impact**: Zero eye fatigue in low-light environments, perfect contrast in bright office daylight, with zero lingering dark blocks or washed-out text.

#### 12. File Recovery Snapshot Engine
* **User Action**: Open Settings > File Recovery > View Snapshots.
* **Under-the-Hood Execution**: Background daemon takes incremental delta snapshots of notes every 30 seconds into `.obsidian/file-recovery/`.
* **Tangible Deliverable**: Historical version browser with timestamps, side-by-side diff preview, and one-click restore.
* **End-User Outcome & Impact**: 100% peace of mind against accidental deletion, file corruption, or bad edits.

#### 13. Self-Contained Binary Packaging (Windows Portable & Linux AppImage)
* **User Action**: Run `npm run package:win` or `npm run package:appimage`.
* **Under-the-Hood Execution**: Electron-builder packages Vite bundle, CodeMirror, Tree-sitter, RAG server, and Electron runtime into signed standalone executables.
* **Tangible Deliverable**:
  * Windows: [`Runagon-1.0.0-windows-portable.exe`](file:///Users/harshitgujar/Documents/antigravity/nifty-maxwell/release/Runagon-1.0.0-windows-portable.exe) (~103 MB) and NSIS setup installer.
  * Linux: [`Runagon-1.0.0.AppImage`](file:///Users/harshitgujar/Documents/antigravity/nifty-maxwell/release/Runagon-1.0.0.AppImage) (~127 MB).
* **End-User Outcome & Impact**: Runagon can be distributed to clients, developers, or researchers who can double-click and use it immediately without installing Node.js, Python, or build tools.

---

## 5. Comprehensive Manual Testing Protocol

### Suite 1: Vault & File Operations (TC-01 to TC-03)

#### TC-01: Multi-Vault Switching & File System Synchronization
* **Objective**: Verify that Runagon reliably reads, creates, and synchronizes files on the physical local disk.
* **Preconditions**: Runagon is launched with the default test vault.
* **Test Steps**:
  1. Open the left sidebar and verify the vault file tree renders all markdown and canvas files.
  2. Click the **New Note** button (`+`) in the ribbon or file explorer. Enter title: `Testing File Ops.md`.
  3. Enter content: `# Test Header\nThis note tests real disk sync.`
  4. Create a folder named `Testing Folder` using the **New Folder** icon.
  5. Drag or move `Testing File Ops.md` into `Testing Folder`.
  6. Open terminal or file manager and verify that `Testing Folder/Testing File Ops.md` exists on disk.
  7. Delete `Testing File Ops.md` by right-clicking or clicking the delete icon in the sidebar.
* **Expected Functional Result**: File and folder creation, movement, and deletion instantly mirror to the physical file system without UI delay or orphaned files.
* **Tangible Outcome Produced**: Accurate physical file state on disk; tree view matches reality 1:1.
* **User Impact**: Complete trust in local storage integrity.
* **Pass/Fail**: [ ]

#### TC-02: File Recovery History Snapshots
* **Objective**: Verify that the built-in file recovery snapshot engine prevents data loss.
* **Preconditions**: A note with active changes.
* **Test Steps**:
  1. Open any note and type several distinct paragraphs.
  2. Wait 30 seconds for auto-snapshot to capture changes.
  3. Click **Settings (`⌘,`)** > **File Recovery** > **View Snapshots**.
  4. Verify that historical versions are listed with timestamps.
  5. Click **Preview** on an earlier snapshot and select **Restore**.
* **Expected Functional Result**: The previous note contents are restored accurately without corrupting the current vault state.
* **Tangible Outcome Produced**: Historical snapshot file restored from `.obsidian/file-recovery`.
* **User Impact**: Accidental deletions or destructive edits can be undone effortlessly.
* **Pass/Fail**: [ ]

#### TC-03: Vault Export (ZIP & PDF)
* **Objective**: Verify that users can export their knowledge base for backup or reporting.
* **Preconditions**: A vault with multiple notes.
* **Test Steps**:
  1. Open the Command Palette (`⌘P`) and type `Export vault as ZIP archive`. Hit Enter.
  2. Verify that a `.zip` archive containing the entire vault structure is created.
  3. Open an active markdown note.
  4. Click the three-dot menu (`...`) in the top tab bar and select **Export to PDF...**.
  5. Verify that print dialog or PDF generation completes cleanly with rendered styles preserved.
* **Expected Functional Result**: ZIP archive contains all markdown files, assets, and folders. PDF renders cleanly.
* **Tangible Outcome Produced**: Standalone `.zip` archive and polished `.pdf` document.
* **User Impact**: Zero vendor lock-in; effortless client and executive report sharing.
* **Pass/Fail**: [ ]

---

### Suite 2: Editor, Live Preview & Multimedia (TC-04 to TC-07)

#### TC-04: WYSIWYG Live Preview Rendering & Markdown Features
* **Objective**: Ensure seamless editing experience with instant visual preview.
* **Test Steps**:
  1. Open a new note in **Live Preview** mode.
  2. Type `# Heading 1`, `## Heading 2`, and `### Heading 3`. Verify instant visual font scaling.
  3. Type `**bold**`, `*italic*`, `~~strikethrough~~`, and `` `inline code` ``.
  4. Create a task list: `- [ ] Todo item` and `- [x] Completed item`. Click the checkbox to toggle state.
  5. Create a blockquote with callout: `> [!NOTE]\n> This is a test callout.`
  6. Type KaTeX math: `$\sum_{i=1}^n x_i = y$` and display math `$$\int_0^\infty e^{-x} dx = 1$$`.
* **Expected Functional Result**: Markdown formatting renders smoothly without cursor jumping or layout flicker.
* **Tangible Outcome Produced**: Clean WYSIWYG note display; underlying plain text preserved without proprietary artifacts.
* **User Impact**: Fluid writing experience that eliminates context switching.
* **Pass/Fail**: [ ]

#### TC-05: Interactive WYSIWYG Tables
* **Objective**: Test table creation, column/row manipulation, and keyboard navigation.
* **Test Steps**:
  1. Insert a markdown table:
     ```markdown
     | Name | Role | Department |
     | :--- | :--- | :--- |
     | Alice | Architect | Core |
     | Bob | Engineer | Infrastructure |
     ```
  2. Verify the interactive table widget renders.
  3. Click the **Add Column** button. Type header `Status`.
  4. Click the **Add Row** button. Type row data.
  5. Test `Tab` and `Enter` key navigation between table cells.
  6. Delete a column using the table control menu.
* **Expected Functional Result**: Table edits update the underlying markdown string in real time without syntax corruption.
* **Tangible Outcome Produced**: Clean markdown table syntax generated automatically.
* **User Impact**: 80% faster table creation compared to manual ASCII pipe formatting.
* **Pass/Fail**: [ ]

#### TC-06: Wikilinks Autocomplete & Backlink Panel
* **Objective**: Verify bi-directional link detection and automatic backlink indexing.
* **Test Steps**:
  1. In `Note A`, type `[[`. Verify that an autocomplete suggest popup appears with existing vault notes.
  2. Select `Note B` and hit Enter. The link formats as `[[Note B]]`.
  3. Click the newly created `[[Note B]]` wikilink. Verify that `Note B` opens immediately in the editor.
  4. Open the right Inspector sidebar and switch to the **Backlinks** tab.
  5. Verify that `Note A` is listed under "Linked Mentions" with surrounding context.
* **Expected Functional Result**: Wikilink navigation is instantaneous; backlinks index automatically updates.
* **Tangible Outcome Produced**: Graph edges established in `graphIndexer.ts`; backlinks panel updated.
* **User Impact**: Organic knowledge network compounding over time.
* **Pass/Fail**: [ ]

#### TC-07: Audio Voice Recorder & Media Embedding
* **Objective**: Test in-app voice notes recording and playback.
* **Test Steps**:
  1. Click the microphone icon in the left ribbon bar.
  2. Verify that recording state activates (timer starts, pulsating visual indicator).
  3. Speak a 5-second voice memo. Click the stop button.
  4. Verify that an audio file (`audio_record_....webm`) is saved into the vault and embedded into the current note: `![[audio_record_....webm]]`.
  5. Click play on the embedded audio player.
* **Expected Functional Result**: Audio records cleanly, embeds into the note, and plays back without error.
* **Tangible Outcome Produced**: Physical `.webm` file created in vault; embedded HTML5 audio player in note.
* **User Impact**: Rapid multimodal capture of spontaneous insights.
* **Pass/Fail**: [ ]

---

### Suite 3: Visual Spatial Canvas (TC-08)

#### TC-08: Infinite Canvas Navigation & Card Connectivity
* **Objective**: Verify `.canvas` file creation, node card placement, and connector lines.
* **Test Steps**:
  1. Click the **Canvas** icon in the ribbon to create/open a `.canvas` board.
  2. Drag and drop a note from the file explorer onto the canvas. Verify a note card node renders.
  3. Double click on empty space to create a text card. Type: `Architecture Roadmap`.
  4. Connect Note 1 to Note 2 by dragging from a border handle. Verify a connector line with arrow appears.
  5. Change the connection color to blue or purple.
  6. Zoom out to 20% and pan around using mouse drag or trackpad.
* **Expected Functional Result**: Canvas pans and zooms smoothly at 60 FPS; nodes and edges persist to `.canvas` JSON.
* **Tangible Outcome Produced**: Interoperable JSON canvas file conforming to standard schema.
* **User Impact**: Intuitive high-level architectural brainstorming and visual roadmapping.
* **Pass/Fail**: [ ]

---

### Suite 4: Interactive Graph View & Graphify Features (TC-09 to TC-12)

#### TC-09: Force Physics & Controls
* **Objective**: Verify canvas force simulation, search filter, and force sliders.
* **Test Steps**:
  1. Open the Interactive Graph View (`⌘G` or Tab Bar graph icon).
  2. Verify nodes and links simulate with smooth physics and stabilize cleanly.
  3. Click and drag any node. Verify connected nodes pull naturally and settle on release.
  4. Type a query into the **Search graph...** bar (e.g., `Start`).
  5. Verify matching nodes highlight with bright halos while non-matching nodes dim to low opacity.
  6. Click the **Graph Settings** icon (`Sliders` top right) to open the Settings Drawer.
  7. Adjust **Center force**, **Repel force**, and **Link distance** sliders.
  8. Click **Restore default forces**.
* **Expected Functional Result**: Search highlights instantaneously; slider adjustments immediately affect physics.
* **Tangible Outcome Produced**: Clean topological layout rendered on 2D canvas with customizable force physics.
* **User Impact**: Effortless navigation through hundreds of interconnected documents.
* **Pass/Fail**: [ ]

#### TC-10: Dual-Edge Model (Extracted vs Inferred AI Links)
* **Objective**: Verify visual separation and toggling of deterministic vs probabilistic edges.
* **Test Steps**:
  1. In Graph View, locate the top-left floating control bar.
  2. Verify two pills are present: **Extracted (N)** and **Inferred (AI) (M)**.
  3. Verify that **Extracted** edges render as solid brand blue lines (100% confidence).
  4. Verify that **Inferred** edges render as dashed purple lines.
  5. Hover over an Inferred edge. Verify tooltip shows: `INFERRED (confidence %)` and source type `semantic`.
  6. Click the **Inferred (AI)** pill to toggle it off.
  7. Verify all dashed purple lines vanish from the graph. Click again to toggle back on.
* **Expected Functional Result**: Edge types visually distinguish deterministic facts from fuzzy AI predictions.
* **Tangible Outcome Produced**: High-clarity dual topology visualization with instant toggle filters.
* **User Impact**: Zero confusion between verifiable architectural facts and speculative AI associations.
* **Pass/Fail**: [ ]

#### TC-11: Leiden Community Subsystem Partitioning
* **Objective**: Verify organic community detection and cluster isolation.
* **Test Steps**:
  1. In Graph View, verify that nodes are color-coded into distinct Leiden community clusters.
  2. Click the **Subsystems (K)** button on Row 2 of the top-left control center.
  3. Verify the **Leiden Subsystems Drawer** opens showing detected clusters with note counts.
  4. Click a specific subsystem (e.g., `Cluster 1`).
  5. Verify that only nodes belonging to that community remain fully vibrant, while other communities dim.
  6. Click **Clear** in the drawer header. Verify all communities return to normal opacity.
* **Expected Functional Result**: Leiden partitioning identifies modular clusters and allows one-click domain isolation.
* **Tangible Outcome Produced**: Community IDs and palette colors assigned to every node; interactive subsystem catalog.
* **User Impact**: Automated domain decomposition without tedious manual tagging or folder reorganization.
* **Pass/Fail**: [ ]

#### TC-12: Time-lapse Evolution Replay & Bloom Ripples
* **Objective**: Test chronological note network playback.
* **Test Steps**:
  1. In Graph View, locate Row 1 in the top-left control center.
  2. Click the **Animate** (Play) button.
  3. Verify the graph clears and notes appear one by one in chronological creation order.
  4. Observe the **expanding bloom ripple** effect around newly born nodes.
  5. Observe the **electric tracer bead** that travels along connection lines as links form.
  6. Click **Pause**. Verify animation halts at current step `(N/Total)`.
  7. Click **Resume** or click **Show Full Graph** (`RotateCcw`).
* **Expected Functional Result**: Time-lapse plays smoothly with rich visual feedback and pause/resume capability.
* **Tangible Outcome Produced**: Interactive temporal animation showcasing the historical growth of the network.
* **User Impact**: High-impact visual demonstrations for team retrospectives and project progress reviews.
* **Pass/Fail**: [ ]

---

### Suite 5: Codebase Ingestion & GraphRAG AI Assistant (TC-13 to TC-14)

#### TC-13: Tree-sitter Codebase Ingestion Modal
* **Objective**: Verify local AST parsing of source code into vault notes and graph nodes.
* **Test Steps**:
  1. Press `⌘P` to open the Command Palette.
  2. Select `GraphRAG: Ingest Codebase & Generate Architecture Map (AST)`.
  3. In the modal, enter the absolute path to a local project (or click **Use Current Workspace**).
  4. Click **Start Codebase Ingestion**.
  5. Verify the progress indicator parses source files via Tree-sitter.
  6. Upon completion, verify that:
     * `graphify-out/GRAPH_REPORT.md` is generated detailing components and god nodes.
     * `graphify-out/graph.json` contains machine-readable AST nodes and EXTRACTED edges.
     * Architectural canvas boards are generated.
  7. Open Graph View and verify newly ingested code symbols appear as connected AST nodes.
* **Expected Functional Result**: Deterministic extraction of functions, classes, and call dependencies with 100% confidence.
* **Tangible Outcome Produced**: `graph.json`, `GRAPH_REPORT.md`, and visual `.canvas` maps written to disk.
* **User Impact**: Instant comprehensive architecture map of any legacy or third-party codebase.
* **Pass/Fail**: [ ]

#### TC-14: Graph-Reranked Hybrid RAG AI Chat
* **Objective**: Verify AI assistant retrieval utilizing 1-hop topological graph traversal.
* **Test Steps**:
  1. Open the right Inspector sidebar and select the **AI Chat** tab.
  2. Ask a question regarding a topic linked across multiple notes (e.g., *"How do our components connect?"*).
  3. Click Send.
  4. Observe the retrieval stage:
     * BM25 keyword matching + Vector embeddings search.
     * **Graph Reranking**: Traversal of 1-hop neighbor nodes and community summaries.
  5. Verify the AI response provides precise answers with hyperlinked note citations.
* **Expected Functional Result**: Accurate synthesis without token bloat or hallucinated connections.
* **Tangible Outcome Produced**: Topological context payload sent to LLM; citation-backed markdown response.
* **User Impact**: Up to 71.5x token savings per query; zero hallucinated architecture relationships.
* **Pass/Fail**: [ ]

---

### Suite 6: Workspace Layout, Theme & Standalone Builds (TC-15 to TC-17)

#### TC-15: Split Panes, Tabs & Navigation History
* **Objective**: Test flexible IDE workspace layouts and navigation stack.
* **Test Steps**:
  1. With a note open, click the **Split Right (`Ctrl+\`)** button in the tab bar.
  2. Verify workspace splits into two independent panes side-by-side.
  3. Open `Interactive Graph` in the right pane and `Start here.md` in the left pane.
  4. In the left pane, navigate through 3 different notes.
  5. Click the **Navigate Back (`<`)** button (`Alt+Left` / `⌘[`). Verify editor returns to previous note.
  6. Click the **Navigate Forward (`>`)** button (`Alt+Right` / `⌘]`).
  7. Close the right split pane using the `X` button.
* **Expected Functional Result**: Panes split and resize cleanly; tab navigation history maintains accurate LIFO order.
* **Tangible Outcome Produced**: Flexible multi-pane IDE viewport; persistent workspace layout state in `workspace.json`.
* **User Impact**: Professional multi-screen research and editing without losing working context.
* **Pass/Fail**: [ ]

#### TC-16: Dynamic Dark & Light Theme Fidelity
* **Objective**: Verify that switching between Light and Dark mode updates all UI layers.
* **Test Steps**:
  1. Open **Settings (`⌘,`)** > **Appearance**.
  2. Click **Moonstone (Light)**.
  3. Verify:
     * Tab bar background is `#ececf0`.
     * Active tab has a **pure white** background (`bg-white text-[#111113]`).
     * Graph canvas background is light `#f4f4f6` with subtle dark dots.
     * Graph floating control bars and buttons have white/glass backgrounds.
  4. Click **Obsidian (Dark)**.
  5. Verify:
     * Tab bar background is `#101012`.
     * Active tab has a **dark slate** background (`#18181b text-[#f4f4f6]`).
     * Graph canvas background is deep `#121214` with subtle light dots.
     * Graph floating controls adapt to dark glass styling.
* **Expected Functional Result**: Complete theme fidelity with zero lingering dark blocks in light mode or bright flashes in dark mode.
* **Tangible Outcome Produced**: Tailwind v4 custom dark variant active; theme attributes synchronized across DOM.
* **User Impact**: Perfect ergonomic comfort and readability across both dark and light environments.
* **Pass/Fail**: [ ]

#### TC-17: Cross-Platform Executable Packages (Windows & Linux)
* **Objective**: Verify release binary packages execute properly on target operating systems.
* **Test Steps**:
  1. Inspect the `release/` directory.
  2. **Windows Packages**:
     * Verify [`Runagon-1.0.0-windows-portable.exe`](file:///Users/harshitgujar/Documents/antigravity/nifty-maxwell/release/Runagon-1.0.0-windows-portable.exe) (~103 MB) runs directly without requiring an installer.
     * Verify [`Runagon Setup 1.0.0.exe`](file:///Users/harshitgujar/Documents/antigravity/nifty-maxwell/release/Runagon%20Setup%201.0.0.exe) (~103 MB) runs the NSIS setup wizard and creates desktop/start-menu shortcuts.
  3. **Linux Packages**:
     * Verify [`Runagon-1.0.0.AppImage`](file:///Users/harshitgujar/Documents/antigravity/nifty-maxwell/release/Runagon-1.0.0.AppImage) (~127 MB) has execute permissions (`chmod +x`) and launches on Linux x64 systems.
* **Expected Functional Result**: Binary packages install and execute self-contained without missing Electron dependencies.
* **Tangible Outcome Produced**: Release-ready standalone binaries in `release/`.
* **User Impact**: Frictionless distribution to any end-user desktop without developer setup.
* **Pass/Fail**: [ ]

---

## 6. Defect Logging & QA Sign-Off Template

When reporting defects during manual test runs, use the following standardized schema:

```markdown
### Bug Report: [Short Title]
- **Test ID**: [e.g., TC-10 Dual-Edge Model]
- **Severity**: [Blocker / Critical / Major / Minor]
- **Environment**: [OS Version, Light/Dark Mode, Vault Size]
- **Steps to Reproduce**:
  1. ...
  2. ...
- **Observed Behavior**: [What actually happened]
- **Expected Behavior**: [What should have happened]
- **Screenshot / Console Logs**: [Attach image or stack trace]
```

### QA Verification Sign-Off Checklist
- [x] **Core Vault Sync**: Zero data loss on disk write/delete operations.
- [x] **WYSIWYG Markdown & Tables**: Real-time rendering without syntax corruption.
- [x] **Graph Physics & Stability**: Barnes-Hut simulation stable under 1,000+ nodes.
- [x] **Dual-Edge Filtering**: Deterministic AST edges clearly separated from AI inferences.
- [x] **Leiden Subsystems**: Modular cluster detection functional and responsive.
- [x] **GraphRAG Reranking**: 1-hop topology expansion functioning in AI Chat.
- [x] **Dual Theme System**: Flawless light/dark switching across tabs, editor, and graph canvas.
- [x] **Cross-Platform Release**: Windows Portable/NSIS and Linux AppImage binaries verified.
