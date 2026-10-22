# Test Plan: Obsidian Desktop Replica

Environment: Vite + React 18 + Node.js Middleware Backend  
Vault: Local filesystem (`vault/`, `.obsidian/*.json`)  
Status: All Happy, Edge, and Negative test cases PASSED (0 open S1/S2 bugs)

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | Vault CRUD | happy | Click "New Note" (Ctrl+N), write title & markdown, blur | Note saved to disk in `vault/` with instant sidebar update | unit/api | PASS |
| F01-E1 | Vault CRUD | edge: rename note linked elsewhere | Rename note that has `[[Wikilinks]]` in other notes | Automatically refactors links across all `.md` and `.canvas` files | api | PASS |
| F01-E2 | Vault CRUD | edge: delete note | Right-click note -> "Move to .trash" | Note moved to `.trash/`, removed from sidebar, fallback tab opened | api | PASS |
| F01-H2 | Vault Switcher | happy | Open Vault Switcher modal -> Reset Sandbox | Resets vault to genuine Obsidian tutorial notes | api | PASS |
| F02-H1 | Live Preview | happy | Write `# Heading`, `**bold**`, `==highlight==`, `> [!note]` | Instant WYSIWYG render with icons, highlights, and callouts | e2e | PASS |
| F02-E1 | Live Preview | edge: task checklist | Click checkbox `- [ ]` in Live Preview | Checkbox toggles to `- [x]` and updates file on disk | unit | PASS |
| F02-E2 | Source Mode | happy | Switch to Source mode | Displays raw markdown with synchronized line numbers strip | unit | PASS |
| F03-H1 | Wikilinks | happy | Type `[[` in editor | Autocomplete dropdown lists matching vault notes; Enter inserts `[[Note]]` | unit | PASS |
| F03-E1 | Ghost Note | edge: click uncreated link | Click link to note that doesn't exist | Creates note on disk immediately and navigates to it | api | PASS |
| F03-H2 | Inspector | happy | Open note with backlinks | Right inspector displays linked mentions, outgoing links, and outline | unit | PASS |
| F04-H1 | Graph View | happy | Press Ctrl+G to open Graph View | 60 FPS Barnes-Hut force physics graph with dot grid background | e2e | PASS |
| F04-E1 | Graph View | edge: drag vs click | Drag node across canvas to reposition | Repositions node with physics reheat; does NOT accidentally navigate | canvas | PASS |
| F04-E2 | Graph View | edge: filters & groups | Toggle "Attachments", add color group `path:Guides` -> `#10b981` | Filters nodes live, colors matching nodes with instant swatch | unit | PASS |
| F05-H1 | Local Graph | happy | Open Inspector -> "Graph" tab | Focal note pinned at center (0, 0), neighbors spread radially at 135px | canvas | PASS |
| F05-E1 | Local Graph | edge: label collision | Hover over neighbor node in local graph | Labels rendered on top in Pass 3 with outward offsets; no overlap | canvas | PASS |
| F06-H1 | Canvas View | happy | Open `.canvas` file | Loads JSON Canvas 1.0 nodes and edges onto interactive canvas | unit | PASS |
| F06-E1 | Canvas View | edge: add card & edge | Create text card, drag edge to note card, change color | Cards connect with directed arrow, persists to `.canvas` file | unit | PASS |
| F07-H1 | Split Panes | happy | Press Ctrl+\ or click "Split Right" | Splits workspace vertically into two independent panes | unit | PASS |
| F07-E1 | Split Panes | edge: close last tab | Press Ctrl+W on last tab of split pane | Tab closes and empty pane automatically closes cleanly | unit | PASS |
| F08-H1 | Daily Notes | happy | Click Daily Notes icon | Opens or creates `Daily/YYYY-MM-DD.md` with template expansion | api | PASS |
| F08-H2 | Zettelkasten | happy | Click Zettelkasten icon | Creates 14-digit timestamp prefixed note with ID frontmatter | api | PASS |
| F08-H3 | File Recovery | happy | Open File Recovery modal | Lists automated snapshots with timestamp & diff for restore | api | PASS |
| F09-H1 | Quick Switcher | happy | Press Ctrl+O, type note query | Filtered list with recent notes, Enter selects note | unit | PASS |
| F09-H2 | Command Palette | happy | Press Ctrl+P, filter commands | Executes registered Obsidian command | unit | PASS |
| F10-H1 | Screen Stability | happy | Edit note or save workspace | Vite HMR watch excludes `vault/` and `.obsidian/`; ZERO screen flicker | system | PASS |
