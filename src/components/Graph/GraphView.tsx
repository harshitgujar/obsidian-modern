import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { GraphData, GraphNode, GraphEdge } from '../../types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sliders, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Layers, 
  Eye, 
  Compass, 
  Sparkles,
  Maximize2,
  X,
  Play,
  Pause,
  RotateCw,
  Columns,
  Share2,
  Filter,
  Palette
} from 'lucide-react';

export interface GraphSettings {
  search: string;
  showTags: boolean;
  showAttachments: boolean;
  hideUnresolved: boolean;
  showOrphans: boolean;
  showArrow: boolean;
  textFadeMultiplier: number; // 0.5 to 2.0
  nodeSizeMultiplier: number; // 0.5 to 2.2
  lineSizeMultiplier: number; // 0.5 to 2.5
  centerStrength: number; // 0.005 to 0.06
  repelStrength: number; // 200 to 2500
  linkStrength: number; // 0.2 to 2.0
  linkDistance: number; // 60 to 300
  colorGroups: Array<{ query: string; color: string }>;
  localJumps?: number; // 1 to 3
}

interface GraphViewProps {
  data: GraphData;
  activeFileId?: string;
  onSelectNode: (fileId: string) => void;
  isMini?: boolean;
  initialSettings?: Partial<GraphSettings>;
  onSettingsChange?: (settings: GraphSettings) => void;
  onClose?: () => void;
  onSplitRight?: (filePath?: string) => void;
}

const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  search: '',
  showTags: true,
  showAttachments: false,
  hideUnresolved: false,
  showOrphans: true,
  showArrow: true,
  textFadeMultiplier: 1.0,
  nodeSizeMultiplier: 1.0,
  lineSizeMultiplier: 1.0,
  centerStrength: 0.015,
  repelStrength: 1400,
  linkStrength: 0.8,
  linkDistance: 210,
  colorGroups: [
    { query: 'path:Formatting', color: '#a855f7' },
    { query: 'path:Guides', color: '#10b981' },
    { query: 'path:Adventurer', color: '#f59e0b' },
    { query: 'path:Templates', color: '#06b6d4' },
    { query: 'path:Daily', color: '#ec4899' }
  ],
  localJumps: 1
};

