// inspect_node, the live move.
//
// During a CIO meeting, the SCE clicks a node on the Trace Console and asks
// "what is the evidence here". inspect_node returns the deep grounding for a
// single node, all its connected edges (in and out), and the named exemplars
// drawn from the industry template.

import type { Industry } from './types.js';
import type { TraceNode, TraceEdge } from './value-trace.js';
import { getIndustryTemplate } from './templates.js';
import { findIncoming, findOutgoing, getNode } from './value-trace.js';

export interface InspectNodeInput {
  node_id: string;
  industry: Industry;
}

export interface RelatedNode {
  id: string;
  type: TraceNode['type'];
  label: string;
  relation: TraceEdge['relation'];
  direction: 'incoming' | 'outgoing';
  confidence?: number;
}

export interface InspectNodeOutput {
  node?: TraceNode;
  industry: Industry;
  related: RelatedNode[];
  incoming_edges: TraceEdge[];
  outgoing_edges: TraceEdge[];
  evidence_summary: string[];
  warnings: { code: string; message: string }[];
}

export function inspectNode(input: InspectNodeInput): InspectNodeOutput {
  const graph = getIndustryTemplate(input.industry);
  const node = getNode(graph, input.node_id);
  const warnings: { code: string; message: string }[] = [];

  if (!node) {
    return {
      node: undefined,
      industry: input.industry,
      related: [],
      incoming_edges: [],
      outgoing_edges: [],
      evidence_summary: [],
      warnings: [{
        code: 'node_unknown',
        message: `Node ${input.node_id} is not in the ${input.industry} template. Use list_taxonomy or run_trace to discover canonical node ids.`,
      }],
    };
  }

  const incoming = findIncoming(graph, input.node_id);
  const outgoing = findOutgoing(graph, input.node_id);

  const related: RelatedNode[] = [];
  for (const e of incoming) {
    const other = getNode(graph, e.from);
    if (other) {
      related.push({
        id: other.id,
        type: other.type,
        label: other.label,
        relation: e.relation,
        direction: 'incoming',
        confidence: e.confidence,
      });
    }
  }
  for (const e of outgoing) {
    const other = getNode(graph, e.to);
    if (other) {
      related.push({
        id: other.id,
        type: other.type,
        label: other.label,
        relation: e.relation,
        direction: 'outgoing',
        confidence: e.confidence,
      });
    }
  }

  // Collect a flat list of citations from the node and all its edges.
  const citations = new Map<string, string>();
  const addCite = (src: string, year: number, title?: string) => {
    const k = `${src}::${year}`;
    if (!citations.has(k)) citations.set(k, title ? `${src} (${year}), ${title}` : `${src} (${year})`);
  };
  for (const c of node.evidence ?? []) addCite(c.source, c.year, c.title);
  for (const e of [...incoming, ...outgoing]) {
    for (const c of e.evidence ?? []) addCite(c.source, c.year, c.title);
  }

  // For AICapability nodes, flag the absence of an AccountabilityLayer.
  if (node.type === 'AICapability') {
    const gated = incoming.some((e) => e.relation === 'gates');
    if (!gated) {
      warnings.push({
        code: 'accountability_missing',
        message: `AICapability ${node.id} has no AccountabilityLayer in the ${input.industry} template. Every agent needs a named accountable human.`,
      });
    }
  }

  return {
    node,
    industry: input.industry,
    related,
    incoming_edges: incoming,
    outgoing_edges: outgoing,
    evidence_summary: Array.from(citations.values()),
    warnings,
  };
}
