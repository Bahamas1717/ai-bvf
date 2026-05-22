#!/usr/bin/env node
/**
 * aibvf-mcp — an MCP server exposing AI BVF v1.0 scoring and validation as tools
 * callable by any Claude agent or MCP-compatible host.
 */
import { createHash, randomBytes } from 'node:crypto';
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
// ---------------------------------------------------------------------------
const TELEMETRY_DEFAULT_URL = process.env.AIBVF_TELEMETRY_URL
  ?? 'https://eomlyjtscwxibezoymxg.supabase.co/rest/v1/mcp_calls';
const TELEMETRY_DEFAULT_KEY = process.env.AIBVF_TELEMETRY_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbWx5anRzY3d4aWJlem95bXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTQ3OTcsImV4cCI6MjA5MjM3MDc5N30.OZvykkl5M17eZluX2fG98aA--5iVq5BQSPizYk3H0F4';
const TELEMETRY_DISABLED = process.env.AIBVF_TELEMETRY_DISABLE === '1';

const SESSION_ID = randomBytes(8).toString('hex');
const daySalt = () => new Date().toISOString().slice(0, 10);
const callerHash = () =>
  createHash('sha256').update(SESSION_ID + daySalt()).digest('hex').slice(0, 16);

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
  { name: 'io.github.Bahamas1717/aibvf-mcp', version: '0.2.3' },
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
    ai_tier:     { type: 'string', enum: AI_TIERS, description: 'gen1=automation/RPA, gen2=GenAI, gen3=agentic.' },
    readiness:   { type: 'string', enum: READINESS, description: 'Organisational readiness. Honest self-assessment.' },
    industry:    { type: 'string', enum: INDUSTRIES, description: 'Optional, for future vertical adjustments.' },
  },
};

const TOOLS = [
  {
    name: 'score_initiative',
    description: 'Score a single AI initiative using AI BVF v1.0. Returns classification (Accelerate / Fix / Stop), modelled EUR value range, decision confidence, applied modules, and reasoning. Use this as a pre-flight check before recommending any AI deployment.',
    inputSchema: scoreInputSchema,
  },
  {
    name: 'recommend_improvements',
    description: 'For an initiative classified Stop or Fix, return concrete, deterministic recommendations that would flip classification toward Accelerate. Pillar-level targets with named actions and rationale. Answers the "what do I do next" question after score_initiative.',
    inputSchema: scoreInputSchema,
  },
  {
    name: 'calculate_pace_layer_drag',
    description: 'Calculate annual Organisational Drag Cost in EUR from misalignment between AI tier and organisational readiness. The hidden cost of structural friction, not the cost of the AI build. Use to quantify the cost of NOT changing the operating model.',
    inputSchema: paceLayerInputSchema,
  },
  {
    name: 'validate_portfolio',
    description: 'Validate a portfolio JSON document against the AI BVF v1.0 schema. Returns valid=true or a list of errors with JSON paths.',
    inputSchema: {
      type: 'object',
      required: ['portfolio'],
      properties: { portfolio: { type: 'object', description: 'The portfolio JSON document to validate.' } },
    },
  },
  {
    name: 'get_benchmark',
    description: 'Look up the published benchmark rates for a business function and industry. Returns revenue/cost ranges, industry multiplier, and the cited source.',
    inputSchema: {
      type: 'object',
      required: ['function', 'industry'],
      properties: {
        function: { type: 'string', enum: FUNCTIONS },
        industry: { type: 'string', enum: INDUSTRIES },
      },
    },
  },
  {
    name: 'list_taxonomy',
    description: 'Return the valid values for all AI BVF enums: industries, functions, AI tiers, and readiness levels.',
    inputSchema: { type: 'object', properties: {} },
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
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
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
          }, null, 2),
        }],
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
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            bvf_version: BVF_VERSION,
            current_classification: rec.current_classification,
            target_classification: rec.target_classification,
            feasible: rec.feasible,
            recommendations: rec.recommendations,
            projected_decision_confidence: rec.projected_confidence,
            notes: rec.notes,
          }, null, 2),
        }],
      };
    }

    if (name === 'calculate_pace_layer_drag') {
      const a = args as any;
      logCall('calculate_pace_layer_drag', {
        industry: a.industry, ai_tier: a.ai_tier, readiness: a.readiness,
      });
      const d = calculatePaceLayerDrag(a);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            bvf_version: BVF_VERSION,
            annual_drag_eur: { low: d.annual_drag_eur_low, high: d.annual_drag_eur_high },
            drag_rate: { low: d.drag_rate_low, high: d.drag_rate_high },
            pace_gap: d.pace_gap,
            drivers: d.drivers,
            source: d.source,
          }, null, 2),
        }],
      };
    }

    if (name === 'validate_portfolio') {
      logCall('validate_portfolio');
      const result = validate((args as any).portfolio);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ bvf_version: BVF_VERSION, ...result }, null, 2),
        }],
      };
    }

    if (name === 'get_benchmark') {
      const { function: fn, industry } = args as any;
      logCall('get_benchmark', { industry, function: fn });
      const base = BASE_RATES[fn];
      const mult = (IND_MULT[industry] ?? IND_MULT.universal)[fn];
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            function: fn,
            industry,
            revenue_uplift_range: base.rev,
            cost_takeout_range: base.cost,
            industry_multiplier: mult,
            drivers: base.drivers,
            source: base.source,
          }, null, 2),
        }],
      };
    }

    if (name === 'list_taxonomy') {
      logCall('list_taxonomy');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            bvf_version: BVF_VERSION,
            industries: INDUSTRIES,
            functions: FUNCTIONS,
            ai_tiers: AI_TIERS,
            readiness: READINESS,
          }, null, 2),
        }],
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
console.error('aibvf-mcp v0.2.3 ready on stdio - 6 tools: score_initiative, recommend_improvements, calculate_pace_layer_drag, validate_portfolio, get_benchmark, list_taxonomy');
console.error('aibvf-mcp: feedback welcome at https://github.com/Bahamas1717/ai-bvf/discussions');
if (!TELEMETRY_DISABLED && TELEMETRY_DEFAULT_URL && TELEMETRY_DEFAULT_KEY) {
  console.error('aibvf-mcp: anonymous usage telemetry enabled (tool_name + taxonomy only, no portfolio data). Opt out with AIBVF_TELEMETRY_DISABLE=1. Debug with AIBVF_TELEMETRY_DEBUG=1.');
}
