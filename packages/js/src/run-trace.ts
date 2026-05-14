// run_trace, the SCE move.
//
// Given a starting BoardOutcome on an industry-templated graph, return the
// canonical paths down to AICapability or VendorComponent leaves, with a
// per-path confidence, the named AccountabilityLayer, any gating issues, and
// a Reframing Question per path.
//
// The Reframing Question is the part of the BVF method that survives every
// iteration of the framework. Every output ends with a question the C-suite
// has not asked themselves, containing a tension or paradox.

import type { Industry } from './types.js';
import type {
  ValueTraceGraph,
  TraceResult,
  TracePath,
  TraceNode,
  AccountContext,
} from './value-trace.js';
import { walkPaths, getNode } from './value-trace.js';
import { getIndustryTemplate, TEMPLATED_INDUSTRIES } from './templates.js';

export interface RunTraceInput {
  industry: Industry;
  start_node: string;
  account_context?: AccountContext;
  target_node?: string;
  max_paths?: number;
}

export interface RunTraceWarning {
  code: string;
  message: string;
}

export interface RunTraceOutput extends TraceResult {
  warnings: RunTraceWarning[];
}

export function runTrace(input: RunTraceInput): RunTraceOutput {
  const warnings: RunTraceWarning[] = [];

  if (!TEMPLATED_INDUSTRIES.includes(input.industry)) {
    warnings.push({
      code: 'industry_template_missing',
      message: `Industry ${input.industry} has no v0.3 Trace template. Falling back to the shared scaffold. Add a vertical template in templates.ts to ship a full Trace for this industry.`,
    });
  }

  const graph = getIndustryTemplate(input.industry);

  // Validate start node exists in the templated graph.
  const start = getNode(graph, input.start_node);
  if (!start) {
    return {
      industry: input.industry,
      start_node: input.start_node,
      paths: [],
      account_context: input.account_context,
      generated_at: new Date().toISOString(),
      warnings: [
        {
          code: 'start_node_unknown',
          message: `Start node ${input.start_node} is not in the ${input.industry} template. Use inspect_node or list a board outcome from the industry overlay.`,
        },
      ],
    };
  }

  if (start.type !== 'BoardOutcome') {
    warnings.push({
      code: 'start_not_board_outcome',
      message: `Start node ${input.start_node} is a ${start.type}, not a BoardOutcome. The Trace works best from the board down. Consider re-running from the BoardOutcome that owns this node.`,
    });
  }

  const rawPaths = walkPaths(graph, input.start_node, input.max_paths ?? 6);

  // Optionally filter by target_node, useful when an SCE wants to know if a
  // named vendor capability can be traced from the chosen board outcome.
  const filtered = input.target_node
    ? rawPaths.filter((p) => p.nodes.includes(input.target_node!))
    : rawPaths;

  const paths: TracePath[] = filtered.map((p) => ({
    ...p,
    reframing_question: composeReframingQuestion(graph, p),
  }));

  if (paths.length === 0) {
    warnings.push({
      code: 'no_paths_found',
      message: `No paths from ${input.start_node} reached an AICapability or VendorComponent leaf. The industry template may be incomplete. Add an edge in templates.ts or use propose_edge to add a hypothesis edge live.`,
    });
  }

  // Surface missing-accountability findings as warnings so the SCE sees them
  // at the top of the response.
  for (const p of paths) {
    if (!p.accountability) {
      warnings.push({
        code: 'accountability_missing',
        message: `Path ${p.id} has no AccountabilityLayer. The C-suite cannot agentify this capability without a named accountable human.`,
      });
    }
  }

  return {
    industry: input.industry,
    start_node: input.start_node,
    paths,
    account_context: input.account_context,
    generated_at: new Date().toISOString(),
    warnings,
  };
}

// ---------------------------------------------------------------------------

function composeReframingQuestion(graph: ValueTraceGraph, path: TracePath): string {
  // The Reframing Question is composed from the path itself. The question
  // surfaces a tension between the named human end and the agent end.
  const board    = lookupOnPath(graph, path, 'BoardOutcome');
  const initiative = lookupOnPath(graph, path, 'BusinessInitiative');
  const capability = lookupOnPath(graph, path, 'AICapability');
  const vendor   = lookupOnPath(graph, path, 'VendorComponent');
  const accountabilityNode = path.accountability ? getNode(graph, path.accountability) : undefined;

  // If the path has no accountable human, that is the question itself.
  if (!accountabilityNode) {
    return `Who in your C-suite is willing to be named on a memo that says, "${capability?.label ?? 'this agent'} reports to me, and if it fails it costs me my role"?`;
  }

  // Default form, names the human, the agent and the board outcome.
  const accLabel    = accountabilityNode.label;
  const boardLabel  = board?.label ?? 'your board outcome';
  const capLabel    = capability?.label ?? 'an agent';
  const initLabel   = initiative?.label ? `the ${initiative.label.toLowerCase()} initiative` : 'your current programme';
  const vendorLabel = vendor?.label;

  if (vendorLabel) {
    return `If ${accLabel} is the named accountable human for ${boardLabel}, and ${capLabel} is delivered through ${vendorLabel}, what does ${initLabel} look like when ${accLabel} cannot blame the vendor for the next miss?`;
  }
  return `If ${accLabel} is the named accountable human for ${boardLabel}, and ${capLabel} is the agent that moves it, what changes in ${initLabel} the moment ${accLabel} sees the agent's confidence score before the board meeting, not after?`;
}

function lookupOnPath(
  graph: ValueTraceGraph,
  path: TracePath,
  type: TraceNode['type'],
): TraceNode | undefined {
  for (const id of path.nodes) {
    const n = getNode(graph, id);
    if (n?.type === type) return n;
  }
  return undefined;
}
