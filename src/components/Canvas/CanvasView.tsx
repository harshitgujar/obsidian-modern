import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { VaultFile, CanvasData, CanvasNodeData, CanvasEdgeData } from '../../types';
import { vault } from '../../services/vault';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Plus, 
  FileText, 
  Type, 
  Trash2, 
  ExternalLink,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Maximize2,
  FolderPlus,
  Globe,
  Copy,
  LayoutDashboard,
  Image as ImageIcon,
  SlidersHorizontal,
  Undo2,
  Redo2,
  HelpCircle,
  ArrowUpDown,
  Columns,
  List,
  Search,
  MoreHorizontal,
  X,
  Upload,
  Video,
  Volume2,
  Square,
  CheckSquare
} from 'lucide-react';

interface CanvasViewProps {
  file: VaultFile;
  allFiles: VaultFile[];
  onSaveContent: (content: string) => void;
  onNavigateFile: (filePath: string) => void;
}

const COLOR_PRESETS: Record<string, { bg: string; border: string; text: string; hex: string; groupBg: string }> = {
  '1': { bg: 'bg-[#1e1418]', border: 'border-rose-500/80', text: 'text-rose-200', hex: '#ef4444', groupBg: 'bg-rose-950/20' }, // Red
  '2': { bg: 'bg-[#201814]', border: 'border-orange-500/80', text: 'text-orange-200', hex: '#f97316', groupBg: 'bg-orange-950/20' }, // Orange
  '3': { bg: 'bg-[#221c12]', border: 'border-amber-500/80', text: 'text-amber-200', hex: '#f59e0b', groupBg: 'bg-amber-950/20' }, // Yellow
  '4': { bg: 'bg-[#121f19]', border: 'border-emerald-500/80', text: 'text-emerald-200', hex: '#10b981', groupBg: 'bg-emerald-950/20' }, // Green
  '5': { bg: 'bg-[#121d22]', border: 'border-cyan-500/80', text: 'text-cyan-200', hex: '#06b6d4', groupBg: 'bg-cyan-950/20' }, // Cyan
  '6': { bg: 'bg-[#1b1722]', border: 'border-purple-500/80', text: 'text-purple-200', hex: '#a855f7', groupBg: 'bg-purple-950/20' }, // Purple
};

type Side = 'top' | 'right' | 'bottom' | 'left';
const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

type ResizeDirection = 
  | 'top' 
  | 'right' 
  | 'bottom' 
  | 'left' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right';

