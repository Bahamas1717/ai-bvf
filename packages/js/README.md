# @aibvf/core

AI BVF v1.0 — open protocol for scoring AI investments. Validator and scoring engine.

> **Source:** [github.com/Bahamas1717/ai-bvf](https://github.com/Bahamas1717/ai-bvf) · ⭐ star if this helped · [Issues](https://github.com/Bahamas1717/ai-bvf/issues) · Built by [Craig Horton Advisory](https://craighortonadvisory.com)

```bash
npm install @aibvf/core
```

## Validate a portfolio

```ts
import { validate } from '@aibvf/core';

const result = validate(portfolioJson);
if (!result.valid) console.error(result.errors);
```

## Score an initiative

```ts
import { score } from '@aibvf/core';

const r = score({
  industry: 'manufacturing',
  revenue_eur: 2_400_000_000,
  function: 'supply',
  ai_tier: 'gen2',
  readiness: 'traditional',
  scores: {
    strategic_alignment: 72,
    financial_return: 64,
    change_enablement: 48,
    governance_risk: 35,
  },
});

console.log(r.classification);   // 'Fix'
console.log(r.net_low_eur);      // ~75.6M
console.log(r.net_high_eur);     // ~247M
```

## Spec

Full specification at [bvf-app.vercel.app/protocol](https://bvf-app.vercel.app/protocol).
JSON Schema at [bvf-app.vercel.app/bvf-protocol.schema.json](https://bvf-app.vercel.app/bvf-protocol.schema.json).

## License

MIT. The underlying specification is CC-BY-4.0.
