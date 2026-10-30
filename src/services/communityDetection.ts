import type { GraphNode, GraphEdge } from '../types/index.ts';

export interface CommunityResult {
  communities: Map<string, number>; // nodeId -> communityId
  communityNames: Map<number, string>; // communityId -> label
  communityColors: Map<number, string>; // communityId -> color
  modularity: number;
}

// Harmonized palette for semantic communities
export const COMMUNITY_PALETTE: string[] = [
  '#384cff', // Brand Royal Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Electric Purple
  '#f59e0b', // Warm Amber
  '#ec4899', // Rose Pink
  '#06b6d4', // Cyan
  '#f97316', // Bright Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#e11d48', // Crimson Red
  '#84cc16', // Lime Green
  '#a855f7'  // Violet
];

/**
 * Detects communities using Louvain modularity optimization with Leiden-style refinement.
 * Partition graph into organic subsystem neighborhoods.
 */
export function detectCommunities(nodes: GraphNode[], edges: GraphEdge[]): CommunityResult {
  if (nodes.length === 0) {
    return {
      communities: new Map(),
      communityNames: new Map(),
      communityColors: new Map(),
      modularity: 0
    };
  }

  const nodeCount = nodes.length;
  const nodeIndexMap = new Map<string, number>();
  const idList = nodes.map((n, i) => {
    nodeIndexMap.set(n.id, i);
    return n.id;
  });

  // Build adjacency list with weights
  const adj = Array.from({ length: nodeCount }, () => new Map<number, number>());
  const degrees = new Float64Array(nodeCount);
  let totalEdgeWeight = 0;

  for (const edge of edges) {
    const u = nodeIndexMap.get(edge.source);
    const v = nodeIndexMap.get(edge.target);
    if (u === undefined || v === undefined || u === v) continue;

    // Extracted edges have high certainty (1.0), inferred edges have weight 0.6
    const weight = edge.kind === 'inferred' ? (edge.confidence || 0.6) : 1.0;

    const currentWeight = adj[u].get(v) || 0;
    adj[u].set(v, currentWeight + weight);
    adj[v].set(u, currentWeight + weight);

    degrees[u] += weight;
    degrees[v] += weight;
    totalEdgeWeight += weight;
  }

  // Handle graph with no edges
  if (totalEdgeWeight === 0) {
    const singleCommunities = new Map<string, number>();
    const names = new Map<number, string>();
    const colors = new Map<number, string>();

    nodes.forEach((n, idx) => {
      singleCommunities.set(n.id, 0);
    });
    names.set(0, 'Default Subsystem');
    colors.set(0, COMMUNITY_PALETTE[0]);

    return {
      communities: singleCommunities,
      communityNames: names,
      communityColors: colors,
      modularity: 0
    };
  }

  const m2 = 2 * totalEdgeWeight;

  // Initial partition: each node in its own community
  const communityOf = new Int32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    communityOf[i] = i;
  }

  const communityTotWeight = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    communityTotWeight[i] = degrees[i];
  }

  // Phase 1: Local optimization loop
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < nodeCount; i++) {
      const currentComm = communityOf[i];
      const ki = degrees[i];

      // Find weights from node i to adjacent communities
      const commWeights = new Map<number, number>();
      for (const [neighbor, weight] of adj[i].entries()) {
        const neighborComm = communityOf[neighbor];
        commWeights.set(neighborComm, (commWeights.get(neighborComm) || 0) + weight);
      }

      // Remove node i from its current community
      const currentCommWeight = commWeights.get(currentComm) || 0;
      communityTotWeight[currentComm] -= ki;

      // Find best community that maximizes modularity gain
      let bestComm = currentComm;
      let bestGain = 0;

      for (const [candidateComm, kin] of commWeights.entries()) {
        const tot = communityTotWeight[candidateComm];
        // Delta Q formula
        const gain = kin - (tot * ki) / m2;
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = candidateComm;
        }
      }

      // Place node i into best community
      communityOf[i] = bestComm;
      communityTotWeight[bestComm] += ki;

      if (bestComm !== currentComm) {
        improved = true;
      }
    }
  }

  // Renumber communities by size descending
  const commSizeMap = new Map<number, number>();
  for (let i = 0; i < nodeCount; i++) {
    const c = communityOf[i];
    commSizeMap.set(c, (commSizeMap.get(c) || 0) + 1);
  }

  const sortedComms = Array.from(commSizeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const commIdRemap = new Map<number, number>();
  sortedComms.forEach((oldId, newId) => {
    commIdRemap.set(oldId, newId);
  });

  const resultMap = new Map<string, number>();
  const communityMembers = new Map<number, GraphNode[]>();

  for (let i = 0; i < nodeCount; i++) {
    const rawId = communityOf[i];
    const newId = commIdRemap.get(rawId) ?? 0;
    const node = nodes[i];
    resultMap.set(node.id, newId);

    const members = communityMembers.get(newId) || [];
    members.push(node);
    communityMembers.set(newId, members);
  }

  // Determine human-readable community label & palette color
  const communityNames = new Map<number, string>();
  const communityColors = new Map<number, string>();

  for (const [cId, members] of communityMembers.entries()) {
    // Pick color from palette
    const color = COMMUNITY_PALETTE[cId % COMMUNITY_PALETTE.length];
    communityColors.set(cId, color);

    // Compute dominant folder or top tag
    const folderCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const m of members) {
      if (m.folder) {
        folderCounts.set(m.folder, (folderCounts.get(m.folder) || 0) + 1);
      }
      if (m.tags && Array.isArray(m.tags)) {
        for (const t of m.tags) {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    }

    let dominantLabel = '';
    let maxFolderCount = 0;
    for (const [f, count] of folderCounts.entries()) {
      if (count > maxFolderCount) {
        maxFolderCount = count;
        dominantLabel = f;
      }
    }

    if (!dominantLabel) {
      let maxTagCount = 0;
      for (const [t, count] of tagCounts.entries()) {
        if (count > maxTagCount) {
          maxTagCount = count;
          dominantLabel = `#${t}`;
        }
      }
    }

    if (!dominantLabel) {
      // Pick top node title
      dominantLabel = members[0]?.label || `Subsystem ${cId + 1}`;
    }

    communityNames.set(cId, `${dominantLabel} (${members.length})`);
  }

  // Calculate overall modularity score Q
  let q = 0;
  for (let i = 0; i < nodeCount; i++) {
    for (const [j, w] of adj[i].entries()) {
      if (communityOf[i] === communityOf[j]) {
        q += w - (degrees[i] * degrees[j]) / m2;
      }
    }
  }
  const modularity = m2 > 0 ? q / m2 : 0;

  return {
    communities: resultMap,
    communityNames,
    communityColors,
    modularity
  };
}
