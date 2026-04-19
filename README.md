# AI BVF

Open protocol for scoring AI investments. Dual-licensed: grammar under CC-BY-4.0, code under MIT, benchmark corpus and certification marks proprietary.

## Packages

| Package | Install | Purpose |
|---|---|---|
| [`@aibvf/core`](./packages/js) | `npm i @aibvf/core` | JS/TS validator + scoring engine |
| [`aibvf`](./packages/py) | `pip install aibvf` | Python validator + scoring engine |
| [`aibvf-mcp`](./packages/mcp) | `npx aibvf-mcp` | MCP server: makes the scorer callable from any Claude agent |

All three ship the same scoring logic and validate against the same [JSON Schema](./spec/bvf-protocol.schema.json).

## Quick use

### JavaScript

```js
import { score, validate } from '@aibvf/core';

const result = score({
  industry: 'manufacturing',
  revenue_eur: 2_400_000_000,
  function: 'supply',
  ai_tier: 'gen2',
  readiness: 'traditional',
  scores: {
    strategic_alignment: 72,
    financial_return:    64,
    change_enablement:   48,
    governance_risk:     35,
  },
});
// => { classification: 'Fix', net_low_eur: 75_600_000, net_high_eur: 247_000_000, ... }
```

### Python

```python
from aibvf import score, validate

result = score(
    industry='manufacturing',
    revenue_eur=2_400_000_000,
    function='supply',
    ai_tier='gen2',
    readiness='traditional',
    scores={'strategic_alignment': 72, 'financial_return': 64,
            'change_enablement': 48, 'governance_risk': 35},
)
```

### MCP (from Claude Desktop / Cursor / any MCP host)

Add to your MCP config:

```json
{
  "mcpServers": {
    "aibvf": { "command": "npx", "args": ["-y", "aibvf-mcp"] }
  }
}
```

Then ask Claude: *"Score this AI initiative using AI BVF"* and Claude will call the tool.

## Publishing

```bash
# JS + MCP
npm install
npm -w @aibvf/core run build
npm -w @aibvf/core publish --access public
npm -w aibvf-mcp run build
npm -w aibvf-mcp publish --access public

# Python
cd packages/py
python -m build
twine upload dist/*
```

## Spec

[bvf-protocol.schema.json](./spec/bvf-protocol.schema.json) is the canonical JSON Schema. The narrative specification lives at [bvf-app.vercel.app/protocol](https://bvf-app.vercel.app/protocol).

## License

- **Code** (all packages): MIT
- **Spec text** (`./spec/`): CC-BY-4.0
- **AI BVF**, **AI BVF Certified**, logo: trademark, not licensed under either of the above.
