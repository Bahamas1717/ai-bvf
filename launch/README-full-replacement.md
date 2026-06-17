# aibvf-mcp

The scoring tool your Claude agent calls before it recommends an AI deployment. Four pillars, published benchmarks, deterministic classification of Accelerate, Fix, or Stop, with modelled EUR value, decision confidence, and a specific list of what to do next.

[![npm](https://img.shields.io/npm/v/aibvf-mcp?color=111&label=npm)](https://www.npmjs.com/package/aibvf-mcp)
[![mcp registry](https://img.shields.io/badge/mcp--registry-active-111)](https://registry.modelcontextprotocol.io/servers?search=aibvf)
[![license](https://img.shields.io/badge/license-MIT-111)](LICENSE)

## What It Does

Six tools on stdio, each callable from any MCP-compatible agent.

| Tool | Purpose |
|---|---|
| `score_initiative` | Four-pillar score returns Accelerate, Fix, or Stop with EUR value range, decision confidence, applied modules, reasoning. |
| `recommend_improvements` | For Stop or Fix, returns the specific pillar raises that would flip the call toward Accelerate. |
| `calculate_pace_layer_drag` | Annual Organisational Drag Cost in EUR from AI-tier vs operating-model misalignment. |
| `validate_portfolio` | Validates a portfolio JSON document against the BVF v1.0 schema. |
| `get_benchmark` | Looks up published benchmark rates for a business function and industry. |
| `list_taxonomy` | Returns valid values for industries, functions, AI tiers, readiness levels. |

## 30-Second Install

```bash
npm install -g aibvf-mcp
```

Register with Claude Desktop, Claude Code, or any MCP client:

```json
{
  "mcpServers": {
    "aibvf": { "command": "aibvf-mcp" }
  }
}
```

Ask your agent: "score a gen2 CX AI initiative for a 400M EUR retailer, traditional readiness, SA 70, FR 50, CE 55, GR 45," and the agent will call `score_initiative`, return a Fix classification with a concrete gap list, and offer to call `recommend_improvements` next.

## Why This Exists

Agents confidently recommend AI projects with no reference to the business case, no reference to operating-model readiness, and no reference to governance exposure. The scoring belongs in the agent's pre-flight check, not in a slide deck written after the decision.

The protocol is open, the benchmarks cite McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow, and readiness capture rates come from EY/Oxford and Prosci change-success research.

## The Four Pillars

Every initiative is scored on four pillars, 0 to 100, honest self-assessment.

1. **Strategic Alignment** — how clearly this moves a board-level KPI.
2. **Financial Return** — strength of the modelled return.
3. **Change Enablement** — sponsor in place, owner named, change budget funded.
4. **Governance Risk** — regulatory and reputational exposure. Higher value means more risk.

Rules are deterministic, no network, no dependencies. `GR >= 70` or `FR <= 20` returns Stop, all four pillars at or above 60 with `GR <= 40` returns Accelerate, anything else returns Fix with a specific gap list.

See `docs/scoring-formulas.md` for every formula and `docs/worked-example.md` for a full run on a healthcare portfolio.

## Example: Scoring an Agentic Healthcare Initiative

```js
import { score, recommendImprovements, calculatePaceLayerDrag } from '@aibvf/core';

const r = score({
  industry: 'healthcare',
  revenue_eur: 800_000_000,
  function: 'cx',
  ai_tier: 'gen3',
  readiness: 'traditional',
  scores: {
    strategic_alignment: 75,
    financial_return:    55,
    change_enablement:   40,
    governance_risk:     55,
  },
});
// { classification: 'Fix', net_low_eur: 23_760_000, net_high_eur: 83_160_000,
//   confidence: 54, applied_modules: ['four_pillar_base',
//   'readiness_capture_traditional', 'healthcare_clinical_validation',
//   'healthcare_regulatory_overhead'], ... }
```

Same inputs through `recommendImprovements` return three pillar raises, each with a named action, and project a new decision confidence of 68 with target classification Accelerate. `calculatePaceLayerDrag({ revenue_eur: 800_000_000, ai_tier: 'gen3', readiness: 'traditional' })` returns 20M to 36M EUR of annual Organisational Drag Cost, the structural friction cost of running gen3 in a traditional operating model, separate from the AI build.

## Packages

| Package | Version | Purpose |
|---|---|---|
| [`aibvf-mcp`](packages/mcp) | 0.2.0 | MCP server, stdio transport. |
| [`@aibvf/core`](packages/js) | 0.2.0 | TypeScript scoring engine and validator. |
| [`aibvf`](packages/py) | 0.2.0 | Python scoring engine and validator. |

## Anonymous Usage Telemetry

The MCP server reports a small anonymous payload on each tool call, tool name, BVF version, taxonomy fields, a daily-rotated caller hash, and classification plus confidence for `score_initiative`. No portfolio content, no revenue figures, no user identifiers. Opt out with `AIBVF_TELEMETRY_DISABLE=1`. Point at your own backend with `AIBVF_TELEMETRY_URL` and `AIBVF_TELEMETRY_KEY`.

## Protocol

Full schema at `spec/bvf-protocol.schema.json`. Protocol page at [www.aibvf.com/protocol](https://www.aibvf.com/protocol).

## Contributing

The benchmark ranges are directional, the industry multipliers are a starting calibration, and the protocol depends on public review to improve. File an issue or push a PR. The calibration will argue itself out in public.

## License

MIT for the schema, the scoring engine, and the MCP server. The benchmark corpus and certification marks are proprietary.

Author: Craig Horton.
