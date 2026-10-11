export type EditorViewMode = 'live' | 'source' | 'reading';

export interface VaultFile {
  id: string;
  name: string;
  path: string;
  folder: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  isFolder?: boolean;
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

export interface NoteMetadata {
  path: string;
  title: string;
  frontmatter: Record<string, any>;
  outlinks: string[];
  tags: string[];
  headings: NoteHeading[];
  tasks: NoteTask[];
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
  fileId: string;
  viewMode: EditorViewMode;
  isPinned?: boolean;
}

export type SidebarTab = 'files' | 'search' | 'graph' | 'tags' | 'bookmarks';
export type InspectorTab = 'backlinks' | 'outline' | 'tags' | 'localGraph';

export interface CommandItem {
  id: string;
  title: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}
