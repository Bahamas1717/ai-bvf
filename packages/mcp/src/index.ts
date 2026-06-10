#!/usr/bin/env node
/**
 * aibvf-mcp — an MCP server exposing AI BVF v1.0 scoring and validation as tools
 * callable by any Claude agent or MCP-compatible host.
 */
import { createHash, randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  score, validate, recommendImprovements, calculatePaceLayerDrag,
  BASE_RATES, IND_MULT,
  INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS, BVF_VERSION,
} from '@aibvf/core';

// ---------------------------------------------------------------------------
// Anonymous usage telemetry.
// Collects: tool_name, industry, function, ai_tier, readiness, daily-rotated
// caller hash. Never collects: scores, portfolio content, revenue, user IDs.
// Opt out with AIBVF_TELEMETRY_DISABLE=1.
// Redirect to your own backend with AIBVF_TELEMETRY_URL + AIBVF_TELEMETRY_KEY.
//
// caller_hash is sha256(installId + day), truncated. The installId is 16
// random bytes generated on first run and persisted to a dotfile, so it is
// stable per install (real distinct-install dedup) yet high-entropy — unlike a
// hostname/username fingerprint, the hash cannot be brute-forced back to a
// machine or person. The installId never leaves the machine; only the daily
// hash does, and it rotates every 24h so there is no permanent cross-day id.
// Never collects user IDs, scores, or portfolio content.
// ---------------------------------------------------------------------------
const TELEMETRY_DEFAULT_URL = process.env.AIBVF_TELEMETRY_URL
  ?? 'https://eomlyjtscwxibezoymxg.supabase.co/rest/v1/mcp_calls';
const TELEMETRY_DEFAULT_KEY = process.env.AIBVF_TELEMETRY_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbWx5anRzY3d4aWJlem95bXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTQ3OTcsImV4cCI6MjA5MjM3MDc5N30.OZvykkl5M17eZluX2fG98aA--5iVq5BQSPizYk3H0F4';
const TELEMETRY_DISABLED = process.env.AIBVF_TELEMETRY_DISABLE === '1';

// Load the persisted install id, or create it on first run. The seed is random
// high-entropy bytes (not derivable from anything about the user), so the
// published daily hash dedupes a returning install without being reversible.
// If the dotfile can't be read or written (read-only fs, locked-down
// container), we fall back to a per-process random seed so telemetry still
// fires; that run simply counts as its own caller.
function loadOrCreateInstallId(): string {
  try {
    const dir = join(homedir(), '.config', 'aibvf');
    const file = join(dir, 'install-id');
    try {
      const existing = readFileSync(file, 'utf8').trim();
      if (existing) return existing;
    } catch { /* dotfile not created yet - fall through to create it */ }
    const id = randomBytes(16).toString('hex');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, id, { mode: 0o600 });
    return id;
  } catch {
    return randomBytes(16).toString('hex');
  }
}
// Computed lazily on the first telemetry send, never at import. A user who
// opts out with AIBVF_TELEMETRY_DISABLE=1 short-circuits in logCall before
// callerHash runs, so the install-id dotfile is never written for them.
let installSeed: string | undefined;
const daySalt = () => new Date().toISOString().slice(0, 10);
const callerHash = () => {
  if (installSeed === undefined) installSeed = loadOrCreateInstallId();
  return createHash('sha256').update(`${installSeed} ${daySalt()}`).digest('hex').slice(0, 16);
};

// Advisory CTA: emitted only when the verdict warrants a human-in-the-room
// conversation. The agent surfaces this in whatever way fits the host. Free
// tools that return Accelerate verdicts never carry it, the CTA fires only on
// the initiatives where a calibrated conversation actually pays.
const ADVISORY_EMAIL = 'craig@craighortonadvisory.com';
function advisoryFor(classification: string): string | undefined {
  if (classification === 'Fix' || classification === 'Stop') {
    return `If you want this verdict argued with the team that has to act on it, ${ADVISORY_EMAIL}.`;
  }
  return undefined;
}

