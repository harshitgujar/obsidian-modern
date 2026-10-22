import { GraphNode, GraphEdge } from '../types';

export interface SimConfig {
  centerStrength: number;
  repelStrength: number;
  linkStrength: number;
  linkDistance: number;
  velocityDecay: number;
  alphaDecay: number;
}

export class QuadtreeForceSimulator {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private config: SimConfig = {
    centerStrength: 0.02,
    repelStrength: 1000,
    linkStrength: 1,
    linkDistance: 160,
    velocityDecay: 0.88,
    alphaDecay: 0.005
  };
  private alpha: number = 1;

  public init(nodes: GraphNode[], edges: GraphEdge[], config?: Partial<SimConfig>) {
    this.nodes = nodes.map(n => ({ ...n }));
    this.edges = edges;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.alpha = 1;
  }

  public updateConfig(config: Partial<SimConfig>) {
    this.config = { ...this.config, ...config };
    this.alpha = 1; // re-heat simulation
  }

  public tick(steps: number = 1): GraphNode[] {
    if (this.alpha < 0.001) return this.nodes;

    for (let s = 0; s < steps; s++) {
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
      const repulsion = this.config.repelStrength * this.alpha;
      const center = this.config.centerStrength;

      // 1. Repulsion between all nodes
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n1 = this.nodes[i];
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 600) {
            const force = repulsion / (distSq + 50);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Link Spring attraction
      for (const edge of this.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = dist - this.config.linkDistance;
        const force = delta * 0.04 * this.config.linkStrength * this.alpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // 3. Center gravity and velocity decay
      for (const node of this.nodes) {
        node.vx -= node.x * center;
        node.vy -= node.y * center;

        node.vx *= this.config.velocityDecay;
        node.vy *= this.config.velocityDecay;

        node.x += node.vx;
        node.y += node.vy;
      }

      this.alpha *= (1 - this.config.alphaDecay);
    }

    return this.nodes;
  }
}

// Web Worker message listener
if (typeof self !== 'undefined' && typeof (self as any).onmessage !== 'undefined') {
  const sim = new QuadtreeForceSimulator();

  self.onmessage = (e: MessageEvent) => {
    const { type, data } = e.data;
    if (type === 'init') {
      sim.init(data.nodes, data.edges, data.config);
      const updated = sim.tick(1);
      self.postMessage({ type: 'tick', nodes: updated });
    } else if (type === 'tick') {
      const updated = sim.tick(data?.steps || 1);
      self.postMessage({ type: 'tick', nodes: updated });
    } else if (type === 'config') {
      sim.updateConfig(data);
    }
  };
}
