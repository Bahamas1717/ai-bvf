# aibvf-mcp

MCP server exposing AI BVF v1.0 to any Claude agent. Pre-flight-check your AI initiatives before you deploy them.

## Install and run

```bash
npx aibvf-mcp
```

## Wire into Claude Desktop / Cursor / any MCP host

Add to your MCP config:

```json
{
  "mcpServers": {
    "aibvf": {
      "command": "npx",
      "args": ["-y", "aibvf-mcp"]
    }
  }
}
```

Then ask Claude:

> *"Score this AI initiative using AI BVF: we're a €2.4bn manufacturer, planning a GenAI predictive maintenance rollout in our EU plants, we're a traditional hierarchy, strong sponsor, modest change budget."*

Claude will call `score_initiative` and return the classification, euro range, and reasoning.

## Tools exposed

| Tool | Purpose |
|---|---|
| `score_initiative` | Return classification (Accelerate/Fix/Stop), euro range, and reasoning for one initiative. |
| `validate_portfolio` | Check a BVF portfolio JSON against the v1.0 schema. |
| `get_benchmark` | Return the published benchmark base-rate and industry multiplier for a function + industry. |
| `list_taxonomy` | List the valid industries, functions, AI tiers, and readiness levels. |

## Spec

<https://bvf-app.vercel.app/protocol>

## License

MIT.
