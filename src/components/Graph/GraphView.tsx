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
  Palette,
  Boxes,
  Check
} from 'lucide-react';

export interface GraphSettings {
  search: string;
  showTags: boolean;
  showAttachments: boolean;
  hideUnresolved: boolean;
  showOrphans: boolean;
  showArrow: boolean;
  showExtractedEdges?: boolean;
  showInferredEdges: boolean;
  colorByCommunity: boolean;
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
  showExtractedEdges: true,
  showInferredEdges: true,
  colorByCommunity: false,
  textFadeMultiplier: 1.0,
  nodeSizeMultiplier: 1.0,
  lineSizeMultiplier: 1.0,
  centerStrength: 0.015,
  repelStrength: 1400,
  linkStrength: 0.8,
  linkDistance: 210,
  colorGroups: [
    { query: 'path:Formatting', color: '#2563eb' },
    { query: 'path:Guides', color: '#0284c7' },
    { query: 'path:Adventurer', color: '#6366f1' },
    { query: 'path:Templates', color: '#4f46e5' },
    { query: 'path:Daily', color: '#3b82f6' }
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
  const [newGroupColor, setNewGroupColor] = useState('#384cff');
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
  const [hoveredEdgeInfo, setHoveredEdgeInfo] = useState<{
    edge: GraphEdge;
    sourceNode: GraphNode;
    targetNode: GraphNode;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Subsystem Communities (Leiden) State
  const [activeCommunityId, setActiveCommunityId] = useState<number | null>(null);
  const [showCommunitiesDrawer, setShowCommunitiesDrawer] = useState(false);

  // Reactive Theme State (Dark vs Light)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const updateTheme = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
      setIsDark(dark);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

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

    // 5b. Dual-Edge Model filtering (Extracted vs Inferred AI edges)
    if (settings.showExtractedEdges === false) {
      edges = edges.filter(e => e.kind === 'inferred');
    }
    if (!settings.showInferredEdges) {
      edges = edges.filter(e => e.kind !== 'inferred');
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

  // Derived counts for dual-edge model
  const extractedEdgesCount = useMemo(() => {
    return filteredData.edges.filter(e => e.kind !== 'inferred').length;
  }, [filteredData.edges]);

  const inferredEdgesCount = useMemo(() => {
    return filteredData.edges.filter(e => e.kind === 'inferred').length;
  }, [filteredData.edges]);

  // Subsystem Communities grouping (Leiden clusters)
  const communities = useMemo(() => {
    const map = new Map<number, { id: number; name: string; color: string; nodes: GraphNode[] }>();
    filteredData.nodes.forEach(node => {
      const cId = node.communityId ?? 0;
      if (!map.has(cId)) {
        map.set(cId, {
          id: cId,
          name: node.communityName || `Subsystem #${cId + 1}`,
          color: node.communityColor || '#384cff',
          nodes: []
        });
      }
      map.get(cId)!.nodes.push(node);
    });
    return Array.from(map.values()).sort((a, b) => b.nodes.length - a.nodes.length);
  }, [filteredData.nodes]);

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

      // Explicitly paint base canvas background according to active theme
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? '#121214' : '#f4f4f6';
      ctx.fillRect(0, 0, width, height);

      // Camera Viewport
      ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
      ctx.scale(transform.k, transform.k);

      // 1. Draw subtle minimal skeuomorphic dot grid on background
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

        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)';
        const dotRadius = Math.max(0.7, 1.3 / transform.k);
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
        const isInferred = edge.kind === 'inferred';

        ctx.beginPath();
        if (isInferred) {
          ctx.setLineDash([4 / transform.k, 4 / transform.k]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(currentTargetX, currentTargetY);

        const isHoveredEdge = hoveredEdgeInfo && (
          (edge.source === hoveredEdgeInfo.edge.source && edge.target === hoveredEdgeInfo.edge.target) ||
          (edge.source === hoveredEdgeInfo.edge.target && edge.target === hoveredEdgeInfo.edge.source)
        );

        if (isHoveredEdge) {
          ctx.strokeStyle = isInferred ? '#c026d3' : '#384cff';
          ctx.lineWidth = baseEdgeWidth * 3.2;
          ctx.globalAlpha = 1.0;
          ctx.stroke();
        } else if (isConnectingNow) {
          // Minimal tactile connection line actively forming
          ctx.strokeStyle = isInferred ? '#a855f7' : '#384cff';
          ctx.lineWidth = baseEdgeWidth * 2.2;
          ctx.globalAlpha = 1.0;
          ctx.stroke();

          // Bead traveling along the line to target node
          ctx.beginPath();
          ctx.arc(currentTargetX, currentTargetY, 3.5 / transform.k, 0, Math.PI * 2);
          ctx.fillStyle = isInferred ? '#a855f7' : '#384cff';
          ctx.fill();
        } else if (isSourceOfHovered) {
          // Outgoing edge: vibrant electric brand blue or violet if inferred
          ctx.strokeStyle = isInferred 
            ? (isDark ? '#c084fc' : '#9333ea') 
            : (isDark ? '#6372ff' : '#384cff');
          ctx.lineWidth = baseEdgeWidth * 2.4;
          ctx.globalAlpha = 1.0;
          ctx.stroke();
        } else if (isTargetOfHovered) {
          // Incoming edge: bright azure blue or magenta if inferred
          ctx.strokeStyle = isInferred 
            ? (isDark ? '#e879f9' : '#c026d3') 
            : (isDark ? '#38bdf8' : '#0284c7');
          ctx.lineWidth = baseEdgeWidth * 2.4;
          ctx.globalAlpha = 1.0;
          ctx.stroke();
        } else if (activeOrHovered) {
          // Dimmed non-connected edge
          ctx.strokeStyle = isInferred
            ? (isDark ? 'rgba(168, 85, 247, 0.08)' : 'rgba(147, 51, 234, 0.08)')
            : (isDark ? 'rgba(99, 114, 255, 0.09)' : 'rgba(56, 76, 255, 0.09)');
          ctx.lineWidth = baseEdgeWidth * 0.5;
          ctx.globalAlpha = 0.15;
          ctx.stroke();
        } else {
          // Resting state edge: clean solid blue for extracted, dashed purple for inferred AI edges
          ctx.strokeStyle = isInferred
            ? (isDark ? 'rgba(192, 132, 252, 0.45)' : 'rgba(147, 51, 234, 0.4)')
            : (isDark ? 'rgba(99, 114, 255, 0.45)' : 'rgba(56, 76, 255, 0.38)');
          ctx.lineWidth = isInferred ? baseEdgeWidth * 0.95 : baseEdgeWidth * 1.15;
          ctx.globalAlpha = isInferred ? 0.75 : 0.85;
          ctx.stroke();
        }
        ctx.setLineDash([]);

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
              ? (isDark ? '#6372ff' : '#384cff')
              : isTargetOfHovered
              ? (isDark ? '#38bdf8' : '#0284c7')
              : activeOrHovered
              ? (isDark ? 'rgba(99, 114, 255, 0.18)' : 'rgba(56, 76, 255, 0.18)')
              : (isDark ? 'rgba(99, 114, 255, 0.65)' : 'rgba(56, 76, 255, 0.55)');
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;

      // Pass 2: Draw all Node Shapes, glow rings, bloom ripples, and borders
      for (const node of nodes) {
        const isTarget = node.id === activeOrHovered;
        const isNeighbor = highlightNeighbors.has(node.id);
        const isEdgeEndpoint = hoveredEdgeInfo && (node.id === hoveredEdgeInfo.edge.source || node.id === hoveredEdgeInfo.edge.target);
        const isCommunityMatch = activeCommunityId === null || node.communityId === activeCommunityId;
        const isDimmed = (activeOrHovered && !isNeighbor) || (!isCommunityMatch) || (hoveredEdgeInfo && !isEdgeEndpoint);
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
            ctx.strokeStyle = `rgba(56, 76, 255, ${Math.max(0, 1 - bloomAge)})`;
            ctx.lineWidth = 2 / transform.k;
            ctx.stroke();
          } else {
            bloomNodesRef.current.delete(node.id);
          }
        }

        // Double-ring highlight aura for focused or hovered node
        if (isTarget) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseRadius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(56, 76, 255, 0.18)' : 'rgba(56, 76, 255, 0.1)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, baseRadius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? '#8692ff' : '#384cff';
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

        // Vibrant non-black node color centered on brand Runagon palette or Leiden community
        let effectiveColor = (node.color && node.color !== '#18181b' && node.color !== '#000000') ? node.color : '#384cff';
        if (settings.colorByCommunity && node.communityColor) {
          effectiveColor = node.communityColor;
        }
        ctx.fillStyle = effectiveColor;
        ctx.fill();

        // Node border: Crisp white rim gives a tactile, beveled physical pebble effect on light bg
        ctx.lineWidth = isTarget ? (2.2 / transform.k) : (1.6 / transform.k);
        if (node.nodeType === 'unresolved') {
          ctx.setLineDash([3 / transform.k, 2 / transform.k]);
          ctx.strokeStyle = isDark ? '#818cf8' : '#6366f1';
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = isTarget ? (isDark ? '#8692ff' : '#384cff') : (isDark ? 'rgba(255, 255, 255, 0.35)' : '#ffffff');
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
        const pillR = 4 / transform.k;

        // Elevated Pill Background with soft tactile shadow
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
        ctx.fillStyle = isDark
          ? (isTarget ? '#1f1f26' : 'rgba(26, 26, 32, 0.94)')
          : (isTarget ? '#ffffff' : 'rgba(255, 255, 255, 0.96)');
        ctx.fill();

        // Pill hairline border
        ctx.strokeStyle = isTarget ? (isDark ? '#8692ff' : '#384cff') : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');
        ctx.lineWidth = 1 / transform.k;
        ctx.stroke();

        // Label Text
        ctx.fillStyle = isDark
          ? (isTarget ? '#ffffff' : (isDimmed ? '#71717a' : '#f4f4f6'))
          : (isTarget ? '#111113' : (isDimmed ? '#8e8e93' : '#18181b'));
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
  }, [stepSimulation, transform, hoveredNodeId, hoveredEdgeInfo, activeCommunityId, activeFileId, isMini, settings, isTimelapseRunning, animProgress]);

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

  const findEdgeAt = (x: number, y: number): { edge: GraphEdge; sourceNode: GraphNode; targetNode: GraphNode } | null => {
    const nodes = simNodesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edges = simEdgesRef.current;
    const threshold = 7 / transform.k;
    let closest: { edge: GraphEdge; sourceNode: GraphNode; targetNode: GraphNode } | null = null;
    let minDistance = threshold;

    for (let i = edges.length - 1; i >= 0; i--) {
      const e = edges[i];
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const l2 = dx * dx + dy * dy;
      let dist = 0;
      if (l2 === 0) {
        dist = Math.hypot(x - s.x, y - s.y);
      } else {
        let u = ((x - s.x) * dx + (y - s.y) * dy) / l2;
        u = Math.max(0, Math.min(1, u));
        dist = Math.hypot(x - (s.x + u * dx), y - (s.y + u * dy));
      }

      if (dist < minDistance) {
        minDistance = dist;
        closest = { edge: e, sourceNode: s, targetNode: t };
      }
    }
    return closest;
  };

  const handleFocusCommunity = (comm: { id: number; nodes: GraphNode[] }) => {
    if (activeCommunityId === comm.id) {
      setActiveCommunityId(null);
      return;
    }
    setActiveCommunityId(comm.id);
    if (!settings.colorByCommunity) {
      updateSetting('colorByCommunity', true);
    }
    if (comm.nodes.length === 0) return;
    let sumX = 0;
    let sumY = 0;
    comm.nodes.forEach(n => {
      sumX += n.x;
      sumY += n.y;
    });
    const avgX = sumX / comm.nodes.length;
    const avgY = sumY / comm.nodes.length;
    setTransform(prev => ({
      ...prev,
      x: -avgX * 1.15,
      y: -avgY * 1.15,
      k: Math.max(0.85, Math.min(2.0, 1.15))
    }));
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
      setHoveredEdgeInfo(null);
    } else {
      setHoverInfo(null);
      if (!isMini) {
        const edgeHit = findEdgeAt(coords.x, coords.y);
        if (edgeHit) {
          setHoveredEdgeInfo({
            edge: edgeHit.edge,
            sourceNode: edgeHit.sourceNode,
            targetNode: edgeHit.targetNode,
            clientX: e.clientX,
            clientY: e.clientY
          });
        } else {
          setHoveredEdgeInfo(null);
        }
      } else {
        setHoveredEdgeInfo(null);
      }
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
    <div className={`relative w-full h-full bg-[#f4f4f6] dark:bg-[#121214] overflow-hidden select-none ${isMini ? 'rounded-xl border border-black/[0.08] dark:border-white/[0.08]' : ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top Left Floating Control Center (Unified Search, Timelapse, Dual-Edges & Subsystems) */}
      {!isMini && (
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-2 select-none pointer-events-auto">
          {/* Row 1: Search Input Bar & Animated Timelapse Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-xs text-[#111113] dark:text-[#f4f4f6]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={settings.search}
                onChange={e => updateSetting('search', e.target.value)}
                placeholder="Search graph..."
                className="bg-transparent text-xs text-[#111113] dark:text-[#f4f4f6] placeholder-zinc-400 dark:placeholder-zinc-500 pl-8 pr-6 py-1.5 rounded-xl border border-transparent focus:border-[#384cff]/40 dark:focus:border-[#6372ff]/40 focus:outline-none w-44 transition-all"
              />
              {settings.search && (
                <button
                  onClick={() => updateSetting('search', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] my-auto" />

            {/* Time-lapse Play / Pause button */}
            <button
              onClick={handleToggleTimelapse}
              title={isTimelapseRunning ? 'Pause Animation' : 'Animate Graph Evolution'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isTimelapseRunning
                  ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] border-transparent shadow-sm'
                  : 'bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#f4f4f6] border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              {isTimelapseRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause ({animProgress}/{filteredData.nodes.length})</span>
                </>
              ) : animProgress < filteredData.nodes.length && animProgress > 1 ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-zinc-700 dark:text-zinc-300" />
                  <span>Resume ({animProgress}/{filteredData.nodes.length})</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-zinc-700 dark:text-zinc-300" />
                  <span>{animProgress >= filteredData.nodes.length && animProgress > 1 ? 'Replay' : 'Animate'}</span>
                </>
              )}
            </button>

            {/* Show full graph if paused partway */}
            {animProgress < filteredData.nodes.length && animProgress > 1 && !isTimelapseRunning && (
              <button
                onClick={handleResetTimelapse}
                title="Show Full Graph"
                className="p-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#585860] hover:text-[#111113] dark:text-zinc-400 dark:hover:text-zinc-200 border border-black/[0.06] dark:border-white/[0.08] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reheat Simulation Forces Button */}
            <button
              onClick={handleReheatSimulation}
              title="Reheat Simulation Forces"
              className="p-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#585860] hover:text-[#111113] dark:text-zinc-400 dark:hover:text-zinc-200 border border-black/[0.06] dark:border-white/[0.08] transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 2: Dual-Edge Filters & Subsystem Communities */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-xs text-[#111113] dark:text-[#f4f4f6] w-fit">
            {/* Extracted Edge Pill Toggle */}
            <button
              onClick={() => updateSetting('showExtractedEdges', settings.showExtractedEdges === false ? true : false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                settings.showExtractedEdges !== false
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 text-[#384cff] dark:text-blue-400 font-medium border border-blue-500/20 dark:border-blue-500/35'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 opacity-60'
              }`}
              title="Toggle Deterministic Code & Wikilink Edges (100% confidence)"
            >
              <span className="w-3.5 h-0.5 bg-[#384cff] dark:bg-blue-400 rounded-full inline-block" />
              <span className="text-[11px]">Extracted</span>
              <span className="text-[9px] font-mono opacity-80">({extractedEdgesCount})</span>
            </button>

            {/* Inferred Edge Pill Toggle */}
            <button
              onClick={() => updateSetting('showInferredEdges', !settings.showInferredEdges)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                settings.showInferredEdges
                  ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium border border-purple-500/20 dark:border-purple-500/35'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 opacity-60'
              }`}
              title="Toggle Semantic AI Inferred Edges"
            >
              <span className="w-3.5 h-0.5 border-t border-dashed border-purple-500 dark:border-purple-400 inline-block" />
              <span className="text-[11px]">Inferred (AI)</span>
              <span className="text-[9px] font-mono opacity-80">({inferredEdgesCount})</span>
            </button>

            {/* Subsystems Drawer Toggle */}
            <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <button
              onClick={() => setShowCommunitiesDrawer(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                showCommunitiesDrawer || activeCommunityId !== null
                  ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] font-medium shadow-xs'
                  : 'text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
              title="Explore Subsystem Communities (Leiden Partitioning)"
            >
              <Boxes className="w-3.5 h-3.5 text-[#384cff] dark:text-blue-400" />
              <span className="text-[11px]">Subsystems</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/15">
                {communities.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Subsystem Communities Drawer */}
      {showCommunitiesDrawer && !isMini && (
        <div className="absolute top-[88px] left-3 z-30 w-72 max-h-[70vh] overflow-y-auto bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-3 text-xs text-[#111113] dark:text-[#f4f4f6] space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-[#384cff] dark:text-blue-400" />
                <span>Leiden Subsystems</span>
              </div>
              <p className="text-[10px] text-[#8e8e93] dark:text-zinc-400">
                {communities.length} modular organic clusters detected
              </p>
            </div>
            <div className="flex items-center gap-1">
              {activeCommunityId !== null && (
                <button
                  onClick={() => setActiveCommunityId(null)}
                  className="text-[10px] text-[#384cff] dark:text-blue-400 hover:underline font-medium"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowCommunitiesDrawer(false)}
                className="p-1 rounded-md text-[#8e8e93] hover:text-[#111113] dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {communities.map(comm => {
              const isSelected = activeCommunityId === comm.id;
              return (
                <div
                  key={comm.id}
                  onClick={() => handleFocusCommunity(comm)}
                  className={`p-2 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-blue-500/10 dark:bg-blue-500/20 border-[#384cff]/40 dark:border-blue-400/40 shadow-xs'
                      : 'border-black/[0.04] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: comm.color }}
                      />
                      <span className="font-medium truncate text-xs">
                        {comm.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8e8e93] dark:text-zinc-400 shrink-0">
                      {comm.nodes.length} notes
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8e8e93] dark:text-zinc-400 font-mono truncate mt-1 pl-5">
                    {comm.nodes.slice(0, 3).map(n => n.label.replace(/\.md$/, '')).join(', ')}
                    {comm.nodes.length > 3 ? '...' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Right Action Strip: Split, Settings, Close */}
      {!isMini && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {onSplitRight && (
            <button
              onClick={() => onSplitRight()}
              title="Open Note to the Right (Split)"
              className="p-2 rounded-xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md text-[#585860] dark:text-zinc-400 border border-black/[0.08] dark:border-white/[0.1] hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] shadow-xs transition-all"
            >
              <Columns className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowControls(prev => !prev)}
            title="Graph Settings"
            className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
              showControls
                ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] border-transparent shadow-sm'
                : 'bg-white/95 dark:bg-[#18181b]/95 text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] border-black/[0.08] dark:border-white/[0.1] shadow-xs'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Graph (Esc)"
              className="p-2 rounded-xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md text-[#585860] dark:text-zinc-400 border border-black/[0.08] dark:border-white/[0.1] hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] shadow-xs transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Real Obsidian .graph-controls Floating Drawer */}
      {showControls && !isMini && (
        <div className="graph-settings-drawer absolute top-12 right-3 z-30 w-64 max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-3.5 text-xs text-[#111113] dark:text-[#f4f4f6] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08] font-semibold text-[#111113] dark:text-[#f4f4f6]">
            <span>Graph Settings</span>
            <span className="text-[10px] text-[#8e8e93] dark:text-zinc-400 font-normal">
              {filteredData.nodes.length} nodes · {filteredData.edges.length} links
            </span>
          </div>

          {/* Section 1: Filters */}
          <div className="space-y-2">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, filters: !s.filters }))}
              className="flex items-center justify-between font-semibold text-[#111113] dark:text-[#f4f4f6] cursor-pointer hover:text-black dark:hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-[#8e8e93] dark:text-zinc-400">Filters</span>
              {collapsedSections.filters ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.filters && (
              <div className="space-y-2 pt-1 pl-1">
                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span>Tags</span>
                  <input
                    type="checkbox"
                    checked={settings.showTags}
                    onChange={e => updateSetting('showTags', e.target.checked)}
                    className="accent-zinc-900 dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span>Attachments</span>
                  <input
                    type="checkbox"
                    checked={settings.showAttachments}
                    onChange={e => updateSetting('showAttachments', e.target.checked)}
                    className="accent-zinc-900 dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span>Existing files only</span>
                  <input
                    type="checkbox"
                    checked={settings.hideUnresolved}
                    onChange={e => updateSetting('hideUnresolved', e.target.checked)}
                    className="accent-zinc-900 dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span>Orphans</span>
                  <input
                    type="checkbox"
                    checked={settings.showOrphans}
                    onChange={e => updateSetting('showOrphans', e.target.checked)}
                    className="accent-zinc-900 dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span className="flex items-center gap-1.5">
                    <span>Extracted code edges</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-[#384cff] dark:text-blue-400 font-mono font-medium">AST</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.showExtractedEdges !== false}
                    onChange={e => updateSetting('showExtractedEdges', e.target.checked)}
                    className="accent-[#384cff] dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span className="flex items-center gap-1.5">
                    <span>Inferred AI edges</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono font-medium">AI</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.showInferredEdges}
                    onChange={e => updateSetting('showInferredEdges', e.target.checked)}
                    className="accent-[#384cff] dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 2: Groups */}
          <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, groups: !s.groups }))}
              className="flex items-center justify-between font-semibold text-[#111113] dark:text-[#f4f4f6] cursor-pointer hover:text-black dark:hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-[#8e8e93] dark:text-zinc-400">Groups</span>
              {collapsedSections.groups ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.groups && (
              <div className="space-y-2 pt-1 pl-1">
                <label className="flex items-center justify-between cursor-pointer text-[#585860] hover:text-[#111113] dark:text-zinc-300 dark:hover:text-[#f4f4f6] pb-1 border-b border-black/[0.04] dark:border-white/[0.05]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#384cff] dark:text-blue-400" />
                    <span className="font-medium text-[11px]">Communities (Leiden)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.colorByCommunity}
                    onChange={e => updateSetting('colorByCommunity', e.target.checked)}
                    className="accent-[#384cff] dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                {settings.colorGroups.map((group, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#f8f8fa] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                      <span className="truncate text-[11px] font-mono text-[#111113] dark:text-[#f4f4f6]">{group.query}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(idx)}
                      className="text-[#8e8e93] dark:text-zinc-400 hover:text-rose-600 p-0.5"
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
                      className="w-full bg-[#f4f4f6] dark:bg-zinc-800 border border-black/[0.1] dark:border-white/[0.1] rounded-lg px-2 py-1 text-xs text-[#111113] dark:text-[#f4f4f6] font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {['#384cff', '#2563eb', '#0284c7', '#6366f1', '#4f46e5', '#3b82f6', '#0ea5e9'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewGroupColor(c)}
                            className={`w-4 h-4 rounded-full border ${newGroupColor === c ? 'border-[#18181b] dark:border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="submit" className="px-2.5 py-0.5 rounded-lg bg-[#18181b] dark:bg-white text-white dark:text-[#18181b] text-[11px] font-medium shadow-xs">Add</button>
                        <button type="button" onClick={() => setIsAddingGroup(false)} className="text-[#8e8e93] dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[11px]">✕</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingGroup(true)}
                    className="w-full py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#f4f4f6] flex items-center justify-center gap-1 text-[11px] border border-black/[0.08] dark:border-white/[0.1] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New group</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Display */}
          <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, display: !s.display }))}
              className="flex items-center justify-between font-semibold text-[#111113] dark:text-[#f4f4f6] cursor-pointer hover:text-black dark:hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-[#8e8e93] dark:text-zinc-400">Display</span>
              {collapsedSections.display ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.display && (
              <div className="space-y-3 pt-1 pl-1">
                <label className="flex items-center justify-between cursor-pointer text-[#585860] dark:text-zinc-300 hover:text-[#111113] dark:hover:text-[#f4f4f6]">
                  <span>Arrows</span>
                  <input
                    type="checkbox"
                    checked={settings.showArrow}
                    onChange={e => updateSetting('showArrow', e.target.checked)}
                    className="accent-zinc-900 dark:accent-blue-500 w-3.5 h-3.5"
                  />
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Forces */}
          <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.08] pt-2.5">
            <div
              onClick={() => setCollapsedSections(s => ({ ...s, forces: !s.forces }))}
              className="flex items-center justify-between font-semibold text-[#111113] dark:text-[#f4f4f6] cursor-pointer hover:text-black dark:hover:text-white"
            >
              <span className="uppercase tracking-wider text-[10px] text-[#8e8e93] dark:text-zinc-400">Forces</span>
              {collapsedSections.forces ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {!collapsedSections.forces && (
              <div className="space-y-3 pt-1 pl-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#8e8e93] dark:text-zinc-400 text-[11px]">
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
                    className="w-full accent-zinc-900 dark:accent-blue-500"
                  />
                </div>

                <button
                  onClick={() => setSettings(DEFAULT_GRAPH_SETTINGS)}
                  className="w-full py-1 text-center rounded-lg bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#585860] hover:text-[#111113] dark:text-zinc-400 dark:hover:text-zinc-200 text-[10px] mt-1 border border-black/[0.08] dark:border-white/[0.1] transition-colors"
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
          className="fixed z-40 pointer-events-none bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] p-3 text-xs text-[#111113] dark:text-[#f4f4f6] animate-in fade-in duration-75 space-y-1"
          style={{
            left: `${Math.min(window.innerWidth - 240, hoverInfo.clientX + 14)}px`,
            top: `${Math.min(window.innerHeight - 150, hoverInfo.clientY + 14)}px`
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-[#111113] dark:text-[#f4f4f6]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoverInfo.node.color }} />
            <span className="truncate max-w-[180px]">{hoverInfo.node.label.replace(/\.md$/, '')}</span>
          </div>
          {hoverInfo.node.path && (
            <div className="text-[10px] text-[#8e8e93] dark:text-zinc-400 font-mono truncate">
              {hoverInfo.node.path}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px]">
            <span className="text-[#111113] dark:text-[#f4f4f6] font-medium">{hoverInfo.outCount} outgoing</span>
            <span className="text-[#8e8e93] dark:text-zinc-500">·</span>
            <span className="text-[#585860] dark:text-zinc-300 font-medium">{hoverInfo.inCount} incoming</span>
          </div>
          {hoverInfo.node.tags && hoverInfo.node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {hoverInfo.node.tags.map(t => (
                <span key={t} className="text-[9px] bg-[#ebebef] dark:bg-zinc-800 text-[#1c1c1e] dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.08] px-1.5 py-0.5 rounded-full font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="text-[9px] text-[#8e8e93] dark:text-zinc-400 italic pt-0.5">
            Click to open · Ctrl+Click to split
          </div>
        </div>
      )}

      {/* Floating Edge Tooltip: Dual-Edge Model (Extracted vs Inferred) */}
      {hoveredEdgeInfo && !hoverInfo && !isMini && (
        <div
          className="fixed z-40 pointer-events-none p-2.5 rounded-2xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_30px_rgba(0,0,0,0.18)] text-xs text-[#111113] dark:text-[#f4f4f6] flex flex-col gap-1.5 animate-in fade-in duration-75"
          style={{
            left: `${Math.min(window.innerWidth - 260, hoveredEdgeInfo.clientX + 14)}px`,
            top: `${Math.min(window.innerHeight - 150, hoveredEdgeInfo.clientY + 14)}px`
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111113] dark:text-[#f4f4f6]">
            <span className="truncate max-w-[100px]">
              {hoveredEdgeInfo.sourceNode.label.replace(/\.md$/, '')}
            </span>
            <span className="text-[#8e8e93] dark:text-zinc-400 font-mono">→</span>
            <span className="truncate max-w-[100px]">
              {hoveredEdgeInfo.targetNode.label.replace(/\.md$/, '')}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
            {hoveredEdgeInfo.edge.kind === 'inferred' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>INFERRED ({Math.round((hoveredEdgeInfo.edge.confidence ?? 0.75) * 100)}%)</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/15 text-[#384cff] dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>EXTRACTED (100%)</span>
              </span>
            )}
            <span className="text-[10px] text-[#585860] dark:text-zinc-400 font-mono">
              {hoveredEdgeInfo.edge.sourceType || (hoveredEdgeInfo.edge.kind === 'inferred' ? 'semantic' : 'wikilink')}
            </span>
          </div>

          {hoveredEdgeInfo.edge.label && (
            <div className="text-[10px] text-[#8e8e93] dark:text-zinc-400 italic">
              {hoveredEdgeInfo.edge.label}
            </div>
          )}
        </div>
      )}

      {/* Local Graph Depth / Jumps Slider in Mini Mode */}
      {isMini && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-2 py-0.5 text-[10px] text-[#585860] dark:text-zinc-400 shadow-xs">
          <span>Depth:</span>
          {[1, 2, 3].map(j => (
            <button
              key={j}
              onClick={() => updateSetting('localJumps', j)}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                (settings.localJumps || 1) === j
                  ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] shadow-xs'
                  : 'hover:text-[#111113] dark:hover:text-[#f4f4f6]'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      )}

      {/* Floating Zoom & Camera Controls */}
      <div className="graph-zoom-bar absolute bottom-3 right-3 flex items-center gap-1 z-10 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.min(4.5, t.k * 1.2) }))}
          className="graph-control-btn p-1.5 text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.max(0.15, t.k * 0.8) }))}
          className="graph-control-btn p-1.5 text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetView}
          className="graph-control-btn p-1.5 text-[#585860] dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#f4f4f6] hover:bg-[#f4f4f6] dark:hover:bg-[#27272a] rounded-lg transition-colors"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left Node Count */}
      <div className="absolute bottom-3 left-3 text-[11px] text-[#8e8e93] dark:text-zinc-400 font-medium select-none pointer-events-none">
        {isTimelapseRunning || (animProgress < filteredData.nodes.length && animProgress > 0)
          ? `${animProgress} of ${filteredData.nodes.length} nodes`
          : `${filteredData.nodes.length} nodes`} · {simEdgesRef.current.length} links
      </div>
    </div>
  );
};
