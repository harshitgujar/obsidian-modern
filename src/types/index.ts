export type EditorViewMode = 'live' | 'source' | 'reading';

export interface VaultFile {
  id: string;
  name: string;
  path: string;
  folder: string;
  extension: string;
  content: string;
  size: number;
  updatedAt: number;
  createdAt: number;
  isBinary?: boolean;
}

export interface NoteHeading {
  level: number;
  text: string;
  line: number;
}

export interface NoteTask {
  text: string;
  completed: boolean;
  line: number;
}

export interface NoteSection {
  type: 'paragraph' | 'heading' | 'callout' | 'code' | 'table' | 'list' | 'blockquote' | 'math' | 'thematicBreak';
  startLine: number;
  endLine: number;
}

export interface NoteMetadata {
  path: string;
  title: string;
  frontmatter: Record<string, any>;
  outlinks: string[];
  tags: string[];
  headings: NoteHeading[];
  tasks: NoteTask[];
  sections: NoteSection[];
  blocks: Record<string, number>;
  wordCount: number;
  charCount: number;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  val: number;
  color?: string;
  folder: string;
  tags: string[];
  nodeType?: 'file' | 'tag' | 'attachment' | 'unresolved';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BacklinkMention {
  fileId: string;
  filePath: string;
  fileName: string;
  contextSnippet: string;
  line: number;
  isLinked: boolean;
}

export interface TabItem {
  id: string;
  filePath: string;
  viewMode: EditorViewMode;
  isPinned?: boolean;
}

export interface PaneItem {
  id: string;
  tabs: TabItem[];
  activeTabId: string;
}

export type SidebarTab = 'files' | 'search' | 'bookmarks' | 'tags' | 'graph';
export type InspectorTab = 'backlinks' | 'outgoing' | 'outline' | 'tags' | 'localGraph' | 'aiChat';

export interface CommandItem {
  id: string;
  title: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

export interface BookmarkItem {
  type: 'file' | 'folder' | 'search' | 'graph';
  path: string;
  title: string;
  subpath?: string;
  query?: string;
}

export interface CanvasNodeData {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'ratio' | 'repeat';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface CanvasEdgeData {
  id: string;
  fromNode: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
  fromEnd?: 'arrow' | 'none';
  toEnd?: 'arrow' | 'none';
}

export interface CanvasData {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
}

export interface VaultInfo {
  id: string;
  name: string;
  path: string;
  ts: number;
  open: boolean;
}

export interface RecoverySnapshot {
  id: string;
  path: string;
  timestamp: number;
  size: number;
  content?: string;
}