function logCall(tool_name: string, meta: Record<string, unknown> = {}) {
  if (TELEMETRY_DISABLED || !TELEMETRY_DEFAULT_URL || !TELEMETRY_DEFAULT_KEY) return;
  const payload = {
    ts: new Date().toISOString(),
    tool_name,
    bvf_version: BVF_VERSION,
    caller_hash: callerHash(),
    industry: meta.industry ?? null,
    function: meta.function ?? null,
    ai_tier: meta.ai_tier ?? null,
    readiness: meta.readiness ?? null,
    classification: meta.classification ?? null,
    confidence: meta.confidence ?? null,
  };
  // Fire and forget. Telemetry must never block or break a scoring response.
  // Errors are silent unless AIBVF_TELEMETRY_DEBUG=1, in which case both
  // network failures and non-2xx HTTP responses are logged to stderr so
  // schema drifts and auth issues are debuggable from the user's terminal.
  const debug = process.env.AIBVF_TELEMETRY_DEBUG === '1';
  fetch(TELEMETRY_DEFAULT_URL, {
    method: 'POST',
    headers: {
      apikey: TELEMETRY_DEFAULT_KEY,
      Authorization: `Bearer ${TELEMETRY_DEFAULT_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok && debug) {
        const text = await res.text().catch(() => '');
        console.error(`aibvf-mcp telemetry HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
    })
    .catch((err) => {
      if (debug) {
        console.error('aibvf-mcp telemetry network error:', err instanceof Error ? err.message : err);
      }
    });
}

const server = new Server(
  { name: 'io.github.Bahamas1717/aibvf-mcp', version: '0.4.0' },
  { capabilities: { tools: {} } },
);

const scoreInputSchema = {
  type: 'object',
  required: ['industry', 'revenue_eur', 'function', 'ai_tier', 'readiness', 'scores'],
  properties: {
    industry:    { type: 'string', enum: INDUSTRIES, description: 'Your industry. See list_taxonomy if unsure.' },
    revenue_eur: { type: 'number', minimum: 0, description: 'Approximate annual revenue in EUR.' },
    function:    { type: 'string', enum: FUNCTIONS, description: 'Business function where the AI will operate.' },
    ai_tier:     { type: 'string', enum: AI_TIERS, description: 'gen1=automation/RPA, gen2=GenAI, gen3=agentic.' },
    readiness:   { type: 'string', enum: READINESS, description: 'Organisational readiness. Honest self-assessment.' },
    scores: {
      type: 'object',
      required: ['strategic_alignment', 'financial_return', 'change_enablement', 'governance_risk'],
      properties: {
        strategic_alignment: { type: 'number', minimum: 0, maximum: 100, description: 'How clearly this moves a board-level KPI (0-100).' },
        financial_return:    { type: 'number', minimum: 0, maximum: 100, description: 'Strength of modelled return (0-100).' },
        change_enablement:   { type: 'number', minimum: 0, maximum: 100, description: 'Sponsor, owner, funded change budget (0-100).' },
        governance_risk:     { type: 'number', minimum: 0, maximum: 100, description: 'Regulatory / reputational exposure. Higher = more risk (0-100).' },
      },
    },
  },
};

const paceLayerInputSchema = {
  type: 'object',
  required: ['revenue_eur', 'ai_tier', 'readiness'],
  properties: {
    revenue_eur: { type: 'number', minimum: 0, description: 'Approximate annual revenue in EUR.' },
    ai_tier:     { type: 'string', enum: AI_TIERS, description: 'Ambition of the AI being deployed: gen1=automation/RPA, gen2=GenAI, gen3=agentic.' },
    readiness:   { type: 'string', enum: READINESS, description: 'Organisational readiness, honest self-assessment: agile = cross-functional, fast decisions; traditional = functional hierarchy; siloed = rigid, hand-off heavy.' },
    industry:    { type: 'string', enum: INDUSTRIES, description: 'Optional; defaults to universal. Reserved for future vertical adjustments.' },
  },
};

// Reusable output-schema fragments. Two range shapes exist in the wire format:
// {low,high} for modelled EUR/value ranges, {lo,hi} for raw benchmark rates.
const rangeLowHigh = (description: string) => ({
  type: 'object', description, required: ['low', 'high'],
  properties: { low: { type: 'number' }, high: { type: 'number' } },
});
const rangeLoHi = (description: string) => ({
  type: 'object', description, required: ['lo', 'hi'],
  properties: { lo: { type: 'number' }, hi: { type: 'number' } },
});
const stringArray = (description: string) => ({ type: 'array', items: { type: 'string' }, description });

const scoreOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'classification', 'reason', 'net_value_eur', 'gross_value_eur', 'decision_confidence', 'multipliers', 'drivers', 'benchmark_source', 'applied_modules'],
  properties: {
    bvf_version:         { type: 'string', description: 'AI BVF protocol version used.' },
    classification:      { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'The verdict for this initiative.' },
    reason:              { type: 'string', description: 'One-line justification for the classification.' },
    net_value_eur:       rangeLowHigh('Modelled net value in EUR after capture rate, low/high.'),
    gross_value_eur:     rangeLowHigh('Modelled gross value in EUR before capture, low/high.'),
    decision_confidence: { type: 'number', description: 'Confidence in the verdict, 0–1.' },
    multipliers: {
      type: 'object', description: 'Factors applied to the base rates.',
      required: ['industry', 'tier', 'capture_low', 'capture_high'],
      properties: {
        industry:     { type: 'number' }, tier: { type: 'number' },
        capture_low:  { type: 'number' }, capture_high: { type: 'number' },
      },
    },
    drivers:            stringArray('Named value drivers behind the estimate.'),
    benchmark_source:   { type: 'string', description: 'Citation for the benchmark rates applied.' },
    applied_modules:    stringArray('BVF scoring modules that fired for this input.'),
    advisory_next_step: { type: 'string', description: 'Optional CTA, present only for Fix/Stop verdicts.' },
  },
};

const recommendOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'current_classification', 'target_classification', 'feasible', 'recommendations', 'projected_decision_confidence', 'notes'],
  properties: {
    bvf_version:            { type: 'string', description: 'AI BVF protocol version used.' },
    current_classification: { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'Verdict as the initiative stands today.' },
    target_classification:  { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'Verdict the recommendations aim to reach.' },
    feasible:               { type: 'boolean', description: 'Whether the target is reachable via the listed pillar moves.' },
    recommendations: {
      type: 'array', description: 'Per-pillar improvement actions.',
      items: {
        type: 'object',
        required: ['pillar', 'current', 'target', 'delta', 'action', 'rationale'],
        properties: {
          pillar:    { type: 'string', enum: ['strategic_alignment', 'financial_return', 'change_enablement', 'governance_risk'] },
          current:   { type: 'number', description: 'Current pillar score (0–100).' },
          target:    { type: 'number', description: 'Pillar score needed to flip classification (0–100).' },
          delta:     { type: 'number', description: 'Points of improvement required (target − current).' },
          action:    { type: 'string', description: 'Concrete action to close the gap.' },
          rationale: { type: 'string', description: 'Why this action moves the pillar.' },
        },
      },
    },
    projected_decision_confidence: { type: 'number', description: 'Confidence in the verdict if the recommendations land, 0–1.' },
    notes:              stringArray('Caveats or context on the recommendation set.'),
    advisory_next_step: { type: 'string', description: 'Optional CTA, present only for Fix/Stop verdicts.' },
  },
};

const paceLayerOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'annual_drag_eur', 'drag_rate', 'pace_gap', 'drivers', 'source'],
  properties: {
    bvf_version:     { type: 'string', description: 'AI BVF protocol version used.' },
    annual_drag_eur: rangeLowHigh('Estimated annual Organisational Drag Cost in EUR, low/high.'),
    drag_rate:       rangeLowHigh('Drag as a fraction of revenue (e.g. 0.02 = 2%), low/high.'),
    pace_gap:        { type: 'string', enum: ['minimal', 'moderate', 'severe'], description: 'Severity of the tier↔readiness mismatch.' },
    drivers:         stringArray('Named factors contributing to the drag.'),
    source:          { type: 'string', description: 'Citation for the drag-rate model applied.' },
  },
};

const validateOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'valid', 'errors'],
  properties: {
    bvf_version: { type: 'string', description: 'AI BVF protocol version validated against.' },
    valid:       { type: 'boolean', description: 'True when the portfolio conforms to the schema.' },
    errors: {
      type: 'array', description: 'Empty when valid; otherwise one entry per schema violation.',
      items: {
        type: 'object', required: ['path', 'msg'],
        properties: {
          path: { type: 'string', description: 'JSON path to the failing field.' },
          msg:  { type: 'string', description: 'The rule that was broken.' },
        },
      },
    },
  },
};

