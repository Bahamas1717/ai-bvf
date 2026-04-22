# README Hero Section (drop-in for the top of README.md)

# aibvf-mcp

The scoring tool your Claude agent calls before it recommends an AI deployment. Four pillars, published benchmarks, deterministic classification of Accelerate, Fix, or Stop, with modelled EUR value, decision confidence, and a specific list of what to do next.

[![npm](https://img.shields.io/npm/v/aibvf-mcp?color=111&label=npm)](https://www.npmjs.com/package/aibvf-mcp)
[![mcp registry](https://img.shields.io/badge/mcp--registry-active-111)](https://registry.modelcontextprotocol.io/servers?search=aibvf)
[![license](https://img.shields.io/badge/license-MIT-111)](LICENSE)

## What It Does

Six tools on stdio, each callable from any MCP-compatible agent:

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

Register with Claude Desktop, Claude Code, or any MCP client by adding the server:

```json
{
  "mcpServers": {
    "aibvf": { "command": "aibvf-mcp" }
  }
}
```

Ask your agent: "score a gen2 CX AI initiative for a 400M EUR retailer, traditional readiness, SA 70, FR 50, CE 55, GR 45," and the agent will call `score_initiative`, return a Fix classification with a concrete gap list, and offer to call `recommend_improvements` next.

## Why This Exists

Agents confidently recommend AI projects with no reference to the business case, no reference to operating-model readiness, and no reference to governance exposure. The scoring belongs in the agent's pre-flight check, not in a slide deck written after the decision. The protocol is open, the benchmarks cite McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow, and readiness capture rates come from EY/Oxford and Prosci change-success research.

See `docs/scoring-formulas.md` for every formula and `docs/worked-example.md` for a full run on a healthcare portfolio.