interface ConnectingState {
  fromNodeId: string;
  fromSide: Side;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ResizingState {
  nodeId: string;
  direction: ResizeDirection;
  startMouseX: number;
  startMouseY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

interface SubCanvasMiniViewportProps {
  canvasFile: VaultFile;
  onOpen: () => void;
}

const SubCanvasMiniViewport: React.FC<SubCanvasMiniViewportProps> = ({ canvasFile, onOpen }) => {
  const data: CanvasData = useMemo(() => {
    try {
      const parsed = JSON.parse(canvasFile.content || '{}');
      return {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : []
      };
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [canvasFile.content]);

  const { minX, minY, width, height } = useMemo(() => {
    if (data.nodes.length === 0) return { minX: 0, minY: 0, width: 400, height: 300 };
    let mx = Infinity, my = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.nodes.forEach(n => {
      mx = Math.min(mx, n.x);
      my = Math.min(my, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 250));
      maxY = Math.max(maxY, n.y + (n.height || 150));
    });
    const pad = 40;
    return {
      minX: mx - pad,
      minY: my - pad,
      width: Math.max(100, (maxX - mx) + pad * 2),
      height: Math.max(100, (maxY - my) + pad * 2)
    };
  }, [data.nodes]);

  return (
    <div 
      className="h-full flex flex-col justify-between p-2 bg-[#121216]/95 rounded-xl border border-orange-500/30 group hover:border-orange-500/60 transition-colors cursor-pointer overflow-hidden"
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
            <LayoutDashboard className="w-2.5 h-2.5" />
            Sub-Canvas
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="text-[11px] text-orange-400 hover:text-orange-200 flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded hover:bg-orange-500/10 transition-colors"
          title="Open Sub-Canvas in viewport"
        >
          <span>Open</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Mini Interactive Viewport SVG */}
      <div className="flex-1 w-full bg-[#16161c] rounded-lg border border-zinc-800/80 overflow-hidden relative my-1 shadow-inner flex items-center justify-center min-h-[90px]">
        <svg
          viewBox={`${minX} ${minY} ${width} ${height}`}
          className="w-full h-full pointer-events-none select-none p-1"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Child Edges */}
          {data.edges.map(edge => {
            const s = data.nodes.find(n => n.id === edge.fromNode);
            const t = data.nodes.find(n => n.id === edge.toNode);
            if (!s || !t) return null;
            const sx = s.x + (s.width || 200) / 2;
            const sy = s.y + (s.height || 100) / 2;
            const tx = t.x + (t.width || 200) / 2;
            const ty = t.y + (t.height || 100) / 2;
            return (
              <line
                key={edge.id}
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                stroke={COLOR_PRESETS[edge.color || '']?.hex || '#a855f7'}
                strokeWidth="6"
                strokeOpacity="0.7"
                strokeDasharray="6 6"
              />
            );
          })}

          {/* Child Nodes */}
          {data.nodes.map(node => {
            const color = COLOR_PRESETS[node.color || '6'] || COLOR_PRESETS['6'];
            const w = node.width || 200;
            const h = node.height || 120;
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={w}
                  height={h}
                  rx="14"
                  fill={node.type === 'group' ? 'transparent' : '#1e1e24'}
                  stroke={color.hex}
                  strokeWidth={node.type === 'group' ? 4 : 6}
                  strokeDasharray={node.type === 'group' ? '8 6' : undefined}
                />
                {node.type !== 'group' && (
                  <text
                    x={node.x + 16}
                    y={node.y + 36}
                    fill="#e4e4e7"
                    fontSize="20"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {node.type === 'file'
                      ? (node.file?.replace(/\.[^/.]+$/, '').split('/').pop() || 'File')
                      : node.text?.slice(0, 16) || 'Card'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="w-full py-1.5 mt-1 rounded-lg bg-orange-600/25 hover:bg-orange-600/40 text-orange-200 border border-orange-500/40 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors group-hover:bg-orange-600/40"
      >
        <LayoutDashboard className="w-3 h-3 text-orange-400" />
        <span>Open Sub-Canvas</span>
      </button>
    </div>
  );
};

// Markdown Parser & Renderer for Canvas Text Cards (Production WYSIWYG)
function parseCanvasInline(text: string, onNavigateFile: (path: string) => void): React.ReactNode[] {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[\[[^\]]+\]\]|==[^=]+==|~~[^~]+~~)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.08] text-purple-300 font-mono text-[10px] mx-0.5 border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      return <em key={idx} className="italic text-zinc-300">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('[[') && part.endsWith(']]') && part.length > 4) {
      const linkContent = part.slice(2, -2);
      const [target, alias] = linkContent.split('|');
      return (
        <span
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateFile(target.trim());
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ebebef] hover:bg-[#e4e4e9] text-[#1c1c1e] text-[10.5px] font-medium cursor-pointer border border-black/[0.06] transition-colors mx-0.5 select-none shadow-xs"
        >
          {alias ? alias.trim() : target.trim()}
        </span>
      );
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
      return (
        <mark key={idx} className="bg-amber-500/25 text-amber-200 px-1 py-0.5 rounded text-[11px] mx-0.5">
          {part.slice(2, -2)}
        </mark>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return <del key={idx} className="line-through text-zinc-500">{part.slice(2, -2)}</del>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderCanvasMarkdown(text: string, onNavigateFile: (path: string) => void): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1 font-sans text-xs leading-relaxed select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-sm font-bold text-white pt-1 pb-0.5 border-b border-white/10 tracking-tight">
              {parseCanvasInline(line.slice(2), onNavigateFile)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-[13px] font-semibold text-zinc-100 pt-0.5 tracking-tight">
              {parseCanvasInline(line.slice(3), onNavigateFile)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs font-semibold text-zinc-200 tracking-tight">
              {parseCanvasInline(line.slice(4), onNavigateFile)}
            </h3>
          );
        }
        if (/^[-*]\s+\[ \]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
              <Square className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
              <span>{parseCanvasInline(trimmed.replace(/^[-*]\s+\[ \]\s+/, ''), onNavigateFile)}</span>
            </div>
          );
        }
        if (/^[-*]\s+\[[xX]\]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-zinc-400 line-through">
              <CheckSquare className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
              <span>{parseCanvasInline(trimmed.replace(/^[-*]\s+\[[xX]\]\s+/, ''), onNavigateFile)}</span>
            </div>
          );
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 text-zinc-300 pl-1">
              <span className="text-purple-400 font-bold text-xs select-none">•</span>
              <span>{parseCanvasInline(trimmed.replace(/^[-*]\s+/, ''), onNavigateFile)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('>')) {
          return (
            <blockquote key={idx} className="border-l-2 border-black/20 pl-2 text-[#585860] italic text-[11px] my-1">
              {parseCanvasInline(trimmed.replace(/^>\s*/, ''), onNavigateFile)}
            </blockquote>
          );
        }

        return (
          <p key={idx} className="text-zinc-200">
            {parseCanvasInline(line, onNavigateFile)}
          </p>
        );
      })}
    </div>
  );
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  file,
  allFiles,
  onSaveContent,
  onNavigateFile
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  // Parse canvas data from file.content
  const initialCanvasData: CanvasData = useMemo(() => {
    try {
      const parsed = JSON.parse(file.content || '{}');
      return {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : []
      };
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [file.content]);

  const [canvasData, setCanvasData] = useState<CanvasData>(initialCanvasData);
  const [transform, setTransform] = useState({ x: 500, y: 350, scale: 0.85 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string; side: Side } | null>(null);

  // Dragging cards
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizing cards
  const [resizingState, setResizingState] = useState<ResizingState | null>(null);

  // Connecting nodes
  const [connectingState, setConnectingState] = useState<ConnectingState | null>(null);

  // Real-time synchronization refs to guarantee 0ms latency and prevent closure staleness
  const canvasDataRef = useRef(canvasData);
  canvasDataRef.current = canvasData;

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const draggingNodeIdRef = useRef(draggingNodeId);
  draggingNodeIdRef.current = draggingNodeId;

  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;

  const isPanningRef = useRef(isPanning);
  isPanningRef.current = isPanning;

  const panStartRef = useRef(panStart);
  panStartRef.current = panStart;

  const resizingStateRef = useRef(resizingState);
  resizingStateRef.current = resizingState;

  const connectingStateRef = useRef(connectingState);
  connectingStateRef.current = connectingState;

  const hoveredPortRef = useRef(hoveredPort);
  hoveredPortRef.current = hoveredPort;

  const rafIdRef = useRef<number | null>(null);
  const pendingMousePosRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // Notation editing
  const [editingEdgeLabelId, setEditingEdgeLabelId] = useState<string | null>(null);
  const [edgeLabelText, setEdgeLabelText] = useState<string>('');

  // Card text editing
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // File Suggestion Popover (matching the Table ▾ popover in user screenshot!)
  const [showFileSuggestPopover, setShowFileSuggestPopover] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileSortAsc, setFileSortAsc] = useState(true);

  // Media & Documents Suggestion Popover (Images, PDFs, Media from Vault or Computer)
  const [showMediaSuggestPopover, setShowMediaSuggestPopover] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaCategory, setMediaCategory] = useState<'all' | 'images' | 'pdfs' | 'media'>('all');
  const mediaUploadInputRef = useRef<HTMLInputElement | null>(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<CanvasData[]>([initialCanvasData]);
  const [historyIdx, setHistoryIdx] = useState(0);

  useEffect(() => {
    setCanvasData(initialCanvasData);
  }, [initialCanvasData]);

  useEffect(() => {
    if (editingEdgeLabelId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingEdgeLabelId]);

  // Save changes to disk and update undo history
  const persistCanvas = useCallback((newData: CanvasData) => {
    setCanvasData(newData);
    setHistory(prev => [...prev.slice(0, historyIdx + 1), newData]);
    setHistoryIdx(prev => prev + 1);
    const serialized = JSON.stringify(newData, null, 2);
    onSaveContent(serialized);
  }, [onSaveContent, historyIdx]);

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const prevData = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      setCanvasData(prevData);
      onSaveContent(JSON.stringify(prevData, null, 2));
    }
  }, [history, historyIdx, onSaveContent]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextData = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      setCanvasData(nextData);
      onSaveContent(JSON.stringify(nextData, null, 2));
    }
  }, [history, historyIdx, onSaveContent]);

  // Node position dictionary for fast lookup
  const nodeDict = useMemo(() => {
    const map = new Map<string, CanvasNodeData>();
    canvasData.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [canvasData.nodes]);

  // Calculate connection port coordinate on a node
  const getPortPos = useCallback((node: CanvasNodeData, side: Side) => {
    switch (side) {
      case 'top':
        return { x: node.x + node.width / 2, y: node.y };
      case 'right':
        return { x: node.x + node.width, y: node.y + node.height / 2 };
      case 'bottom':
        return { x: node.x + node.width / 2, y: node.y + node.height };
      case 'left':
        return { x: node.x, y: node.y + node.height / 2 };
    }
  }, []);

  // Compute smooth cubic bezier path and midpoint (t = 0.5)
  const getEdgeCurve = useCallback((
    sx: number,
    sy: number,
    fromSide: Side,
    tx: number,
    ty: number,
    toSide?: Side
  ) => {
    const dist = Math.hypot(tx - sx, ty - sy);
    const curvature = Math.max(30, Math.min(150, dist * 0.45));

    let c1x = sx;
    let c1y = sy;
    switch (fromSide) {
      case 'top': c1y -= curvature; break;
      case 'bottom': c1y += curvature; break;
      case 'left': c1x -= curvature; break;
      case 'right': c1x += curvature; break;
    }

    let c2x = tx;
    let c2y = ty;
    if (toSide) {
      switch (toSide) {
        case 'top': c2y -= curvature; break;
        case 'bottom': c2y += curvature; break;
        case 'left': c2x -= curvature; break;
        case 'right': c2x += curvature; break;
      }
    } else {
      c2x = tx - (tx - sx) * 0.15;
      c2y = ty - (ty - sy) * 0.15;
    }

    const midX = 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx;
    const midY = 0.125 * sy + 0.375 * c1y + 0.375 * c2y + 0.125 * ty;

    const path = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
    return { path, midX, midY };
  }, []);

  // Delete node
  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const nextNodes = canvasData.nodes.filter(n => n.id !== selectedNodeId);
    const nextEdges = canvasData.edges.filter(
      e => e.fromNode !== selectedNodeId && e.toNode !== selectedNodeId
    );
    persistCanvas({ nodes: nextNodes, edges: nextEdges });
    setSelectedNodeId(null);
  }, [selectedNodeId, canvasData, persistCanvas]);

  // Duplicate selected node (Ctrl+D / Cmd+D)
  const handleDuplicateSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const node = canvasData.nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const newNode: CanvasNodeData = {
      ...node,
      id: `node-${Date.now()}`,
      x: node.x + 36,
      y: node.y + 36
    };

    persistCanvas({
      ...canvasData,
      nodes: [...canvasData.nodes, newNode]
    });
    setSelectedNodeId(newNode.id);
  }, [selectedNodeId, canvasData, persistCanvas]);

  // Delete edge
  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    const nextEdges = canvasData.edges.filter(e => e.id !== selectedEdgeId);
    persistCanvas({ ...canvasData, edges: nextEdges });
    setSelectedEdgeId(null);
    setEditingEdgeLabelId(null);
  }, [selectedEdgeId, canvasData, persistCanvas]);

  // Zoom to Fit (auto-centers and bounds all canvas elements)
  const handleZoomToFit = useCallback(() => {
    if (canvasData.nodes.length === 0) {
      setTransform({ x: 500, y: 350, scale: 0.85 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    canvasData.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 120;
    const boundWidth = (maxX - minX) + padding * 2;
    const boundHeight = (maxY - minY) + padding * 2;

    const container = containerRef.current;
    const viewWidth = container ? container.clientWidth : window.innerWidth;
    const viewHeight = container ? container.clientHeight : window.innerHeight;

    const scale = Math.max(0.2, Math.min(1.4, Math.min(viewWidth / boundWidth, viewHeight / boundHeight)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: Math.round(viewWidth / 2 - centerX * scale),
      y: Math.round(viewHeight / 2 - centerY * scale),
      scale
    });
  }, [canvasData.nodes]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInputActive) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelectedNode();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteSelectedEdge();
        } else if (selectedNodeId) {
          e.preventDefault();
          handleDeleteSelectedNode();
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setEditingEdgeLabelId(null);
        setConnectingState(null);
        setResizingState(null);
        setShowFileSuggestPopover(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, handleDeleteSelectedEdge, handleDeleteSelectedNode, handleDuplicateSelectedNode, handleUndo, handleRedo]);

  // Pan canvas or click empty area to deselect
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.canvas-node') ||
      target.closest('.canvas-port') ||
      target.closest('.canvas-notation-badge') ||
      target.closest('.canvas-edge-hitbox') ||
      target.closest('.canvas-resizer-handle') ||
      target.closest('.canvas-card-menu') ||
      target.closest('.canvas-controls') ||
      target.closest('.canvas-menu') ||
      target.closest('.canvas-suggest-popover')
    ) {
      return;
    }

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEditingEdgeLabelId(null);
    setShowFileSuggestPopover(false);
    setIsPanning(true);
    isPanningRef.current = true;
    const pStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    panStartRef.current = pStart;
    setPanStart(pStart);
  };

  const processMouseMove = useCallback((clientX: number, clientY: number) => {
    const curTransform = transformRef.current;
    const curDraggingId = draggingNodeIdRef.current;
    const curResizing = resizingStateRef.current;
    const curPanning = isPanningRef.current;
    const curConnecting = connectingStateRef.current;

    if (curPanning) {
      setTransform(prev => ({
        ...prev,
        x: clientX - panStartRef.current.x,
        y: clientY - panStartRef.current.y
      }));
    } else if (curResizing) {
      const mouseCanvasX = (clientX - curTransform.x) / curTransform.scale;
      const mouseCanvasY = (clientY - curTransform.y) / curTransform.scale;
      const dx = mouseCanvasX - curResizing.startMouseX;
      const dy = mouseCanvasY - curResizing.startMouseY;

      const minW = 180;
      const minH = 120;

      setCanvasData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => {
          if (n.id !== curResizing.nodeId) return n;
          let newX = curResizing.initialX;
          let newY = curResizing.initialY;
          let newW = curResizing.initialWidth;
          let newH = curResizing.initialHeight;

          if (curResizing.direction.includes('right')) {
            newW = Math.max(minW, curResizing.initialWidth + dx);
          }
          if (curResizing.direction.includes('bottom')) {
            newH = Math.max(minH, curResizing.initialHeight + dy);
          }
          if (curResizing.direction.includes('left')) {
            const potentialW = curResizing.initialWidth - dx;
            if (potentialW >= minW) {
              newW = potentialW;
              newX = curResizing.initialX + dx;
            } else {
              newW = minW;
              newX = curResizing.initialX + (curResizing.initialWidth - minW);
            }
          }
          if (curResizing.direction.includes('top')) {
            const potentialH = curResizing.initialHeight - dy;
            if (potentialH >= minH) {
              newH = potentialH;
              newY = curResizing.initialY + dy;
            } else {
              newH = minH;
              newY = curResizing.initialY + (curResizing.initialHeight - minH);
            }
          }

          return {
            ...n,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH)
          };
        })
      }));
    } else if (curDraggingId) {
      const mouseCanvasX = (clientX - curTransform.x) / curTransform.scale;
      const mouseCanvasY = (clientY - curTransform.y) / curTransform.scale;
      const newX = Math.round(mouseCanvasX - dragOffsetRef.current.x);
      const newY = Math.round(mouseCanvasY - dragOffsetRef.current.y);

      setCanvasData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === curDraggingId ? { ...n, x: newX, y: newY } : n)
      }));
    } else if (curConnecting) {
      const mouseCanvasX = (clientX - curTransform.x) / curTransform.scale;
      const mouseCanvasY = (clientY - curTransform.y) / curTransform.scale;
      setConnectingState(prev => prev ? ({
        ...prev,
        currentX: mouseCanvasX,
        currentY: mouseCanvasY
      }) : null);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    pendingMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingMousePosRef.current) {
          processMouseMove(pendingMousePosRef.current.clientX, pendingMousePosRef.current.clientY);
        }
      });
    }
  }, [processMouseMove]);

  const handleMouseUp = useCallback((e?: MouseEvent | React.MouseEvent) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (isPanningRef.current) {
      setIsPanning(false);
      isPanningRef.current = false;
    }

    if (resizingStateRef.current) {
      setResizingState(null);
      resizingStateRef.current = null;
      persistCanvas(canvasDataRef.current);
    }

    if (draggingNodeIdRef.current) {
      const draggedId = draggingNodeIdRef.current;
      setDraggingNodeId(null);
      draggingNodeIdRef.current = null;

      const finalPos = e && 'clientX' in e ? { clientX: e.clientX, clientY: e.clientY } : pendingMousePosRef.current;
      if (finalPos) {
        const curTransform = transformRef.current;
        const mouseCanvasX = (finalPos.clientX - curTransform.x) / curTransform.scale;
        const mouseCanvasY = (finalPos.clientY - curTransform.y) / curTransform.scale;
        const newX = Math.round(mouseCanvasX - dragOffsetRef.current.x);
        const newY = Math.round(mouseCanvasY - dragOffsetRef.current.y);

        const updatedData: CanvasData = {
          ...canvasDataRef.current,
          nodes: canvasDataRef.current.nodes.map(n => n.id === draggedId ? { ...n, x: newX, y: newY } : n)
        };
        persistCanvas(updatedData);
      } else {
        persistCanvas(canvasDataRef.current);
      }
    }

    if (connectingStateRef.current) {
      const conn = connectingStateRef.current;
      const hPort = hoveredPortRef.current;
      if (hPort && hPort.nodeId !== conn.fromNodeId) {
        const newEdgeId = `edge-${Date.now()}`;
        const newEdge: CanvasEdgeData = {
          id: newEdgeId,
          fromNode: conn.fromNodeId,
          fromSide: conn.fromSide,
          toNode: hPort.nodeId,
          toSide: hPort.side,
          label: '',
          color: '6',
          toEnd: 'arrow'
        };

        const updatedData: CanvasData = {
          ...canvasDataRef.current,
          edges: [...canvasDataRef.current.edges, newEdge]
        };

        persistCanvas(updatedData);
        setSelectedNodeId(null);
        setSelectedEdgeId(newEdgeId);
        setEditingEdgeLabelId(newEdgeId);
        setEdgeLabelText('');
      }

      setConnectingState(null);
      connectingStateRef.current = null;
      setHoveredPort(null);
      hoveredPortRef.current = null;
    }
  }, [persistCanvas]);

  // Window-level listeners to prevent stuck drag states and guarantee instantaneous silky smooth movement
  useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      if (draggingNodeIdRef.current || isPanningRef.current || resizingStateRef.current || connectingStateRef.current) {
        handleMouseMove(e);
      }
    };

    const onGlobalMouseUp = (e: MouseEvent) => {
      if (draggingNodeIdRef.current || isPanningRef.current || resizingStateRef.current || connectingStateRef.current) {
        handleMouseUp(e);
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(2.5, prev.scale * zoomFactor))
    }));
  };

  // Node Drag
  const startDragNode = (node: CanvasNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setDraggingNodeId(node.id);
    draggingNodeIdRef.current = node.id;
    const mouseCanvasX = (e.clientX - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - transform.y) / transform.scale;
    const offset = {
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y
    };
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  // Resizing trigger
  const startResizeNode = (node: CanvasNodeData, direction: ResizeDirection, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const mouseCanvasX = (e.clientX - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - transform.y) / transform.scale;
    const rState: ResizingState = {
      nodeId: node.id,
      direction,
      startMouseX: mouseCanvasX,
      startMouseY: mouseCanvasY,
      initialX: node.x,
      initialY: node.y,
      initialWidth: node.width,
      initialHeight: node.height
    };
    resizingStateRef.current = rState;
    setResizingState(rState);
  };

  // Start connecting from a node's port handle
  const handleStartConnection = (nodeId: string, side: Side, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodeDict.get(nodeId);
    if (!node) return;
    const pos = getPortPos(node, side);
    const cState: ConnectingState = {
      fromNodeId: nodeId,
      fromSide: side,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y
    };
    connectingStateRef.current = cState;
    setConnectingState(cState);
  };

  // Save edge notation label
  const handleSaveEdgeLabel = (edgeId: string, label: string) => {
    const trimmed = label.trim();
    persistCanvas({
      ...canvasData,
      edges: canvasData.edges.map(e => e.id === edgeId ? { ...e, label: trimmed } : e)
    });
    setEditingEdgeLabelId(null);
  };

  // Edge direction toggle
  const handleToggleEdgeDirection = () => {
    if (!selectedEdgeId) return;
    const edge = canvasData.edges.find(e => e.id === selectedEdgeId);
    if (!edge) return;

    let nextFromEnd: 'arrow' | 'none' = 'none';
    let nextToEnd: 'arrow' | 'none' = 'arrow';

    if (edge.fromEnd === 'arrow' && edge.toEnd !== 'none') {
      nextFromEnd = 'none';
      nextToEnd = 'none';
    } else if (edge.toEnd === 'none') {
      nextFromEnd = 'none';
      nextToEnd = 'arrow';
    } else {
      nextFromEnd = 'arrow';
      nextToEnd = 'arrow';
    }

    persistCanvas({
      ...canvasData,
      edges: canvasData.edges.map(e => e.id === selectedEdgeId ? {
        ...e,
        fromEnd: nextFromEnd,
        toEnd: nextToEnd
      } : e)
    });
  };

  // Change edge color
  const handleChangeEdgeColor = (colorKey: string) => {
    if (!selectedEdgeId) return;
    persistCanvas({
      ...canvasData,
      edges: canvasData.edges.map(e => e.id === selectedEdgeId ? { ...e, color: colorKey } : e)
    });
  };

  // Center drop coordinate helper
  const getCanvasCenterDropPos = () => {
    const container = containerRef.current;
    const w = container ? container.clientWidth : 800;
    const h = container ? container.clientHeight : 600;
    return {
      x: Math.round((-transform.x + w / 2 - 140) / transform.scale),
      y: Math.round((-transform.y + h / 2 - 100) / transform.scale)
    };
  };

  // Add Card Actions
  const handleAddTextCard = () => {
    const pos = getCanvasCenterDropPos();
    const newNode: CanvasNodeData = {
      id: `node-${Date.now()}`,
      type: 'text',
      text: '### New Idea\nDouble-click to edit this card in markdown.',
      x: pos.x,
      y: pos.y,
      width: 280,
      height: 180,
      color: '6'
    };
    persistCanvas({
      ...canvasData,
      nodes: [...canvasData.nodes, newNode]
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  // Add File Card (Note or Canvas-in-Canvas)
  const handleAddFileCard = (targetFile: VaultFile) => {
    const pos = getCanvasCenterDropPos();
    const isCanvasFile = targetFile.extension === 'canvas';
    const newNode: CanvasNodeData = {
      id: `node-${Date.now()}`,
      type: 'file',
      file: targetFile.path,
      x: pos.x,
      y: pos.y,
      width: isCanvasFile ? 340 : 300,
      height: isCanvasFile ? 260 : 220,
      color: isCanvasFile ? '2' : '6'
    };
    persistCanvas({
      ...canvasData,
      nodes: [...canvasData.nodes, newNode]
    });
    setShowFileSuggestPopover(false);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  // Add Group Card
  const handleAddGroupCard = () => {
    const pos = getCanvasCenterDropPos();
    const newNode: CanvasNodeData = {
      id: `node-${Date.now()}`,
      type: 'group',
      label: 'New Group',
      x: pos.x - 40,
      y: pos.y - 40,
      width: 480,
      height: 360,
      color: '6'
    };
    persistCanvas({
      ...canvasData,
      nodes: [newNode, ...canvasData.nodes]
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  // Add Canvas in Canvas Card
  const handleAddCanvasCard = () => {
    setFileSearchQuery('.canvas');
    setShowFileSuggestPopover(true);
  };

  const handleChangeNodeColor = (colorKey: string) => {
    if (!selectedNodeId) return;
    persistCanvas({
      ...canvasData,
      nodes: canvasData.nodes.map(n => {
        if (n.id !== selectedNodeId) return n;
        const nextColor = n.color === colorKey ? undefined : colorKey;
        return { ...n, color: nextColor };
      })
    });
  };

  const selectedEdge = useMemo(() => {
    return canvasData.edges.find(e => e.id === selectedEdgeId) || null;
  }, [canvasData.edges, selectedEdgeId]);

  const selectedNode = useMemo(() => {
    return canvasData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [canvasData.nodes, selectedNodeId]);

  // Filtered files for the Table suggest popover
  const popoverFilesList = useMemo(() => {
    let list = allFiles.filter(f => f.path !== file.path);
    if (fileSearchQuery) {
      list = list.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) || f.path.toLowerCase().includes(fileSearchQuery.toLowerCase()));
    }
    return list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return fileSortAsc ? cmp : -cmp;
    });
  }, [allFiles, file.path, fileSearchQuery, fileSortAsc]);

  // Filtered media files for the Media suggest popover
  const filteredMediaList = useMemo(() => {
    const mediaExts = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
      'pdf', 'webm', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'm4a'
    ]);
    let list = allFiles.filter(f => f.isBinary || mediaExts.has((f.extension || '').toLowerCase()));
    if (mediaCategory === 'images') {
      list = list.filter(f => ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes((f.extension || '').toLowerCase()));
    } else if (mediaCategory === 'pdfs') {
      list = list.filter(f => (f.extension || '').toLowerCase() === 'pdf');
    } else if (mediaCategory === 'media') {
      list = list.filter(f => ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'mov'].includes((f.extension || '').toLowerCase()));
    }
    if (mediaSearchQuery) {
      const q = mediaSearchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }
    return list;
  }, [allFiles, mediaCategory, mediaSearchQuery]);

  const handleAddMediaCard = useCallback((fileToAdd: VaultFile) => {
    const isImg = fileToAdd.name.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i);
    const canvasCenterX = Math.round((-transform.x + (containerRef.current?.clientWidth || 800) / 2) / transform.scale);
    const canvasCenterY = Math.round((-transform.y + (containerRef.current?.clientHeight || 600) / 2) / transform.scale);
    const newNode: CanvasNodeData = {
      id: `node-${Date.now()}`,
      type: 'file',
      file: fileToAdd.path,
      x: canvasCenterX - (isImg ? 180 : 200),
      y: canvasCenterY - (isImg ? 130 : 150),
      width: isImg ? 360 : 400,
      height: isImg ? 260 : 300,
      color: '6'
    };
    persistCanvas({
      ...canvasData,
      nodes: [...canvasData.nodes, newNode]
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
    setShowMediaSuggestPopover(false);
  }, [transform, canvasData, persistCanvas]);

  const handleMediaUploadChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const relPath = `Attachments/${f.name}`;
        await vault.saveBinaryFile(relPath, base64);
        await vault.refreshState();

        const isImg = f.name.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i);
        const canvasCenterX = Math.round((-transform.x + (containerRef.current?.clientWidth || 800) / 2) / transform.scale);
        const canvasCenterY = Math.round((-transform.y + (containerRef.current?.clientHeight || 600) / 2) / transform.scale);

        const newNode: CanvasNodeData = {
          id: `node-${Date.now()}-${i}`,
          type: 'file',
          file: relPath,
          x: canvasCenterX + i * 30 - (isImg ? 180 : 200),
          y: canvasCenterY + i * 30 - (isImg ? 130 : 150),
          width: isImg ? 360 : 400,
          height: isImg ? 260 : 300,
          color: '6'
        };

        setCanvasData(prev => {
          const next = { ...prev, nodes: [...prev.nodes, newNode] };
          persistCanvas(next);
          return next;
        });
        setSelectedNodeId(newNode.id);
      };
      reader.readAsDataURL(f);
    }
    setShowMediaSuggestPopover(false);
    if (mediaUploadInputRef.current) mediaUploadInputRef.current.value = '';
  }, [transform, persistCanvas]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={async e => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        const clientX = e.clientX - (rect?.left || 0);
        const clientY = e.clientY - (rect?.top || 0);
        const canvasX = Math.round((clientX - transform.x) / transform.scale);
        const canvasY = Math.round((clientY - transform.y) / transform.scale);

        // 1. External files dropped from Finder / Desktop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const droppedFile = e.dataTransfer.files[i];
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const relPath = `Attachments/${droppedFile.name}`;
              await vault.saveBinaryFile(relPath, base64);
              const isCanvas = droppedFile.name.endsWith('.canvas');
              const newNode: CanvasNodeData = {
                id: `node-${Date.now()}-${i}`,
                type: 'file',
                file: relPath,
                x: canvasX + i * 35 - (isCanvas ? 170 : 150),
                y: canvasY + i * 35 - (isCanvas ? 130 : 110),
                width: isCanvas ? 340 : 300,
                height: isCanvas ? 260 : 220,
                color: isCanvas ? '2' : '6'
              };
              persistCanvas({
                ...canvasData,
                nodes: [...canvasData.nodes, newNode]
              });
              setSelectedNodeId(newNode.id);
            };
            reader.readAsDataURL(droppedFile);
          }
          return;
        }

        // 2. Dock action dragged onto canvas
        const dockAction = e.dataTransfer.getData('canvas-dock-action');
        if (dockAction === 'text') {
          const newNode: CanvasNodeData = {
            id: `node-${Date.now()}`,
            type: 'text',
            text: '',
            x: canvasX - 130,
            y: canvasY - 75,
            width: 260,
            height: 150,
            color: '6'
          };
          persistCanvas({ ...canvasData, nodes: [...canvasData.nodes, newNode] });
          setSelectedNodeId(newNode.id);
          setSelectedEdgeId(null);
          return;
        }
        if (dockAction === 'note') {
          setShowFileSuggestPopover(true);
          setShowMediaSuggestPopover(false);
          return;
        }
        if (dockAction === 'media') {
          setShowMediaSuggestPopover(true);
          setShowFileSuggestPopover(false);
          return;
        }

        // 3. Internal notes / canvas cards dragged from sidebar
        const rawData = e.dataTransfer.getData('application/obsidian-file') || e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        let filePath = rawData;
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && parsed.path) filePath = parsed.path;
        } catch {}

        const target = allFiles.find(f => f.path === filePath || f.name === filePath);
        if (!target) return;

        const isCanvas = target.extension === 'canvas';
        const newNode: CanvasNodeData = {
          id: `node-${Date.now()}`,
          type: 'file',
          file: target.path,
          x: canvasX - (isCanvas ? 170 : 150),
          y: canvasY - (isCanvas ? 130 : 110),
          width: isCanvas ? 340 : 300,
          height: isCanvas ? 260 : 220,
          color: isCanvas ? '2' : '6'
        };

        persistCanvas({
          ...canvasData,
          nodes: [...canvasData.nodes, newNode]
        });
        setSelectedNodeId(newNode.id);
        setSelectedEdgeId(null);
      }}
      className="relative w-full h-full bg-[#f4f4f6] overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--canvas-dot-color, #d1d1d6) 1.2px, transparent 1.2px)',
        backgroundSize: `${28 * transform.scale}px ${28 * transform.scale}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`
      }}
    >
      {/* 1. File Suggestion Popover (matching Table ▾ popover in user screenshot!) */}
      {showFileSuggestPopover && (
        <div
          className="canvas-suggest-popover absolute top-4 left-4 z-50 w-80 max-h-[460px] bg-white border border-black/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col text-xs text-[#111113]"
          onClick={e => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between p-2.5 pb-2 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 font-semibold text-[#111113] hover:bg-black/[0.04] bg-[#f4f4f6] px-2 py-0.5 rounded-lg border border-black/[0.08]">
                <span>Table</span>
                <span className="text-[10px] text-[#8e8e93]">▾</span>
              </button>
              <span className="text-[11px] text-[#8e8e93] font-mono">{popoverFilesList.length} results</span>
            </div>

            <div className="flex items-center gap-1 text-[#8e8e93]">
              <button
                onClick={() => setFileSortAsc(prev => !prev)}
                className="p-1 hover:text-[#111113] hover:bg-black/[0.04] rounded-lg transition-colors"
                title="Sort Files"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowFileSuggestPopover(false)}
                className="p-1 hover:text-[#111113] hover:bg-black/[0.04] rounded-lg transition-colors ml-1"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar inside popover */}
          <div className="px-2.5 pt-2 pb-1">
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fileSearchQuery}
                onChange={e => setFileSearchQuery(e.target.value)}
                placeholder="Search vault..."
                autoFocus
                className="w-full bg-[#f4f4f6] border border-black/[0.08] rounded-lg px-2.5 pl-6 py-1 text-xs text-[#111113] placeholder-[#8e8e93] focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Info column header */}
          <div className="px-3 py-1.5 text-[10px] text-[#8e8e93] border-b border-black/[0.06] flex items-center gap-1">
            <span>ⓘ</span>
            <span>file name</span>
          </div>

          {/* Files List with Obsidian link styling */}
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {popoverFilesList.map(f => {
              const isCanvas = f.extension === 'canvas';
              return (
                <div
                  key={f.id}
                  onClick={() => handleAddFileCard(f)}
                  className="px-2.5 py-1.5 rounded-lg hover:bg-black/[0.04] cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <span className="text-[#111113] hover:underline font-normal truncate">
                    {f.name.replace(/\.md$/, '')}
                  </span>
                  {isCanvas && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase tracking-wider">
                      canvas
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1.5 Media & Documents Suggestion Popover (Images, PDFs, Media from Vault or Computer) */}
      {showMediaSuggestPopover && (
        <div
          className="canvas-suggest-popover absolute top-4 left-4 z-50 w-88 max-h-[500px] bg-white border border-black/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col text-xs text-[#111113]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2.5 pb-2 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#111113] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-zinc-700" />
                <span>Media & Documents</span>
              </span>
              <span className="text-[11px] text-[#8e8e93] font-mono">({filteredMediaList.length})</span>
            </div>
            <button
              onClick={() => setShowMediaSuggestPopover(false)}
              className="p-1 hover:text-[#111113] hover:bg-black/[0.04] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload Button */}
          <div className="p-2.5 pb-1">
            <input
              type="file"
              ref={mediaUploadInputRef}
              onChange={handleMediaUploadChange}
              multiple
              accept="image/*,.pdf,video/*,audio/*"
              className="hidden"
            />
            <button
              onClick={() => mediaUploadInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 skeuo-btn-dark rounded-xl font-medium text-xs shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Image or Doc from Computer...</span>
            </button>
          </div>

          {/* Search bar inside media popover */}
          <div className="px-2.5 py-1">
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mediaSearchQuery}
                onChange={e => setMediaSearchQuery(e.target.value)}
                placeholder="Search images, PDFs, media..."
                autoFocus
                className="w-full bg-[#f4f4f6] border border-black/[0.08] rounded-lg px-2.5 pl-7 py-1.5 text-xs text-[#111113] placeholder-[#8e8e93] focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Filter pills: All, Images, PDFs, Audio/Video */}
          <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] border-b border-black/[0.06]">
            {(['all', 'images', 'pdfs', 'media'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setMediaCategory(cat)}
                className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${
                  mediaCategory === cat
                    ? 'bg-[#18181b] text-white font-medium shadow-xs'
                    : 'text-[#585860] hover:text-[#111113] hover:bg-black/[0.04]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Media List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredMediaList.length === 0 ? (
              <div className="p-6 text-center text-[#8e8e93] italic">
                <span>No media found in vault. Click "Choose Image or Doc" above to upload!</span>
              </div>
            ) : (
              filteredMediaList.map(f => {
                const isImg = f.name.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i);
                const isPdf = f.extension.toLowerCase() === 'pdf';
                const isAudio = f.name.match(/\.(mp3|wav|ogg|m4a)$/i);
                return (
                  <div
                    key={f.id}
                    onClick={() => handleAddMediaCard(f)}
                    className="p-1.5 rounded-lg hover:bg-black/[0.04] cursor-pointer flex items-center justify-between transition-colors group border border-transparent"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isImg ? (
                        <div className="w-7 h-7 rounded bg-[#f4f4f6] border border-black/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={`/api/vault/raw?path=${encodeURIComponent(f.path)}`}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : isPdf ? (
                        <div className="w-7 h-7 rounded bg-[#f4f4f6] border border-black/[0.08] shrink-0 flex items-center justify-center text-zinc-700">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : isAudio ? (
                        <div className="w-7 h-7 rounded bg-[#f4f4f6] border border-black/[0.08] shrink-0 flex items-center justify-center text-zinc-700">
                          <Volume2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded bg-[#f4f4f6] border border-black/[0.08] shrink-0 flex items-center justify-center text-zinc-700">
                          <Video className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="text-[#111113] group-hover:text-black truncate font-medium">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-[#8e8e93] truncate">
                          {f.folder || 'Vault Root'} • {(f.size ? (f.size / 1024).toFixed(1) + ' KB' : '')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-[#8e8e93] group-hover:text-[#111113] shrink-0">
                      Add +
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Floating Card Menu Directly Above Selected Card (`canvas-menu`) */}
      {selectedNode && (
        <div
          className="canvas-menu absolute pointer-events-auto z-40 flex items-center gap-1 bg-[#1e1e22]/95 backdrop-blur-xl border border-zinc-700/80 rounded-lg p-1 shadow-2xl -translate-x-1/2"
          style={{
            left: `${selectedNode.x * transform.scale + transform.x + (selectedNode.width * transform.scale) / 2}px`,
            top: `${selectedNode.y * transform.scale + transform.y - 44}px`
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleDeleteSelectedNode}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 rounded transition-colors"
            title="Delete Card (Del/Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Color presets dropdown / toggle */}
          <div className="flex items-center gap-1.5 px-2 border-l border-zinc-700/60">
            {/* Reset / Default Color */}
            <button
              onClick={() => {
                if (!selectedNodeId) return;
                persistCanvas({
                  ...canvasData,
                  nodes: canvasData.nodes.map(n => n.id === selectedNodeId ? { ...n, color: undefined } : n)
                });
              }}
              className={`w-3.5 h-3.5 rounded-full border border-zinc-600 bg-zinc-800 transition-transform hover:scale-125 ${
                !selectedNode.color ? 'ring-2 ring-white scale-110' : ''
              }`}
              title="Default Color (None)"
            />
            {Object.entries(COLOR_PRESETS).map(([key, style]) => (
              <button
                key={key}
                onClick={() => handleChangeNodeColor(key)}
                className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-transform hover:scale-125 ${
                  selectedNode.color === key ? 'ring-2 ring-white scale-110' : ''
                }`}
                style={{ backgroundColor: style.hex }}
                title={`Color ${key}`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              const container = containerRef.current;
              const w = container ? container.clientWidth : 800;
              const h = container ? container.clientHeight : 600;
              setTransform({
                x: w / 2 - (selectedNode.x + selectedNode.width / 2) * 1.05,
                y: h / 2 - (selectedNode.y + selectedNode.height / 2) * 1.05,
                scale: 1.05
              });
            }}
            className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-zinc-800/80 rounded transition-colors ml-0.5"
            title="Focus Card"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDuplicateSelectedNode}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
            title="Duplicate Card (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Floating Edge Menu Directly Above Selected Edge */}
      {selectedEdge && (() => {
        const s = nodeDict.get(selectedEdge.fromNode);
        const t = nodeDict.get(selectedEdge.toNode);
        if (!s || !t) return null;
        const sPos = getPortPos(s, selectedEdge.fromSide);
        const tPos = getPortPos(t, selectedEdge.toSide);
        const { midX, midY } = getEdgeCurve(sPos.x, sPos.y, selectedEdge.fromSide, tPos.x, tPos.y, selectedEdge.toSide);

        return (
          <div
            className="canvas-menu absolute pointer-events-auto z-40 flex items-center gap-1.5 bg-[#1e1e22]/95 backdrop-blur-xl border border-zinc-700/80 rounded-lg p-1.5 shadow-2xl -translate-x-1/2"
            style={{
              left: `${midX * transform.scale + transform.x}px`,
              top: `${midY * transform.scale + transform.y - 48}px`
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setEditingEdgeLabelId(selectedEdge.id);
                setEdgeLabelText(selectedEdge.label || '');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-purple-300 bg-purple-950/60 border border-purple-500/50 hover:bg-purple-900/60 transition-colors text-[11px]"
              title="Edit Notation"
            >
              <Type className="w-3 h-3" />
              <span>{selectedEdge.label ? 'Edit Notation' : 'Add Notation'}</span>
            </button>

            <button
              onClick={handleToggleEdgeDirection}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 text-[11px]"
              title="Toggle Direction"
            >
              {selectedEdge.fromEnd === 'arrow' && selectedEdge.toEnd !== 'none' ? (
                <span className="font-mono">&lt;-&gt;</span>
              ) : selectedEdge.toEnd === 'none' ? (
                <span className="font-mono">--</span>
              ) : (
                <span className="font-mono">-&gt;</span>
              )}
            </button>

            {/* Edge Color Picker */}
            <div className="flex items-center gap-1 px-1.5 border-l border-zinc-700/60">
              <button
                onClick={() => handleChangeEdgeColor('')}
                className={`w-3 h-3 rounded-full border border-zinc-600 bg-zinc-800 transition-transform hover:scale-125 ${
                  !selectedEdge.color ? 'ring-2 ring-white scale-110' : ''
                }`}
                title="Default Color"
              />
              {Object.entries(COLOR_PRESETS).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => handleChangeEdgeColor(key)}
                  className={`w-3 h-3 rounded-full border border-white/20 transition-transform hover:scale-125 ${
                    selectedEdge.color === key ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: style.hex }}
                  title={`Color ${key}`}
                />
              ))}
            </div>

            <button
              onClick={handleDeleteSelectedEdge}
              className="p-1 rounded text-rose-400 hover:bg-rose-950/60"
              title="Delete Connection (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* 4. Right Vertical Toolbar on Canvas (`canvas-controls` in user screenshot!) */}
      <div className="canvas-controls absolute top-4 right-4 z-40 flex flex-col gap-1 p-1 bg-white border border-black/[0.08] rounded-2xl shadow-md text-[#585860]">
        <button
          onClick={() => setShowFileSuggestPopover(prev => !prev)}
          className="p-1.5 hover:text-[#111113] hover:bg-black/[0.04] rounded-xl transition-colors"
          title="Canvas Settings / Files"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <div className="w-4 h-[1px] bg-black/[0.06] mx-auto my-0.5" />

        <button
          onClick={() => setTransform(t => ({ ...t, scale: Math.min(2.5, t.scale * 1.15) }))}
          className="p-1.5 hover:text-[#111113] hover:bg-black/[0.04] rounded-xl transition-colors"
          title="Zoom In (+)"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomToFit}
          className="p-1.5 hover:text-[#111113] hover:bg-black/[0.04] rounded-xl transition-colors"
          title="Zoom to Fit (1:1)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * 0.85) }))}
          className="p-1.5 hover:text-[#111113] hover:bg-black/[0.04] rounded-xl transition-colors"
          title="Zoom Out (-)"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTransform({ x: 500, y: 350, scale: 0.85 })}
          className="p-1.5 hover:text-[#111113] hover:bg-black/[0.04] rounded-xl transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-4 h-[1px] bg-black/[0.06] mx-auto my-0.5" />

        <button
          onClick={handleUndo}
          disabled={historyIdx <= 0}
          className={`p-1.5 rounded-xl transition-colors ${historyIdx > 0 ? 'hover:text-[#111113] hover:bg-black/[0.04]' : 'opacity-30 cursor-not-allowed'}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIdx >= history.length - 1}
          className={`p-1.5 rounded-xl transition-colors ${historyIdx < history.length - 1 ? 'hover:text-[#111113] hover:bg-black/[0.04]' : 'opacity-30 cursor-not-allowed'}`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Bottom Center Floating Dock Toolbar matching Obsidian Canvas dock in media_1792147243199.png */}
      <div className="canvas-card-menu absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white border border-black/[0.08] rounded-2xl px-2.5 py-1.5 shadow-md text-[#585860]">
        {/* 1. Card / Text Card (Folded card outline) */}
        <button
          onClick={handleAddTextCard}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('canvas-dock-action', 'text');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="canvas-card-menu-button p-2 text-[#585860] hover:text-[#111113] rounded-xl hover:bg-black/[0.04] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Card: Click or drag to canvas to add a text card"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </button>

        {/* 2. Note from Vault (Folded document with lines) */}
        <button
          onClick={() => {
            setShowFileSuggestPopover(true);
            setShowMediaSuggestPopover(false);
          }}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('canvas-dock-action', 'note');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="canvas-card-menu-button p-2 text-[#585860] hover:text-[#111113] rounded-xl hover:bg-black/[0.04] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Note: Click or drag to canvas to add a vault note"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </button>

        {/* 3. Media / Image / Document (Folded document with photo/circle/wedge) */}
        <button
          onClick={() => {
            setShowMediaSuggestPopover(true);
            setShowFileSuggestPopover(false);
          }}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('canvas-dock-action', 'media');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="canvas-card-menu-button p-2 text-[#585860] hover:text-[#111113] rounded-xl hover:bg-black/[0.04] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Media: Click or drag to canvas to add an image or document from vault or computer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="10" cy="13" r="1.5" />
            <path d="m19 18-3.5-3.5a1.2 1.2 0 0 0-1.7 0L8 20" />
          </svg>
        </button>

        <div className="w-[1px] h-5 bg-black/[0.08] mx-0.5" />

        {/* 4. Group Card */}
        <button
          onClick={handleAddGroupCard}
          className="canvas-card-menu-button p-2 text-[#585860] hover:text-[#111113] rounded-xl hover:bg-black/[0.04] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Add Group"
        >
          <FolderPlus className="w-5 h-5" />
        </button>

        {/* 5. Sub-Canvas Card */}
        <button
          onClick={handleAddCanvasCard}
          className="canvas-card-menu-button p-2 text-[#585860] hover:text-[#111113] rounded-xl hover:bg-black/[0.04] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Add Canvas in Canvas (.canvas)"
        >
          <LayoutDashboard className="w-5 h-5" />
        </button>
      </div>

      {/* Infinite Canvas Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="absolute inset-0 overflow-visible w-full h-full pointer-events-none">
          <defs>
            {/* Arrow End Markers */}
            {Object.entries(COLOR_PRESETS).map(([key, c]) => (
              <marker
                key={`arrow-end-${key}`}
                id={`arrow-end-${key}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={c.hex} />
              </marker>
            ))}
            <marker
              id="arrow-end-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#71717a" />
            </marker>
            <marker
              id="arrow-end-selected"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a855f7" />
            </marker>

            {/* Arrow Start Markers */}
            {Object.entries(COLOR_PRESETS).map(([key, c]) => (
              <marker
                key={`arrow-start-${key}`}
                id={`arrow-start-${key}`}
                viewBox="0 0 10 10"
                refX="2"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill={c.hex} />
              </marker>
            ))}
            <marker
              id="arrow-start-default"
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#71717a" />
            </marker>
            <marker
              id="arrow-start-selected"
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#a855f7" />
            </marker>
          </defs>

          {/* Render Saved Edges */}
          {canvasData.edges.map(edge => {
            const s = nodeDict.get(edge.fromNode);
            const t = nodeDict.get(edge.toNode);
            if (!s || !t) return null;

            const sPos = getPortPos(s, edge.fromSide);
            const tPos = getPortPos(t, edge.toSide);
            const { path } = getEdgeCurve(sPos.x, sPos.y, edge.fromSide, tPos.x, tPos.y, edge.toSide);

            const isSelected = selectedEdgeId === edge.id;
            const colorHex = isSelected
              ? '#a855f7'
              : (edge.color && COLOR_PRESETS[edge.color] ? COLOR_PRESETS[edge.color].hex : '#71717a');
            
            const markerSuffix = isSelected
              ? 'selected'
              : (edge.color && COLOR_PRESETS[edge.color] ? edge.color : 'default');

            return (
              <g
                key={edge.id}
                className="canvas-edge cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
              >
                {/* Wide invisible hit area */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  className="canvas-edge-hitbox pointer-events-stroke cursor-pointer"
                />

                {/* Visible styled edge */}
                <path
                  d={path}
                  fill="none"
                  stroke={colorHex}
                  strokeWidth={isSelected ? '3' : '2'}
                  markerStart={edge.fromEnd === 'arrow' ? `url(#arrow-start-${markerSuffix})` : undefined}
                  markerEnd={edge.toEnd !== 'none' ? `url(#arrow-end-${markerSuffix})` : undefined}
                  opacity={isSelected ? '1' : '0.8'}
                  className="pointer-events-none"
                />
              </g>
            );
          })}

          {/* Render Active Connection Drag Wire */}
          {connectingState && (() => {
            let targetX = connectingState.currentX;
            let targetY = connectingState.currentY;
            let targetSide: Side | undefined;

            if (hoveredPort) {
              const targetNode = nodeDict.get(hoveredPort.nodeId);
              if (targetNode) {
                const snapped = getPortPos(targetNode, hoveredPort.side);
                targetX = snapped.x;
                targetY = snapped.y;
                targetSide = hoveredPort.side;
              }
            }

            const { path: dragPath } = getEdgeCurve(
              connectingState.startX,
              connectingState.startY,
              connectingState.fromSide,
              targetX,
              targetY,
              targetSide
            );

            return (
              <g className="pointer-events-none">
                <path
                  d={dragPath}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrow-end-selected)"
                  className="animate-pulse"
                />
                <circle cx={targetX} cy={targetY} r="4" fill="#a855f7" />
              </g>
            );
          })()}
        </svg>

        {/* Edge Notations Layer */}
        {canvasData.edges.map(edge => {
          const s = nodeDict.get(edge.fromNode);
          const t = nodeDict.get(edge.toNode);
          if (!s || !t) return null;

          const sPos = getPortPos(s, edge.fromSide);
          const tPos = getPortPos(t, edge.toSide);
          const { midX, midY } = getEdgeCurve(sPos.x, sPos.y, edge.fromSide, tPos.x, tPos.y, edge.toSide);

          const isSelected = selectedEdgeId === edge.id;
          const isEditing = editingEdgeLabelId === edge.id;

          if (isEditing) {
            return (
              <div
                key={`notation-${edge.id}`}
                className="absolute pointer-events-auto z-30 canvas-notation-badge"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSaveEdgeLabel(edge.id, edgeLabelText);
                  }}
                  className="flex items-center gap-1 bg-white border-2 border-[#18181b] rounded-xl p-1 shadow-md"
                >
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={edgeLabelText}
                    onChange={e => setEdgeLabelText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setEditingEdgeLabelId(null);
                      }
                    }}
                    onBlur={() => handleSaveEdgeLabel(edge.id, edgeLabelText)}
                    placeholder="Edge notation..."
                    className="bg-transparent text-xs text-[#111113] placeholder-[#8e8e93] outline-none w-32 px-1 font-sans"
                  />
                </form>
              </div>
            );
          }

          if (edge.label) {
            return (
              <div
                key={`notation-${edge.id}`}
                className="absolute pointer-events-auto z-20 canvas-notation-badge cursor-pointer"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setEditingEdgeLabelId(edge.id);
                  setEdgeLabelText(edge.label || '');
                }}
                title="Double-click to edit notation"
              >
                <div
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border shadow-xs transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#18181b] text-white border-transparent shadow-sm'
                      : 'bg-white text-[#111113] border-black/[0.08] hover:border-black/[0.2]'
                  }`}
                >
                  {edge.label}
                </div>
              </div>
            );
          }

          if (isSelected) {
            return (
              <div
                key={`notation-${edge.id}`}
                className="absolute pointer-events-auto z-20 canvas-notation-badge cursor-pointer"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={e => {
                  e.stopPropagation();
                  setEditingEdgeLabelId(edge.id);
                  setEdgeLabelText('');
                }}
              >
                <div className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-[#111113] border border-black/[0.1] shadow-xs hover:bg-[#f4f4f6] flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3 text-zinc-700" />
                  <span>Notation</span>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Obsidian Empty Canvas Guide (matching user screenshot) */}
        {canvasData.nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 10
            }}
            className="bg-white border border-black/[0.08] rounded-2xl px-8 py-6 text-center shadow-md"
          >
            <div className="space-y-1.5 text-center">
              <div className="text-[#111113] font-semibold text-sm">Drag from below or double click</div>
              <div className="text-xs text-[#8e8e93]">Space + Drag to pan</div>
              <div className="text-xs text-[#8e8e93]">⌘ + Scroll to zoom</div>
            </div>
          </div>
        )}

        {/* Node Cards Layer */}
        {canvasData.nodes.map(node => {
          const isSelected = selectedNodeId === node.id;
          const nodeColorKey = node.color;
          const customColor = nodeColorKey
            ? (COLOR_PRESETS[nodeColorKey] || (nodeColorKey.startsWith('#') ? { bg: 'bg-[#18181c]', border: '', text: 'text-zinc-200', hex: nodeColorKey, groupBg: 'bg-white/5' } : null))
            : null;
          const cardHex = customColor ? customColor.hex : (isSelected ? '#a855f7' : undefined);

          const isGroup = node.type === 'group';
          const isCanvasFile = node.type === 'file' && node.file?.endsWith('.canvas');
          const isLink = node.type === 'link';

          const referencedFile = node.type === 'file' && node.file
            ? allFiles.find(f => f.path === node.file || f.name === node.file)
            : undefined;

          const showPorts =
            hoveredNodeId === node.id ||
            isSelected ||
            connectingState !== null;

          return (
            <div
              key={node.id}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => {
                if (hoveredNodeId === node.id) setHoveredNodeId(null);
              }}
              onClick={e => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onMouseDown={e => startDragNode(node, e)}
              className={`canvas-node absolute pointer-events-auto flex flex-col transition-[box-shadow,border-color] duration-150 select-none ${
                isGroup
                  ? 'border-dashed border-2 rounded-2xl z-0 p-3'
                  : isSelected
                  ? 'border-2 rounded-2xl z-20 p-4'
                  : customColor
                  ? 'border-2 rounded-2xl z-10 p-4'
                  : 'bg-white border border-black/[0.08] hover:border-black/[0.18] rounded-2xl z-10 p-4 shadow-sm text-[#111113]'
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                borderColor: cardHex || (isSelected ? '#18181b' : undefined),
                backgroundColor: isGroup
                  ? (customColor ? `${customColor.hex}18` : 'rgba(0, 0, 0, 0.03)')
                  : (customColor ? `${customColor.hex}15` : undefined),
                boxShadow: isSelected
                  ? '0 0 0 2px #18181b, 0 12px 24px -6px rgba(0,0,0,0.1)'
                  : customColor
                  ? '0 4px 12px rgba(0,0,0,0.05)'
                  : undefined
              }}
            >
              {/* Group Node Header */}
              {isGroup && (
                <div className="flex items-center justify-between text-xs cursor-move mb-2">
                  <input
                    type="text"
                    value={node.label || 'Group'}
                    onChange={e => {
                      const newLabel = e.target.value;
                      persistCanvas({
                        ...canvasData,
                        nodes: canvasData.nodes.map(n => n.id === node.id ? { ...n, label: newLabel } : n)
                      });
                    }}
                    className="bg-transparent font-bold text-sm text-zinc-200 focus:outline-none focus:text-white"
                    placeholder="Group Title"
                  />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Group</span>
                </div>
              )}

              {/* Standard Card Header (Non-Group) matching user screenshot! */}
              {!isGroup && (() => {
                const fileExt = (node.file?.split('.').pop() || '').toLowerCase();
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(fileExt);
                const isPdf = fileExt === 'pdf';
                const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(fileExt);
                const isVideo = ['mp4', 'webm', 'ogv', 'mov'].includes(fileExt);

                return (
                  <div className="flex items-start justify-between pb-1 mb-2 text-xs cursor-move">
                    <div className="flex items-center gap-1.5 truncate">
                      {isCanvasFile ? (
                        <LayoutDashboard className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      ) : isImage ? (
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : isPdf ? (
                        <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : isAudio ? (
                        <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : isVideo ? (
                        <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      ) : isLink ? (
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: cardHex || '#a855f7' }} />
                      )}
                      <span className="font-bold text-sm text-zinc-100 truncate">
                        {isCanvasFile
                          ? (referencedFile ? referencedFile.name : node.file)
                          : isImage || isPdf || isAudio || isVideo
                          ? (node.file?.split('/').pop() || 'Media')
                          : node.type === 'file'
                          ? (referencedFile ? referencedFile.name.replace(/\.md$/, '') : node.file)
                          : isLink
                          ? (node.url || 'Web Link')
                          : 'Card'}
                      </span>
                    </div>

                    {/* Open note / canvas / media button */}
                    {node.type === 'file' && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (referencedFile && !isImage && !isPdf && !isAudio && !isVideo) {
                            onNavigateFile(referencedFile.path);
                          } else if (node.file) {
                            window.open(`/api/vault/raw?path=${encodeURIComponent(node.file)}`, '_blank');
                          }
                        }}
                        title={isCanvasFile ? 'Open Canvas' : 'Open in New Tab'}
                        className="p-1 rounded text-zinc-500 hover:text-purple-300 hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Card Content with rich rendered typography & media */}
              {!isGroup && (
                <div className="flex-1 overflow-y-auto text-xs text-zinc-300 leading-relaxed select-text font-sans pr-1">
                  {isCanvasFile ? (
                    referencedFile ? (
                      <SubCanvasMiniViewport
                        canvasFile={referencedFile}
                        onOpen={() => onNavigateFile(referencedFile.path)}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-500 italic p-3 text-center">
                        Canvas file not found: {node.file}
                      </div>
                    )
                  ) : node.type === 'file' ? (() => {
                    const fileExt = (node.file?.split('.').pop() || '').toLowerCase();
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(fileExt);
                    const isPdf = fileExt === 'pdf';
                    const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(fileExt);
                    const isVideo = ['mp4', 'webm', 'ogv', 'mov'].includes(fileExt);

                    if (isImage) {
                      return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-black/40 rounded-lg overflow-hidden group/img relative">
                          <img
                            src={`/api/vault/raw?path=${encodeURIComponent(node.file || '')}`}
                            alt={node.file || 'Image'}
                            className="max-w-full max-h-full object-contain rounded select-none pointer-events-none transition-transform duration-200 group-hover/img:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-zinc-300 font-mono">
                            {node.file?.split('/').pop()}
                          </div>
                        </div>
                      );
                    }

                    if (isPdf) {
                      return (
                        <div className="w-full h-full flex flex-col bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                          <iframe
                            src={`/api/vault/raw?path=${encodeURIComponent(node.file || '')}#toolbar=0`}
                            title={node.file || 'PDF Document'}
                            className="w-full h-full border-0 pointer-events-auto"
                          />
                        </div>
                      );
                    }

                    if (isAudio) {
                      return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-900/90 rounded-lg border border-zinc-800">
                          <Volume2 className="w-8 h-8 text-purple-400 mb-2" />
                          <span className="text-[11px] text-zinc-300 font-medium mb-3 truncate max-w-full px-2">
                            {node.file?.split('/').pop()}
                          </span>
                          <audio
                            controls
                            src={`/api/vault/raw?path=${encodeURIComponent(node.file || '')}`}
                            className="w-full max-w-[260px] h-8"
                          />
                        </div>
                      );
                    }

                    if (isVideo) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
                          <video
                            controls
                            src={`/api/vault/raw?path=${encodeURIComponent(node.file || '')}`}
                            className="max-w-full max-h-full"
                          />
                        </div>
                      );
                    }

                    if (referencedFile) {
                      return (
                        <div className="prose prose-invert prose-xs leading-relaxed space-y-1.5">
                          {(referencedFile.content || '')
                            .slice(0, 500)
                            .replace(/^---[\s\S]*?---/, '')
                            .split('\n')
                            .filter(Boolean)
                            .slice(0, 8)
                            .map((line, idx) => {
                              if (line.startsWith('#')) {
                                return <h4 key={idx} className="font-bold text-zinc-200 text-xs mt-1">{line.replace(/^#+\s*/, '')}</h4>;
                              }
                              if (line.startsWith('- ') || line.startsWith('* ')) {
                                return (
                                  <div key={idx} className="flex items-start gap-1.5 pl-1 text-[11.5px] text-zinc-300">
                                    <span className="text-zinc-500">•</span>
                                    <span>{line.replace(/^[-*]\s*/, '')}</span>
                                  </div>
                                );
                              }
                              return <p key={idx} className="text-[11.5px] text-zinc-400">{line}</p>;
                            })}
                        </div>
                      );
                    }

                    return (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 italic text-xs">
                        <FileText className="w-8 h-8 opacity-40 mb-1" />
                        <span>{node.file}</span>
                        <span className="text-[10px] text-zinc-600 mt-1">File not found in vault</span>
                      </div>
                    );
                  })() : isLink ? (
                    <div className="h-full flex flex-col justify-between p-2 bg-black/20 rounded-xl border border-cyan-500/20">
                      <div className="truncate text-cyan-300 font-mono text-[11px]">{node.url}</div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (node.url) window.open(node.url, '_blank');
                        }}
                        className="py-1 px-2 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Visit Link</span>
                      </button>
                    </div>
                  ) : (
                    editingNodeId === node.id ? (
                      <textarea
                        autoFocus
                        value={node.text || ''}
                        onChange={e => {
                          const newText = e.target.value;
                          setCanvasData(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === node.id ? { ...n, text: newText } : n)
                          }));
                        }}
                        onBlur={() => {
                          setEditingNodeId(null);
                          persistCanvas(canvasData);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setEditingNodeId(null);
                            persistCanvas(canvasData);
                          }
                        }}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-[#111113] font-sans text-xs leading-relaxed selection:bg-zinc-200 selection:text-zinc-900 p-1"
                        placeholder="Enter card markdown..."
                      />
                    ) : (
                      <div
                        onDoubleClick={e => {
                          e.stopPropagation();
                          setEditingNodeId(node.id);
                        }}
                        title="Double-click to edit card"
                        className="w-full h-full overflow-y-auto cursor-text text-[#111113] select-text font-sans p-1 hover:bg-black/[0.02] rounded-lg transition-colors"
                      >
                        {renderCanvasMarkdown(node.text || 'Double-click to edit this card in markdown.', onNavigateFile)}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Card Connection Ports (Top, Right, Bottom, Left) */}
              {showPorts && (
                <>
                  {SIDES.map(side => {
                    const isHoveredTarget = hoveredPort?.nodeId === node.id && hoveredPort?.side === side;
                    const isSourcePort = connectingState?.fromNodeId === node.id && connectingState?.fromSide === side;

                    let posClass = '';
                    if (side === 'top') posClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
                    else if (side === 'right') posClass = 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2';
                    else if (side === 'bottom') posClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
                    else if (side === 'left') posClass = 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2';

                    return (
                      <div
                        key={side}
                        style={
                          isHoveredTarget || isSourcePort
                            ? { backgroundColor: cardHex || '#a855f7', borderColor: '#ffffff' }
                            : { borderColor: cardHex || '#a855f7' }
                        }
                        className={`canvas-port absolute ${posClass} w-3.5 h-3.5 rounded-full z-30 transition-transform cursor-crosshair flex items-center justify-center ${
                          isHoveredTarget
                            ? 'scale-150 border-2 ring-4 ring-purple-500/50'
                            : isSourcePort
                            ? 'scale-125 border-2 ring-2 ring-purple-400'
                            : 'bg-zinc-800 border-2 hover:scale-125 shadow-lg'
                        }`}
                        onMouseDown={e => handleStartConnection(node.id, side, e)}
                        onMouseEnter={() => {
                          if (connectingState && connectingState.fromNodeId !== node.id) {
                            setHoveredPort({ nodeId: node.id, side });
                          }
                        }}
                        onMouseLeave={() => {
                          if (hoveredPort?.nodeId === node.id && hoveredPort?.side === side) {
                            setHoveredPort(null);
                          }
                        }}
                        title={`Drag to connect from ${side}`}
                      >
                        <div className="w-1 h-1 rounded-full bg-white pointer-events-none" />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Interactive Resizer Handles (Obsidian canvas-node-resizer) */}
              {isSelected && (
                <>
                  <div
                    onMouseDown={e => startResizeNode(node, 'bottom-right', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-2 border-white rounded-full cursor-se-resize z-40 hover:scale-125 shadow-md transition-transform"
                    title="Resize Card"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'bottom-left', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-2 border-white rounded-full cursor-sw-resize z-40 hover:scale-125 shadow-md transition-transform"
                    title="Resize Card"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'top-right', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-2 border-white rounded-full cursor-ne-resize z-40 hover:scale-125 shadow-md transition-transform"
                    title="Resize Card"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'top-left', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-2 border-white rounded-full cursor-nw-resize z-40 hover:scale-125 shadow-md transition-transform"
                    title="Resize Card"
                  />

                  <div
                    onMouseDown={e => startResizeNode(node, 'right', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute top-1/4 bottom-1/4 -right-1 w-2 cursor-e-resize z-30 opacity-0 hover:opacity-50 rounded"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'bottom', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -bottom-1 left-1/4 right-1/4 h-2 cursor-s-resize z-30 opacity-0 hover:opacity-50 rounded"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'left', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute top-1/4 bottom-1/4 -left-1 w-2 cursor-w-resize z-30 opacity-0 hover:opacity-50 rounded"
                  />
                  <div
                    onMouseDown={e => startResizeNode(node, 'top', e)}
                    style={{ backgroundColor: cardHex || '#a855f7' }}
                    className="canvas-resizer-handle absolute -top-1 left-1/4 right-1/4 h-2 cursor-n-resize z-30 opacity-0 hover:opacity-50 rounded"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