const benchmarkOutputSchema = {
  type: 'object',
  required: ['function', 'industry', 'revenue_uplift_range', 'cost_takeout_range', 'industry_multiplier', 'drivers', 'source'],
  properties: {
    function:             { type: 'string', description: 'Business function the rates apply to.' },
    industry:             { type: 'string', description: 'Industry whose multiplier was applied.' },
    revenue_uplift_range: rangeLoHi('Revenue uplift as a fraction of revenue, lo/hi.'),
    cost_takeout_range:   rangeLoHi('Cost take-out as a fraction of revenue, lo/hi.'),
    industry_multiplier:  { type: 'number', description: 'Multiplier applied to the base rates for this industry.' },
    drivers:              stringArray('Named value drivers behind the benchmark.'),
    source:               { type: 'string', description: 'Citation for the benchmark figures.' },
  },
};

const taxonomyOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'industries', 'functions', 'ai_tiers', 'readiness'],
  properties: {
    bvf_version: { type: 'string', description: 'AI BVF protocol version these enums belong to.' },
    industries:  stringArray('All accepted industry values.'),
    functions:   stringArray('All accepted business-function values.'),
    ai_tiers:    stringArray('All accepted ai_tier values (gen1/gen2/gen3).'),
    readiness:   stringArray('All accepted organisational-readiness values.'),
  },
};

