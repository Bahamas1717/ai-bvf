#!/usr/bin/env node
/**
 * aibvf-mcp — an MCP server exposing AI BVF v1.0 scoring and validation as tools
 * callable by any Claude agent or MCP-compatible host.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  score, validate, BASE_RATES, IND_MULT,
  INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS, BVF_VERSION,
} from '@aibvf/core';

const server = new Server(
  { name: 'aibvf-mcp', version: '0.1.0' },
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

const TOOLS = [
  {
    name: 'score_initiative',
    description: 'Score a single AI initiative using AI BVF v1.0. Returns classification (Accelerate / Fix / Stop), modelled EUR value range, decision confidence, and reasoning. Use this as a pre-flight check before recommending any AI deployment.',
    inputSchema: scoreInputSchema,
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
      const r = score(args as any);
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
          }, null, 2),
        }],
      };
    }

    if (name === 'validate_portfolio') {
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
console.error('aibvf-mcp v0.1.0 ready on stdio');
