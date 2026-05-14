export { validate } from './validate.js';
export {
  score,
  recommendImprovements,
  calculatePaceLayerDrag,
  BASE_RATES, IND_MULT, TIER_ADJ, READINESS_CAPTURE, PACE_DRAG_RATE,
} from './score.js';
export { bvfSchema } from './schema.js';
export { INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS, INDUSTRY_LABEL, FUNCTION_LABEL, TIER_LABEL } from './taxonomy.js';
export type * from './types.js';

// AI Value Trace, graph-native conversation framework (v0.3.0).
export { runTrace } from './run-trace.js';
export type { RunTraceInput, RunTraceOutput, RunTraceWarning } from './run-trace.js';
export { inspectNode } from './inspect-node.js';
export type { InspectNodeInput, InspectNodeOutput, RelatedNode } from './inspect-node.js';
export { getIndustryTemplate, TEMPLATED_INDUSTRIES } from './templates.js';
export {
  walkPaths,
  edgeFingerprint,
  findOutgoing,
  findIncoming,
  getNode,
} from './value-trace.js';
export type {
  NodeType,
  EdgeRelation,
  Citation,
  TraceNode,
  TraceEdge,
  AccountContext,
  ValueTraceGraph,
  TracePath,
  TraceResult,
} from './value-trace.js';

export const BVF_VERSION = '1.0';
export const TRACE_VERSION = '0.3';