export const GraphView: React.FC<GraphViewProps> = ({
  data,
  activeFileId,
  onSelectNode,
  isMini = false,
  initialSettings,
  onSettingsChange,
  onClose,
  onSplitRight
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Settings State
  const [settings, setSettings] = useState<GraphSettings>({
    ...DEFAULT_GRAPH_SETTINGS,
    ...initialSettings
  });

  // UI state
  const [showControls, setShowControls] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    filters: false,
    groups: false,
    display: true,
    forces: true
  });
  const [newGroupQuery, setNewGroupQuery] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#8b5cf6');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Viewport transformation
  const [transform, setTransform] = useState({ x: 0, y: 0, k: isMini ? 0.75 : 1.0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    node: GraphNode;
    clientX: number;
    clientY: number;
    inCount: number;
    outCount: number;
  } | null>(null);

  // Time-lapse Animation state
  const [isTimelapseRunning, setIsTimelapseRunning] = useState(false);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const connectingEdgesRef = useRef<Map<string, { startTime: number; source: string; target: string }>>(new Map());
  const bloomNodesRef = useRef<Map<string, number>>(new Map());

  // Simulation physics state
  const simNodesRef = useRef<GraphNode[]>([]);
  const simEdgesRef = useRef<GraphEdge[]>([]);
  const draggingNodeRef = useRef<GraphNode | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const alphaRef = useRef(1.0);

  // Update setting helper
  const updateSetting = useCallback(<K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (onSettingsChange) onSettingsChange(next);
      return next;
    });
    // Reheat physics if forces change
    if (['centerStrength', 'repelStrength', 'linkStrength', 'linkDistance'].includes(key as string)) {
      alphaRef.current = Math.max(alphaRef.current, 0.45);
    }
  }, [onSettingsChange]);

  // Filter nodes & edges based on Local Graph, search, tags, attachments, unresolved, orphans
  const filteredData = useMemo(() => {
    let nodes = data.nodes;
    let edges = data.edges;

    // 1. Local Graph N-jump filter
    if (isMini && activeFileId) {
      const jumps = settings.localJumps || 1;
      let currentHop = new Set<string>([activeFileId]);
      const visited = new Set<string>([activeFileId]);

      for (let j = 0; j < jumps; j++) {
        const nextHop = new Set<string>();
        for (const id of currentHop) {
          edges.forEach(e => {
            if (e.source === id && !visited.has(e.target)) nextHop.add(e.target);
            if (e.target === id && !visited.has(e.source)) nextHop.add(e.source);
          });
        }
        nextHop.forEach(id => visited.add(id));
        currentHop = nextHop;
      }

      nodes = nodes.filter(n => visited.has(n.id));
      edges = edges.filter(e => visited.has(e.source) && visited.has(e.target));
    }

    // 2. Hide tags if disabled
    if (!settings.showTags) {
      nodes = nodes.filter(n => n.nodeType !== 'tag');
      const validIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    }

    // 3. Hide attachments if disabled
    if (!settings.showAttachments) {
      nodes = nodes.filter(n => n.nodeType !== 'attachment');
      const validIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    }

    // 4. Hide unresolved if enabled
    if (settings.hideUnresolved) {
      nodes = nodes.filter(n => n.nodeType !== 'unresolved');
      const validIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    }

    // 5. Hide orphans if disabled
    if (!settings.showOrphans) {
      const connected = new Set<string>();
      edges.forEach(e => {
        connected.add(e.source);
        connected.add(e.target);
      });
      nodes = nodes.filter(n => connected.has(n.id));
    }

    // 6. Search query
    if (settings.search.trim()) {
      const q = settings.search.trim().toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
      const validIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    }

    return { nodes, edges };
  }, [data, isMini, activeFileId, settings]);

  // Synchronize simulation nodes without resetting coordinates; initialize new nodes smoothly
  useEffect(() => {
    // In Local Graph (isMini), pin focal active note at center (0, 0) and place neighbors radially at distance 135
    if (isMini && activeFileId) {
      const neighborNodes = filteredData.nodes.filter(n => n.id !== activeFileId);
      const k = neighborNodes.length || 1;
      simNodesRef.current = filteredData.nodes.map(n => {
        if (n.id === activeFileId) {
          return { ...n, x: 0, y: 0, vx: 0, vy: 0 };
        }
        const idx = neighborNodes.findIndex(nb => nb.id === n.id);
        const angle = (idx / k) * Math.PI * 2 - Math.PI / 2;
        const radius = 135;
        return {
          ...n,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        };
      });
      simEdgesRef.current = filteredData.edges;
      alphaRef.current = 0.5;
      return;
    }

    const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    const totalNodes = filteredData.nodes.length || 1;

    // Order nodes so hubs / central connected notes appear progressively during animation
    const sortedNodes = [...filteredData.nodes].sort((a, b) => (b.val || 1) - (a.val || 1));

    simNodesRef.current = sortedNodes.map((n, i) => {
      const existing = existingMap.get(n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
      }
      // Gentle radial blossom initialization for newly introduced nodes
      const angle = (i / totalNodes) * Math.PI * 2;
      const radius = 90 + Math.sqrt(i) * 45;
      return {
        ...n,
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 12,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      };
    });
    simEdgesRef.current = filteredData.edges;

    // Default to showing all nodes when not playing timelapse
    if (!isTimelapseRunning) {
      setAnimProgress(sortedNodes.length);
    }
    alphaRef.current = Math.max(alphaRef.current, 0.7);
  }, [filteredData, isMini, activeFileId]);

  // Time-lapse progression loop: reveals nodes progressively and animates connecting links
  useEffect(() => {
    if (!isTimelapseRunning) return;

    const total = simNodesRef.current.length;
    if (total <= 1) {
      setIsTimelapseRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setAnimProgress(prev => {
        const next = prev + 1;
        if (next > total) {
          setIsTimelapseRunning(false);
          return total;
        }

        const nextNode = simNodesRef.current[next - 1];
        if (nextNode) {
          const now = performance.now();
          bloomNodesRef.current.set(nextNode.id, now);

          // Find if nextNode connects to any already-revealed nodes
          const revealedIds = new Set(simNodesRef.current.slice(0, next - 1).map(n => n.id));
          const connectedEdge = simEdgesRef.current.find(e =>
            (e.source === nextNode.id && revealedIds.has(e.target)) ||
            (e.target === nextNode.id && revealedIds.has(e.source))
          );

          if (connectedEdge) {
            const partnerId = connectedEdge.source === nextNode.id ? connectedEdge.target : connectedEdge.source;
            const partner = simNodesRef.current.find(n => n.id === partnerId);
            if (partner) {
              const angle = Math.random() * Math.PI * 2;
              const spawnDist = 65 + Math.random() * 30;
              nextNode.x = partner.x + Math.cos(angle) * spawnDist;
              nextNode.y = partner.y + Math.sin(angle) * spawnDist;
              nextNode.vx = Math.cos(angle) * 2.5;
              nextNode.vy = Math.sin(angle) * 2.5;
            }
          }

          // Register new connecting edges for animated link drawing & spark tracer
          simEdgesRef.current.forEach(e => {
            if (
              (e.source === nextNode.id && revealedIds.has(e.target)) ||
              (e.target === nextNode.id && revealedIds.has(e.source))
            ) {
              connectingEdgesRef.current.set(`${e.source}->${e.target}`, {
                startTime: now,
                source: e.source,
                target: e.target
              });
            }
          });
        }

        // Reheat simulation smoothly on each node revelation
        alphaRef.current = Math.max(alphaRef.current, 0.55);
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isTimelapseRunning]);

  // Obsidian Force Simulation Tick (with scaled center force & collision avoidance)
  const stepSimulation = useCallback(() => {
    if (alphaRef.current < 0.001) return;

    const allNodes = simNodesRef.current;
    if (allNodes.length === 0) return;

    // Only simulate visible nodes during timelapse progression
    const nodes = isTimelapseRunning && animProgress > 0
      ? allNodes.slice(0, animProgress)
      : allNodes;

    const visibleNodeIds = new Set(nodes.map(n => n.id));
    const edges = isTimelapseRunning && animProgress > 0
      ? simEdgesRef.current.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      : simEdgesRef.current;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const currentAlpha = alphaRef.current;
    const repulsion = settings.repelStrength * currentAlpha;
    // CRITICAL: scale center force by currentAlpha so it naturally decays to 0 at equilibrium!
    const center = settings.centerStrength * 0.012 * currentAlpha;
    const friction = 0.74; // Obsidian velocity decay ~0.6-0.75 for smooth stabilization

    // 1. Repulsion between all nodes + Obsidian collision avoidance
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        if (dist < 650) {
          const force = (repulsion / (dist + 30)) * 0.16;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }

        // Obsidian collision avoidance force (sim.js k: radius 52, strength 0.45)
        const r1 = Math.max(6, (n1.val || 1) * 2.8 * settings.nodeSizeMultiplier);
        const r2 = Math.max(6, (n2.val || 1) * 2.8 * settings.nodeSizeMultiplier);
        const minDist = r1 + r2 + (isMini ? 35 : 52);
        if (dist < minDist && dist > 0.001) {
          const push = ((minDist - dist) / dist) * 0.45 * currentAlpha;
          const px = dx * push;
          const py = dy * push;
          n1.vx -= px;
          n1.vy -= py;
          n2.vx += px;
          n2.vy += py;
        }
      }
    }

    // 2. Link Spring attraction
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = isMini ? 120 : settings.linkDistance;
      const delta = dist - targetDist;
      const force = delta * 0.025 * settings.linkStrength * currentAlpha;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // 3. Center gravity and velocity integration
    for (const node of nodes) {
      if (isMini && activeFileId && node.id === activeFileId) {
        node.x = 0;
        node.y = 0;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      if (draggingNodeRef.current && draggingNodeRef.current.id === node.id) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      node.vx -= node.x * center;
      node.vy -= node.y * center;

      node.vx *= friction;
      node.vy *= friction;

      node.x += node.vx;
      node.y += node.vy;
    }

    alphaRef.current *= 0.993;
  }, [settings, isMini, activeFileId, isTimelapseRunning, animProgress]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      stepSimulation();

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Camera Viewport
      ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
      ctx.scale(transform.k, transform.k);

      // 1. Draw subtle Obsidian Dot Grid
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (!isMini) {
        const gridSize = 40;
        const left = (-width / 2 - transform.x) / transform.k;
        const right = (width / 2 - transform.x) / transform.k;
        const top = (-height / 2 - transform.y) / transform.k;
        const bottom = (height / 2 - transform.y) / transform.k;

        const startX = Math.floor(left / gridSize) * gridSize;
        const endX = Math.ceil(right / gridSize) * gridSize;
        const startY = Math.floor(top / gridSize) * gridSize;
        const endY = Math.ceil(bottom / gridSize) * gridSize;

        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.035)';
        const dotRadius = Math.max(0.6, 1.2 / transform.k);
        for (let gx = startX; gx <= endX; gx += gridSize) {
          for (let gy = startY; gy <= endY; gy += gridSize) {
            ctx.beginPath();
            ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const allNodes = simNodesRef.current;
      const nodes = isTimelapseRunning && animProgress > 0
        ? allNodes.slice(0, animProgress)
        : allNodes;
      const visibleNodeIds = new Set(nodes.map(n => n.id));
      const edges = isTimelapseRunning && animProgress > 0
        ? simEdgesRef.current.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        : simEdgesRef.current;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Determine active / hovered highlight neighborhood
      const activeOrHovered = hoveredNodeId || (isMini ? activeFileId : null);
      const highlightNeighbors = new Set<string>();
      if (activeOrHovered) {
        highlightNeighbors.add(activeOrHovered);
        edges.forEach(e => {
          if (e.source === activeOrHovered) highlightNeighbors.add(e.target);
          if (e.target === activeOrHovered) highlightNeighbors.add(e.source);
        });
      }

      const now = performance.now();

      // 2. Draw Edges (with animated connecting line progression, electric tracer pulse, directed arrowheads)
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const edgeKey = `${edge.source}->${edge.target}`;
        const reverseKey = `${edge.target}->${edge.source}`;
        const connectingInfo = connectingEdgesRef.current.get(edgeKey) || connectingEdgesRef.current.get(reverseKey);

        let lineT = 1.0;
        let isConnectingNow = false;

        if (connectingInfo) {
          const elapsed = now - connectingInfo.startTime;
          lineT = Math.min(1.0, elapsed / 360);
          isConnectingNow = elapsed < 550;
          if (elapsed > 750) {
            connectingEdgesRef.current.delete(edgeKey);
            connectingEdgesRef.current.delete(reverseKey);
          }
        }

        const currentTargetX = s.x + (t.x - s.x) * lineT;
        const currentTargetY = s.y + (t.y - s.y) * lineT;

        const isSourceOfHovered = activeOrHovered && edge.source === activeOrHovered;
        const isTargetOfHovered = activeOrHovered && edge.target === activeOrHovered;
        const baseEdgeWidth = Math.max(0.6, 1.2 * settings.lineSizeMultiplier) / transform.k;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(currentTargetX, currentTargetY);

        if (isConnectingNow) {
          // Glowing electric purple connection line actively forming
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = baseEdgeWidth * 2.8;
          ctx.globalAlpha = 1.0;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 12 / transform.k;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Electric spark bead traveling along the line to target node
          ctx.beginPath();
          ctx.arc(currentTargetX, currentTargetY, 3.5 / transform.k, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#e9d5ff';
          ctx.shadowBlur = 8 / transform.k;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (isSourceOfHovered) {
          // Outgoing edge: vibrant purple
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = baseEdgeWidth * 2.2;
          ctx.globalAlpha = 0.95;
          ctx.stroke();
        } else if (isTargetOfHovered) {
          // Incoming edge: cyan
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = baseEdgeWidth * 2.2;
          ctx.globalAlpha = 0.95;
          ctx.stroke();
        } else if (activeOrHovered) {
          // Dimmed non-connected edge
          ctx.strokeStyle = isLight ? '#d4d4d8' : '#3f3f46';
          ctx.lineWidth = baseEdgeWidth * 0.5;
          ctx.globalAlpha = 0.05;
          ctx.stroke();
        } else {
          // Resting state edge
          ctx.strokeStyle = isLight ? '#a1a1aa' : '#71717a';
          ctx.lineWidth = baseEdgeWidth;
          ctx.globalAlpha = isLight ? 0.35 : 0.22;
          ctx.stroke();
        }

        // Draw Arrowhead pointing from s to t (only when connection line has finished drawing)
        if (settings.showArrow && !isMini && lineT >= 0.95) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 18) {
            const angle = Math.atan2(dy, dx);
            const tRadius = Math.max(4, (t.val || 1) * 3 * settings.nodeSizeMultiplier);
            const arrowDist = Math.max(0, dist - tRadius - 4);
            const ax = s.x + Math.cos(angle) * arrowDist;
            const ay = s.y + Math.sin(angle) * arrowDist;
            const arrowLen = Math.max(4, Math.min(10, 7 / transform.k));

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
              ax - arrowLen * Math.cos(angle - Math.PI / 6),
              ay - arrowLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              ax - arrowLen * Math.cos(angle + Math.PI / 6),
              ay - arrowLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = isSourceOfHovered
              ? '#a855f7'
              : isTargetOfHovered
              ? '#38bdf8'
              : activeOrHovered
              ? (isLight ? 'rgba(200, 200, 210, 0.2)' : 'rgba(113, 113, 122, 0.1)')
              : (isLight ? 'rgba(100, 100, 115, 0.4)' : 'rgba(161, 161, 170, 0.45)');
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;

      // Pass 2: Draw all Node Shapes, glow rings, bloom ripples, and borders
      for (const node of nodes) {
        const isTarget = node.id === activeOrHovered;
        const isNeighbor = highlightNeighbors.has(node.id);
        const isDimmed = activeOrHovered && !isNeighbor;
        const baseRadius = Math.max(4, Math.min(22, (4 + Math.sqrt(node.val || 1) * 2.8) * settings.nodeSizeMultiplier));

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.14 : 1;

        // Expanding bloom ripple for newly born node during timelapse
        const bloomTime = bloomNodesRef.current.get(node.id);
        if (bloomTime) {
          const bloomAge = (now - bloomTime) / 450;
          if (bloomAge < 1.0) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius + (22 * bloomAge) / transform.k, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(192, 132, 252, ${Math.max(0, 1 - bloomAge)})`;
            ctx.lineWidth = 2 / transform.k;
            ctx.stroke();
          } else {
            bloomNodesRef.current.delete(node.id);
          }
        }

        // Double-ring glowing aura for focused or hovered node
        if (isTarget) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseRadius + 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, baseRadius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.8 / transform.k;
          ctx.stroke();
        }

        // Draw node shape
        ctx.beginPath();
        if (node.nodeType === 'tag') {
          const r = baseRadius * 1.05;
          ctx.moveTo(node.x, node.y - r);
          ctx.lineTo(node.x + r, node.y);
          ctx.lineTo(node.x, node.y + r);
          ctx.lineTo(node.x - r, node.y);
          ctx.closePath();
        } else {
          ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2);
        }

        ctx.fillStyle = node.color || '#8b5cf6';
        ctx.fill();

        // Node border
        ctx.lineWidth = 1.4 / transform.k;
        if (node.nodeType === 'unresolved') {
          ctx.setLineDash([3 / transform.k, 2 / transform.k]);
          ctx.strokeStyle = '#94a3b8';
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = isTarget ? '#ffffff' : 'rgba(18, 18, 22, 0.9)';
        }
        ctx.stroke();
        ctx.restore();
      }

      // Pass 3: Draw all Labels & Pills ON TOP of all nodes and links (breathable, no overlaps)
      for (const node of nodes) {
        const isTarget = node.id === activeOrHovered;
        const isNeighbor = highlightNeighbors.has(node.id);
        const isDimmed = activeOrHovered && !isNeighbor;
        const baseRadius = Math.max(4, Math.min(22, (4 + Math.sqrt(node.val || 1) * 2.8) * settings.nodeSizeMultiplier));

        const threshold = settings.textFadeMultiplier;
        const showLabel = isMini
          ? (isTarget || isNeighbor)
          : (
              isTarget ||
              isNeighbor ||
              (transform.k >= 1.2 / threshold) ||
              (node.val >= 8 && transform.k >= 0.85 / threshold)
            );

        if (!showLabel) continue;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.18 : 1;

        const labelText = node.label.replace(/\.md$/, '');
        const fontSize = Math.max(10, Math.min(14, 11 / transform.k));
        ctx.font = `${isTarget ? '600' : '400'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize + 4;
        const padding = 5 / transform.k;

        // In Local Graph (isMini), radiate labels outward to prevent collision
        let pillY = node.y + baseRadius + 3;
        if (isMini && node.id !== activeFileId && node.y < -15) {
          pillY = node.y - baseRadius - textHeight - 4;
        }

        const pillX = node.x - textWidth / 2 - padding;
        const pillW = textWidth + padding * 2;
        const pillH = textHeight;
        const pillR = 3 / transform.k;

        // Translucent Pill Background
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
        ctx.fillStyle = isLight
          ? (isTarget ? 'rgba(255, 255, 255, 0.98)' : 'rgba(240, 240, 243, 0.92)')
          : (isTarget ? 'rgba(15, 15, 20, 0.95)' : 'rgba(24, 24, 28, 0.88)');
        ctx.fill();

        if (isTarget) {
          ctx.strokeStyle = isLight ? 'rgba(124, 58, 237, 0.5)' : 'rgba(168, 85, 247, 0.6)';
          ctx.lineWidth = 1 / transform.k;
          ctx.stroke();
        }

        // Label Text
        ctx.fillStyle = isLight
          ? (isTarget ? '#09090b' : (isDimmed ? '#a1a1aa' : '#18181b'))
          : (isTarget ? '#ffffff' : (isDimmed ? '#71717a' : '#e4e4e7'));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, pillY + pillH / 2);

        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stepSimulation, transform, hoveredNodeId, activeFileId, isMini, settings, isTimelapseRunning, animProgress]);

  // Pointer interactions
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const x = (clientX - width / 2 - transform.x) / transform.k;
    const y = (clientY - height / 2 - transform.y) / transform.k;
    return { x, y };
  };

  const findNodeAt = (x: number, y: number): GraphNode | null => {
    const allNodes = simNodesRef.current;
    const nodes = isTimelapseRunning && animProgress > 0
      ? allNodes.slice(0, animProgress)
      : allNodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = Math.max(4, Math.min(22, (4 + Math.sqrt(n.val || 1) * 2.8) * settings.nodeSizeMultiplier)) + 6;
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= r * r) {
        return n;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clicked = findNodeAt(coords.x, coords.y);
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

    if (clicked) {
      draggingNodeRef.current = clicked;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (draggingNodeRef.current) {
      draggingNodeRef.current.x = coords.x;
      draggingNodeRef.current.y = coords.y;
      alphaRef.current = Math.max(alphaRef.current, 0.25);
      return;
    }

    if (isPanningRef.current) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      }));
      return;
    }

    const hovered = findNodeAt(coords.x, coords.y);
    setHoveredNodeId(hovered ? hovered.id : null);

    if (hovered && !isMini) {
      const edges = simEdgesRef.current;
      const outCount = edges.filter(ed => ed.source === hovered.id).length;
      const inCount = edges.filter(ed => ed.target === hovered.id).length;
      setHoverInfo({
        node: hovered,
        clientX: e.clientX,
        clientY: e.clientY,
        inCount,
        outCount
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clicked = findNodeAt(coords.x, coords.y);

    // Only trigger navigation if the mouse did not move significantly (click vs drag)
    const distMoved = Math.hypot(
      e.clientX - mouseDownPosRef.current.x,
      e.clientY - mouseDownPosRef.current.y
    );

    if (clicked && distMoved < 6) {
      if ((e.metaKey || e.ctrlKey) && onSplitRight) {
        onSplitRight(clicked.nodeType === 'file' ? clicked.path : clicked.label);
      } else {
        if (clicked.nodeType === 'file') {
          onSelectNode(clicked.path);
        } else if (clicked.nodeType === 'unresolved') {
          onSelectNode(clicked.label);
        }
      }
    }

    draggingNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.15, Math.min(4.5, prev.k * zoomFactor))
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, k: isMini ? 0.75 : 1.0 });
    alphaRef.current = 1.0;
  };

  const handleReheatSimulation = () => {
    alphaRef.current = 1.0;
  };

  const handleToggleTimelapse = () => {
    if (isTimelapseRunning) {
      setIsTimelapseRunning(false);
    } else {
      const total = simNodesRef.current.length;
      if (total <= 1) return;

      connectingEdgesRef.current.clear();
      bloomNodesRef.current.clear();

      // If at completion or reset, start fresh from 1
      if (animProgress >= total || animProgress <= 1) {
        setAnimProgress(1);
        const firstNode = simNodesRef.current[0];
        if (firstNode) {
          bloomNodesRef.current.set(firstNode.id, performance.now());
          firstNode.x = 0;
          firstNode.y = 0;
        }
      }
      setIsTimelapseRunning(true);
      alphaRef.current = 0.85;
    }
  };

  const handleResetTimelapse = () => {
    setIsTimelapseRunning(false);
    connectingEdgesRef.current.clear();
    bloomNodesRef.current.clear();
    setAnimProgress(simNodesRef.current.length);
    alphaRef.current = 0.6;
  };

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupQuery.trim()) {
      const nextGroups = [...settings.colorGroups, { query: newGroupQuery.trim(), color: newGroupColor }];
      updateSetting('colorGroups', nextGroups);
      setNewGroupQuery('');
      setIsAddingGroup(false);
    }
  };

  const handleRemoveGroup = (idx: number) => {
    const nextGroups = settings.colorGroups.filter((_, i) => i !== idx);
    updateSetting('colorGroups', nextGroups);
  };

  return (
    <div className={`relative w-full h-full bg-[#141417] overflow-hidden select-none ${isMini ? 'rounded-lg border border-zinc-800' : ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top Left Search Input Bar & Animated Timelapse Controls */}
      {!isMini && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={settings.search}
              onChange={e => updateSetting('search', e.target.value)}
              placeholder="Search graph..."
              className="graph-control-input bg-zinc-900/90 text-xs text-zinc-200 pl-8 pr-6 py-1.5 rounded-lg border border-zinc-700/60 focus:border-purple-500 focus:outline-none w-48 backdrop-blur-md shadow-lg"
            />
            {settings.search && (
              <button
                onClick={() => updateSetting('search', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Time-lapse Play / Pause button */}
          <button
            onClick={handleToggleTimelapse}
            title={isTimelapseRunning ? 'Pause Animation' : 'Animate Graph Evolution'}
            className={`graph-control-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-none backdrop-blur-md shadow-lg transition-all ${
              isTimelapseRunning
                ? 'bg-[#705dcf] text-white'
                : 'bg-[#202028] hover:bg-[#282834] text-zinc-300 hover:text-white'
            }`}
          >
            {isTimelapseRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-purple-300 fill-purple-300" />
                <span>Pause ({animProgress}/{filteredData.nodes.length})</span>
              </>
            ) : animProgress < filteredData.nodes.length && animProgress > 1 ? (
              <>
                <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                <span>Resume ({animProgress}/{filteredData.nodes.length})</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                <span>{animProgress >= filteredData.nodes.length && animProgress > 1 ? 'Replay' : 'Animate'}</span>
              </>
            )}
          </button>

          {/* Show full graph if paused partway */}
          {animProgress < filteredData.nodes.length && animProgress > 1 && !isTimelapseRunning && (
            <button
              onClick={handleResetTimelapse}
              title="Show Full Graph"
              className="graph-control-btn p-1.5 rounded-lg bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 backdrop-blur-md text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reheat Simulation Forces Button */}
          <button
            onClick={handleReheatSimulation}
            title="Reheat Simulation Forces"
            className="graph-control-btn p-1.5 rounded-lg bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 backdrop-blur-md text-xs transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Right Action Strip: Split, Settings, Close */}
      {!isMini && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {onSplitRight && (
            <button
              onClick={() => onSplitRight()}
              title="Open Note to the Right (Split)"
              className="graph-control-btn p-2 rounded-lg bg-zinc-900/85 text-zinc-400 border border-zinc-700/60 hover:text-zinc-100 hover:bg-zinc-800 backdrop-blur-md shadow-lg transition-all"
            >
              <Columns className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowControls(prev => !prev)}
            title="Graph Settings"
            className={`graph-control-btn p-2 rounded-lg border-none backdrop-blur-md shadow-xl transition-all ${
              showControls
                ? 'bg-[#705dcf] text-white shadow-sm'
                : 'bg-[#202028] text-zinc-400 hover:text-white hover:bg-[#282834]'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Graph (Esc)"
              className="graph-control-btn p-2 rounded-lg bg-zinc-900/85 text-zinc-400 border border-zinc-700/60 hover:text-zinc-100 hover:bg-zinc-800 backdrop-blur-md shadow-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Real Obsidian .graph-controls Floating Drawer */}
      {showControls && !isMini && (
        <div className="graph-settings-drawer absolute top-12 right-3 z-30 w-64 max-h-[85vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl p-3.5 text-xs text-zinc-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-semibold text-zinc-100">
            <span>Graph Settings</span>
            <span className="text-[10px] text-zinc-500 font-normal">
              {filteredData.nodes.length} nodes · {filteredData.edges.length} links
            </span>
          </div>

          {/* Section 1: Filters */}
          <div className="space-y-2">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, filters: !s.filters }))}
              className="flex items-center justify-between font-semibold text-zinc-300 cursor-pointer hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-zinc-400">Filters</span>
              {collapsedSections.filters ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.filters && (
              <div className="space-y-2 pt-1 pl-1">
                <label className="flex items-center justify-between cursor-pointer text-zinc-300">
                  <span>Tags</span>
                  <input
                    type="checkbox"
                    checked={settings.showTags}
                    onChange={e => updateSetting('showTags', e.target.checked)}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-zinc-300">
                  <span>Attachments</span>
                  <input
                    type="checkbox"
                    checked={settings.showAttachments}
                    onChange={e => updateSetting('showAttachments', e.target.checked)}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-zinc-300">
                  <span>Existing files only</span>
                  <input
                    type="checkbox"
                    checked={settings.hideUnresolved}
                    onChange={e => updateSetting('hideUnresolved', e.target.checked)}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-zinc-300">
                  <span>Orphans</span>
                  <input
                    type="checkbox"
                    checked={settings.showOrphans}
                    onChange={e => updateSetting('showOrphans', e.target.checked)}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 2: Groups */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, groups: !s.groups }))}
              className="flex items-center justify-between font-semibold text-zinc-300 cursor-pointer hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-zinc-400">Groups</span>
              {collapsedSections.groups ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.groups && (
              <div className="space-y-2 pt-1 pl-1">
                {settings.colorGroups.map((group, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                      <span className="truncate text-[11px] font-mono text-zinc-300">{group.query}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {isAddingGroup ? (
                  <form onSubmit={handleAddGroupSubmit} className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={newGroupQuery}
                      onChange={e => setNewGroupQuery(e.target.value)}
                      placeholder="path:Guides or tag:daily"
                      autoFocus
                      className="w-full bg-zinc-950 border border-purple-500 rounded px-2 py-1 text-xs text-zinc-100 font-mono"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {['#a855f7', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#3b82f6'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewGroupColor(c)}
                            className={`w-4 h-4 rounded-full border ${newGroupColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="submit" className="px-2 py-0.5 rounded bg-purple-600 text-white text-[11px]">Add</button>
                        <button type="button" onClick={() => setIsAddingGroup(false)} className="text-zinc-500 text-[11px]">✕</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingGroup(true)}
                    className="w-full py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 text-purple-300 flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New group</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Display */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, display: !s.display }))}
              className="flex items-center justify-between font-semibold text-zinc-300 cursor-pointer hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-zinc-400">Display</span>
              {collapsedSections.display ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.display && (
              <div className="space-y-3 pt-1 pl-1">
                <label className="flex items-center justify-between cursor-pointer text-zinc-300">
                  <span>Arrows</span>
                  <input
                    type="checkbox"
                    checked={settings.showArrow}
                    onChange={e => updateSetting('showArrow', e.target.checked)}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Text fade threshold</span>
                    <span>{settings.textFadeMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.textFadeMultiplier}
                    onChange={e => updateSetting('textFadeMultiplier', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Node size</span>
                    <span>{settings.nodeSizeMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.2"
                    step="0.1"
                    value={settings.nodeSizeMultiplier}
                    onChange={e => updateSetting('nodeSizeMultiplier', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Link thickness</span>
                    <span>{settings.lineSizeMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.lineSizeMultiplier}
                    onChange={e => updateSetting('lineSizeMultiplier', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Forces */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, forces: !s.forces }))}
              className="flex items-center justify-between font-semibold text-zinc-300 cursor-pointer hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-zinc-400">Forces</span>
              {collapsedSections.forces ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.forces && (
              <div className="space-y-3 pt-1 pl-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Center force</span>
                    <span>{(settings.centerStrength * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.05"
                    step="0.005"
                    value={settings.centerStrength}
                    onChange={e => updateSetting('centerStrength', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Repel force</span>
                    <span>{settings.repelStrength}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="2500"
                    step="50"
                    value={settings.repelStrength}
                    onChange={e => updateSetting('repelStrength', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Link force</span>
                    <span>{settings.linkStrength.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={settings.linkStrength}
                    onChange={e => updateSetting('linkStrength', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Link distance</span>
                    <span>{settings.linkDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="300"
                    step="10"
                    value={settings.linkDistance}
                    onChange={e => updateSetting('linkDistance', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <button
                  onClick={() => setSettings(DEFAULT_GRAPH_SETTINGS)}
                  className="w-full py-1 text-center rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] mt-1"
                >
                  Restore default forces
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Obsidian Hover Tooltip Card */}
      {hoverInfo && !isMini && (
        <div
          className="fixed z-40 pointer-events-none bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-3 text-xs text-zinc-200 animate-in fade-in duration-75 space-y-1"
          style={{
            left: `${Math.min(window.innerWidth - 240, hoverInfo.clientX + 14)}px`,
            top: `${Math.min(window.innerHeight - 150, hoverInfo.clientY + 14)}px`
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoverInfo.node.color }} />
            <span className="truncate max-w-[180px]">{hoverInfo.node.label.replace(/\.md$/, '')}</span>
          </div>
          {hoverInfo.node.path && (
            <div className="text-[10px] text-zinc-500 font-mono truncate">
              {hoverInfo.node.path}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800 text-[11px]">
            <span className="text-purple-400 font-medium">{hoverInfo.outCount} outgoing</span>
            <span className="text-zinc-600">·</span>
            <span className="text-sky-400 font-medium">{hoverInfo.inCount} incoming</span>
          </div>
          {hoverInfo.node.tags && hoverInfo.node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {hoverInfo.node.tags.map(t => (
                <span key={t} className="text-[9px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-1 rounded">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="text-[9px] text-zinc-500 italic pt-0.5">
            Click to open · Ctrl+Click to split
          </div>
        </div>
      )}

      {/* Local Graph Depth / Jumps Slider in Mini Mode */}
      {isMini && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-700/60 rounded px-2 py-0.5 text-[10px] text-zinc-400">
          <span>Depth:</span>
          {[1, 2, 3].map(j => (
            <button
              key={j}
              onClick={() => updateSetting('localJumps', j)}
              className={`px-1 rounded font-bold transition-colors ${
                (settings.localJumps || 1) === j
                  ? 'bg-purple-600 text-white'
                  : 'hover:text-white'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      )}

      {/* Floating Zoom & Camera Controls */}
      <div className="graph-zoom-bar absolute bottom-3 right-3 flex items-center gap-1.5 z-10 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/60 rounded-lg p-1 shadow-lg">
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.min(4.5, t.k * 1.2) }))}
          className="graph-control-btn p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.max(0.15, t.k * 0.8) }))}
          className="graph-control-btn p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetView}
          className="graph-control-btn p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left Node Count */}
      <div className="absolute bottom-3 left-3 text-[11px] text-zinc-500 font-medium select-none pointer-events-none">
        {isTimelapseRunning || (animProgress < filteredData.nodes.length && animProgress > 0)
          ? `${animProgress} of ${filteredData.nodes.length} nodes`
          : `${filteredData.nodes.length} nodes`} · {simEdgesRef.current.length} links
      </div>
    </div>
  );
};
