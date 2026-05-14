// AI Value Trace, graph data model and traversal engine.
//
// Mirrors the JSON schema at spec/value-trace.schema.json. Provides the
// data types, a minimal in-memory graph engine, and starter industry
// templates that run_trace draws on.
//
// Design choices:
//   - Directed multi-graph, multiple edges allowed between the same node pair
//     with different relations.
//   - Node ids are dot-namespaced strings (board.revenue-growth, function.cx).
//   - Edge confidence comes from the existing BVF four-pillar engine when a
//     customer initiative is being scored. Template edges carry a static
//     prior confidence drawn from published benchmarks.
//   - No external dependencies. Same constraint as the rest of @aibvf/core.

import type { FunctionId, AiTier, Industry } from './types.js';

export type NodeType =
  | 'BoardOutcome'
  | 'BusinessInitiative'
  | 'OperatingMetric'
  | 'Function'
  | 'AICapability'
  | 'AccountabilityLayer'
  | 'VendorComponent';

export type EdgeRelation = 'moves' | 'instruments' | 'tracks' | 'automates' | 'gates' | 'delivers';

export interface Citation {
  source: string;
  year: number;
  title?: string;
  url?: string;
}

export interface TraceNode {
  id: string;
  type: NodeType;
  label: string;
  industry_scope?: Industry[];
  function_scope?: FunctionId[];
  ai_tier?: AiTier;
  evidence?: Citation[];
  notes?: string;
}

export interface TraceEdge {
  from: string;
  to: string;
  relation: EdgeRelation;
  confidence?: number;
  evidence?: Citation[];
  hypothesis?: boolean;
}

export interface AccountContext {
  name?: string;
  revenue_band?: 'sub_500m' | '500m_2b' | '2b_10b' | '10b_plus';
  geography?: string;
  vendor_stack?: string[];
}

export interface ValueTraceGraph {
  trace_version: '0.3';
  industry: Industry;
  account_context?: AccountContext;
  nodes: TraceNode[];
  edges: TraceEdge[];
}

export interface TracePath {
  id: string;
  nodes: string[];
  edges: string[];
  path_confidence: number;
  accountability?: string;
  gating_issues: string[];
  reframing_question: string;
}

export interface TraceResult {
  industry: Industry;
  start_node: string;
  paths: TracePath[];
  account_context?: AccountContext;
  generated_at: string;
}

// ---------- Graph helpers ----------------------------------------------------

export function edgeFingerprint(e: TraceEdge): string {
  return `${e.from}->${e.relation}->${e.to}`;
}

export function findOutgoing(graph: ValueTraceGraph, nodeId: string): TraceEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

export function findIncoming(graph: ValueTraceGraph, nodeId: string): TraceEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}

export function getNode(graph: ValueTraceGraph, nodeId: string): TraceNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/**
 * Depth-first walk from start node down through the canonical relation chain:
 * BoardOutcome <-moves- BusinessInitiative <-instruments- OperatingMetric
 *   Function <-automates- AICapability <-delivers- VendorComponent
 *   AccountabilityLayer -gates- AICapability
 *
 * Returns at most maxPaths complete paths ending at AICapability or
 * VendorComponent leaves.
 */
export function walkPaths(
  graph: ValueTraceGraph,
  startId: string,
  maxPaths = 6,
  maxDepth = 8,
): TracePath[] {
  const results: TracePath[] = [];

  function visit(currentId: string, nodes: string[], edges: string[], depth: number): void {
    if (results.length >= maxPaths || depth > maxDepth) return;

    const node = getNode(graph, currentId);
    if (!node) return;

    // Edges to follow depend on node type. We follow the "downward" relation
    // chain so the SCE sees a board outcome flow into an AICapability.
    const downEdges = graph.edges.filter((e) => isDownward(node.type, e, currentId));

    if (downEdges.length === 0) {
      // Leaf reached. Capture path if it terminates at a meaningful leaf.
      if (node.type === 'AICapability' || node.type === 'VendorComponent') {
        results.push(buildPath(graph, nodes, edges));
      }
      return;
    }

    for (const e of downEdges) {
      const next = e.from === currentId ? e.to : e.from;
      if (nodes.includes(next)) continue; // avoid cycles
      visit(next, [...nodes, next], [...edges, edgeFingerprint(e)], depth + 1);
    }
  }

  visit(startId, [startId], [], 0);
  return results;
}

function isDownward(currentType: NodeType, edge: TraceEdge, currentId: string): boolean {
  // We treat the relation chain as oriented from a Board outcome down to a
  // vendor capability. Each relation has a canonical from-to pair.
  const orient: Record<EdgeRelation, [NodeType, NodeType]> = {
    moves:       ['BusinessInitiative', 'BoardOutcome'],
    instruments: ['OperatingMetric',    'BusinessInitiative'],
    tracks:      ['Function',           'OperatingMetric'],
    automates:   ['AICapability',       'Function'],
    gates:       ['AccountabilityLayer','AICapability'],
    delivers:    ['VendorComponent',    'AICapability'],
  };
  const [src, dst] = orient[edge.relation];
  // Walking downward, we want edges whose dst matches the current type, then
  // we follow to the src.
  if (edge.to === currentId && currentType === dst) return true;
  return false;
}

function buildPath(graph: ValueTraceGraph, nodes: string[], edges: string[]): TracePath {
  // Path confidence = average of edge confidences along the path, defaulting
  // to 60 when an edge has no explicit confidence.
  const edgeConfidences = edges.map((fp) => {
    const e = graph.edges.find((x) => edgeFingerprint(x) === fp);
    return e?.confidence ?? 60;
  });
  const path_confidence = edgeConfidences.length
    ? Math.round(edgeConfidences.reduce((a, b) => a + b, 0) / edgeConfidences.length)
    : 0;

  // Find the AccountabilityLayer node that gates the AICapability on this
  // path, if any.
  let accountability: string | undefined;
  const gatingIssues: string[] = [];
  for (const id of nodes) {
    const node = getNode(graph, id);
    if (node?.type === 'AICapability') {
      const incomingGates = findIncoming(graph, id).filter((e) => e.relation === 'gates');
      if (incomingGates.length > 0) {
        accountability = incomingGates[0].from;
      } else {
        gatingIssues.push(`AICapability ${id} has no AccountabilityLayer, every agent needs a named accountable human.`);
      }
    }
  }

  return {
    id: `${nodes[0]}->${nodes[nodes.length - 1]}`,
    nodes,
    edges,
    path_confidence,
    accountability,
    gating_issues: gatingIssues,
    reframing_question: '', // populated by run_trace
  };
}