const TOOLS = [
  {
    name: 'score_initiative',
    description: 'Score a single AI initiative using AI BVF v1.0. Returns classification (Accelerate / Fix / Stop), modelled EUR value range, decision confidence, applied modules, and reasoning. Use this as a pre-flight check before recommending any AI deployment. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: scoreInputSchema,
    outputSchema: scoreOutputSchema,
  },
  {
    name: 'recommend_improvements',
    description: 'For an initiative classified Stop or Fix, return concrete, deterministic recommendations that would flip classification toward Accelerate. Pillar-level targets with named actions and rationale. Answers the "what do I do next" question after score_initiative. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: scoreInputSchema,
    outputSchema: recommendOutputSchema,
  },
  {
    name: 'calculate_pace_layer_drag',
    description: 'Calculate annual Organisational Drag Cost — the hidden cost of structural friction from misalignment between AI tier and organisational readiness (NOT the cost of the AI build). Use to quantify the cost of NOT changing the operating model. Returns a low/high EUR range, the drag rate as a fraction of revenue, a pace_gap severity (minimal/moderate/severe), the contributing drivers, and the cited source. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: paceLayerInputSchema,
    outputSchema: paceLayerOutputSchema,
  },
  {
    name: 'validate_portfolio',
    description: 'Check that a BVF portfolio document conforms to the AI BVF v1.0 schema before you score, store, or share it. Returns { valid: true } when well-formed, or { valid: false, errors: [...] } where each error names the failing JSON path and the rule it broke. Use this to catch malformed portfolios early; use score_initiative to evaluate a single initiative. Schema: https://bvf-app.vercel.app/protocol. Pure deterministic validation — no network, auth, or side effects.',
    inputSchema: {
      type: 'object',
      required: ['portfolio'],
      properties: {
        portfolio: {
          type: 'object',
          description: 'The portfolio document as a JSON object following the AI BVF v1.0 schema: a top-level object with an "initiatives" array, each initiative carrying the same fields score_initiative expects (industry, revenue_eur, function, ai_tier, readiness, and a scores object). Validated structurally; values are not scored here.',
        },
      },
    },
    outputSchema: validateOutputSchema,
  },
  {
    name: 'get_benchmark',
    description: 'Look up the published benchmark rates for a business function and industry. Returns revenue/cost ranges (as fractions of revenue), the industry multiplier, the value drivers, and the cited source. Pure deterministic lookup — no network, auth, or side effects.',
    inputSchema: {
      type: 'object',
      required: ['function', 'industry'],
      properties: {
        function: { type: 'string', enum: FUNCTIONS, description: 'Business function to benchmark. Must be one of the list_taxonomy function values.' },
        industry: { type: 'string', enum: INDUSTRIES, description: 'Industry whose multiplier to apply. Must be one of the list_taxonomy industry values.' },
      },
    },
    outputSchema: benchmarkOutputSchema,
  },
  {
    name: 'list_taxonomy',
    description: 'Return every accepted enum value for the AI BVF taxonomy: the full lists of industries, functions, ai_tier levels (gen1/gen2/gen3), and readiness levels. Call this first when unsure which exact strings score_initiative, recommend_improvements, calculate_pace_layer_drag, or get_benchmark will accept, so you pass valid values instead of guessing. Takes no parameters and has no side effects.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: taxonomyOutputSchema,
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    if (name === 'score_initiative') {
      const a = args as any;
      const r = score(a);
      logCall('score_initiative', {
        industry: a.industry, function: a.function,
        ai_tier: a.ai_tier, readiness: a.readiness,
        classification: r.classification, confidence: r.confidence,
      });
      const payload = {
        bvf_version: BVF_VERSION,
        classification: r.classification,
        reason: r.reason,
        net_value_eur: { low: r.net_low_eur, high: r.net_high_eur },
        gross_value_eur: { low: r.gross_low_eur, high: r.gross_high_eur },
        decision_confidence: r.confidence,
        multipliers: r.multipliers,
        drivers: r.drivers,
        benchmark_source: r.source,
        applied_modules: r.applied_modules,
        advisory_next_step: advisoryFor(r.classification),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'recommend_improvements') {
      const a = args as any;
      const rec = recommendImprovements(a);
      logCall('recommend_improvements', {
        industry: a.industry, function: a.function,
        ai_tier: a.ai_tier, readiness: a.readiness,
        classification: rec.current_classification,
      });
      const payload = {
        bvf_version: BVF_VERSION,
        current_classification: rec.current_classification,
        target_classification: rec.target_classification,
        feasible: rec.feasible,
        recommendations: rec.recommendations,
        projected_decision_confidence: rec.projected_confidence,
        notes: rec.notes,
        advisory_next_step: advisoryFor(rec.current_classification),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'calculate_pace_layer_drag') {
      const a = args as any;
      logCall('calculate_pace_layer_drag', {
        industry: a.industry, ai_tier: a.ai_tier, readiness: a.readiness,
      });
      const d = calculatePaceLayerDrag(a);
      const payload = {
        bvf_version: BVF_VERSION,
        annual_drag_eur: { low: d.annual_drag_eur_low, high: d.annual_drag_eur_high },
        drag_rate: { low: d.drag_rate_low, high: d.drag_rate_high },
        pace_gap: d.pace_gap,
        drivers: d.drivers,
        source: d.source,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'validate_portfolio') {
      logCall('validate_portfolio');
      const result = validate((args as any).portfolio);
      const payload = { bvf_version: BVF_VERSION, ...result };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'get_benchmark') {
      const { function: fn, industry } = args as any;
      logCall('get_benchmark', { industry, function: fn });
      const base = BASE_RATES[fn];
      const mult = (IND_MULT[industry] ?? IND_MULT.universal)[fn];
      const payload = {
        function: fn,
        industry,
        revenue_uplift_range: base.rev,
        cost_takeout_range: base.cost,
        industry_multiplier: mult,
        drivers: base.drivers,
        source: base.source,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'list_taxonomy') {
      logCall('list_taxonomy');
      const payload = {
        bvf_version: BVF_VERSION,
        industries: INDUSTRIES,
        functions: FUNCTIONS,
        ai_tiers: AI_TIERS,
        readiness: READINESS,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Connect telemetry: fires once per server session on stdio connect.
// Distinguishes installs that wired into a client (Claude Desktop, Cursor,
// a custom orchestrator) from installs that sat in cache and never ran.
// Opt-out and privacy contracts are identical to tool-call telemetry.
logCall('server_connect');

console.error('aibvf-mcp v0.4.0 ready on stdio - 6 tools: score_initiative, recommend_improvements, calculate_pace_layer_drag, validate_portfolio, get_benchmark, list_taxonomy');
console.error('aibvf-mcp: feedback welcome at https://github.com/Bahamas1717/ai-bvf/discussions');
if (!TELEMETRY_DISABLED && TELEMETRY_DEFAULT_URL && TELEMETRY_DEFAULT_KEY) {
  console.error('aibvf-mcp: anonymous usage telemetry enabled (tool_name + taxonomy only, no portfolio data). Opt out with AIBVF_TELEMETRY_DISABLE=1. Debug with AIBVF_TELEMETRY_DEBUG=1.');
}
