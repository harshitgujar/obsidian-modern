import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { GraphData, GraphNode, GraphEdge } from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Sliders, Maximize2, Search } from 'lucide-react';

interface GraphViewProps {
  data: GraphData;
  activeFileId?: string;
  onSelectNode: (fileId: string) => void;
  isMini?: boolean; // For mini local graph in inspector
}

export const GraphView: React.FC<GraphViewProps> = ({
  data,
  activeFileId,
  onSelectNode,
  isMini = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: isMini ? 0.8 : 1.1 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrphans, setShowOrphans] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [linkDistance, setLinkDistance] = useState(70);
  const [repulsionStrength, setRepulsionStrength] = useState(120);

  // Local physics simulation node coordinates
  const simNodesRef = useRef<GraphNode[]>([]);
  const simEdgesRef = useRef<GraphEdge[]>([]);
  const draggingNodeRef = useRef<GraphNode | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Filter nodes & edges
  const filteredData = useMemo(() => {
    let nodes = data.nodes;
    let edges = data.edges;

    if (isMini && activeFileId) {
      // Local graph: show active node and 1-hop neighbors
      const connectedNodeIds = new Set<string>([activeFileId]);
      edges.forEach(e => {
        if (e.source === activeFileId) connectedNodeIds.add(e.target);
        if (e.target === activeFileId) connectedNodeIds.add(e.source);
      });
      nodes = nodes.filter(n => connectedNodeIds.has(n.id));
      edges = edges.filter(e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target));
    }

    if (!showOrphans) {
      const connectedIds = new Set<string>();
      edges.forEach(e => {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      });
      nodes = nodes.filter(n => connectedIds.has(n.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n => n.label.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
      const filteredIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target));
    }

    return { nodes, edges };
  }, [data, isMini, activeFileId, showOrphans, searchQuery]);

  // Synchronize simulation nodes without resetting active positions
  useEffect(() => {
    const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    simNodesRef.current = filteredData.nodes.map(n => {
      const existing = existingMap.get(n.id);
      return existing
        ? { ...n, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy }
        : { ...n };
    });
    simEdgesRef.current = filteredData.edges;
  }, [filteredData]);

  // Force simulation tick
  const stepSimulation = useCallback(() => {
    const nodes = simNodesRef.current;
    const edges = simEdgesRef.current;
    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const repulsion = repulsionStrength * 10;
    const centerGravity = 0.015;
    const friction = 0.88;

    // 1. Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        if (dist < 400) {
          const force = repulsion / (distSq + 20);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Link attraction
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const delta = dist - linkDistance;
      const force = delta * 0.04;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // 3. Center gravity and update position
    for (const node of nodes) {
      if (draggingNodeRef.current && draggingNodeRef.current.id === node.id) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      node.vx -= node.x * centerGravity;
      node.vy -= node.y * centerGravity;

      node.vx *= friction;
      node.vy *= friction;

      node.x += node.vx;
      node.y += node.vy;
    }
  }, [linkDistance, repulsionStrength]);

  // Render loop
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

      // Camera transform
      ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
      ctx.scale(transform.k, transform.k);

      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Determine active highlight neighborhood
      const activeOrHovered = hoveredNodeId || activeFileId;
      const highlightNeighbors = new Set<string>();
      if (activeOrHovered) {
        highlightNeighbors.add(activeOrHovered);
        edges.forEach(e => {
          if (e.source === activeOrHovered) highlightNeighbors.add(e.target);
          if (e.target === activeOrHovered) highlightNeighbors.add(e.source);
        });
      }

      // Draw Edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isHighlighted = activeOrHovered &&
          (edge.source === activeOrHovered || edge.target === activeOrHovered);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.8 / transform.k;
          ctx.globalAlpha = 0.9;
        } else if (activeOrHovered) {
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 0.8 / transform.k;
          ctx.globalAlpha = 0.15;
        } else {
          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1 / transform.k;
          ctx.globalAlpha = 0.35;
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Draw Nodes
      for (const node of nodes) {
        const isTarget = node.id === activeOrHovered;
        const isNeighbor = highlightNeighbors.has(node.id);
        const isDimmed = activeOrHovered && !isNeighbor;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.2 : 1;

        // Glow ring for active/hovered node
        if (isTarget) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.fill();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.val, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#8b5cf6';
        ctx.fill();

        ctx.strokeStyle = isTarget ? '#ffffff' : '#18181b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        const showLabel = isMini
          ? (isTarget || isNeighbor)
          : (transform.k > 0.6 || isNeighbor || isTarget || node.val > 10);

        if (showLabel) {
          ctx.font = `${isTarget ? '600' : '400'} ${Math.max(10, 12 / transform.k)}px Inter, sans-serif`;
          ctx.fillStyle = isTarget ? '#ffffff' : (isDimmed ? '#71717a' : '#d4d4d8');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.label, node.x, node.y + node.val + 3);
        }

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
  }, [stepSimulation, transform, hoveredNodeId, activeFileId, isMini]);

  // Pointer interactions (Pan, Drag, Hover, Click)
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
    const nodes = simNodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= (n.val + 4) * (n.val + 4)) {
        return n;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clickedNode = findNodeAt(coords.x, coords.y);

    if (clickedNode) {
      draggingNodeRef.current = clickedNode;
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

    const hoverNode = findNodeAt(coords.x, coords.y);
    setHoveredNodeId(hoverNode ? hoverNode.id : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clickedNode = findNodeAt(coords.x, coords.y);

    if (clickedNode && draggingNodeRef.current === clickedNode) {
      onSelectNode(clickedNode.id);
    }

    draggingNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.2, Math.min(4.0, prev.k * zoomFactor))
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, k: isMini ? 0.8 : 1.1 });
  };

  return (
    <div className={`relative w-full h-full bg-[#141416] overflow-hidden select-none ${isMini ? 'rounded-lg border border-zinc-800' : ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Toolbar Controls */}
      {!isMini && (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="bg-zinc-900/90 text-xs text-zinc-200 pl-8 pr-3 py-1.5 rounded-md border border-zinc-700/60 focus:border-purple-500 focus:outline-none w-44 backdrop-blur-md"
            />
          </div>

          <button
            onClick={() => setShowControls(prev => !prev)}
            title="Graph Settings"
            className={`p-1.5 rounded-md border backdrop-blur-md transition-colors ${
              showControls
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-700/60 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Zoom and Reset Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/60 rounded-md p-1">
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.min(4.0, t.k * 1.2) }))}
          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.max(0.2, t.k * 0.8) }))}
          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Physics & Display Settings Drawer */}
      {showControls && !isMini && (
        <div className="absolute top-12 left-3 w-64 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/70 rounded-lg p-3 z-20 text-xs shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-zinc-800 pb-1.5">
            <span>Graph Filters & Physics</span>
            <span className="text-[10px] text-zinc-500 font-normal">
              {filteredData.nodes.length} nodes · {filteredData.edges.length} links
            </span>
          </div>

          <label className="flex items-center justify-between text-zinc-400 cursor-pointer">
            <span>Show Unconnected Notes</span>
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={e => setShowOrphans(e.target.checked)}
              className="rounded accent-purple-500"
            />
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span>Link Distance</span>
              <span>{linkDistance}px</span>
            </div>
            <input
              type="range"
              min="30"
              max="150"
              value={linkDistance}
              onChange={e => setLinkDistance(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span>Node Repulsion</span>
              <span>{repulsionStrength}</span>
            </div>
            <input
              type="range"
              min="40"
              max="240"
              value={repulsionStrength}
              onChange={e => setRepulsionStrength(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      )}

      {/* Node count badge */}
      <div className="absolute bottom-3 left-3 text-[11px] text-zinc-500 font-medium select-none pointer-events-none">
        {filteredData.nodes.length} notes · {filteredData.edges.length} links
      </div>
    </div>
  );
};
