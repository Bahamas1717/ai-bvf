# aibvf-check

**SonarQube for AI initiatives.** A CI/CD pre-flight gate that fails the build when a declared AI initiative would not survive a board review — using the deterministic [AI BVF v1.0](https://www.aibvf.com/protocol) engine.

The scoring belongs upstream of the slide deck. `aibvf-check` puts it in the one place a team already trusts to block bad work: the pipeline.

## 30-second use

Add a manifest at your repo root, `.aibvf.json`:

```json
{
  "bvf_version": "1.0",
  "organization": { "industry": "financial", "revenue_eur": 400000000 },
  "policy": { "fail_on": ["Stop"], "max_governance_risk": 60, "min_decision_confidence": 50 },
  "initiatives": [
    { "id": "cx-genai-assistant", "function": "cx", "ai_tier": "gen2", "readiness": "traditional",
      "scores": { "strategic_alignment": 70, "financial_return": 55, "change_enablement": 55, "governance_risk": 45 },
      "signal_completeness": 0.8 }
  ]
}
```

Run it:

```bash
npx aibvf-check
```

It scores every initiative, prints a scorecard, and **exits non-zero if any trips the policy** — so CI goes red.

## GitHub Action

```yaml
- uses: Bahamas1717/ai-bvf@main
  with:
    manifest: .aibvf.json   # optional, this is the default
```

The step fails the workflow on any policy violation.

## Policy

| Field | Effect |
|---|---|
| `fail_on` | Classifications that fail the gate. Default `["Stop"]`. Add `"Fix"` to be strict. |
| `max_governance_risk` | Optional hard ceiling (0–100). A higher `governance_risk` fails, regardless of verdict. |
| `min_decision_confidence` | Optional floor (0–100). A lower decision confidence fails. |

`signal_completeness` (0–1, per initiative) forwards to the engine: estimated inputs honestly haircut confidence and surface a caveat, so a low-evidence initiative can't sail through on a confident-looking number.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All initiatives cleared the policy. |
| `1` | One or more policy violations — the gate failed. |
| `2` | Config error (manifest missing, malformed, or a bad enum value). |

## Options

```
aibvf-check [--manifest <path>] [--json]
  -m, --manifest <path>   Manifest file (default: .aibvf.json)
      --json              Machine-readable JSON instead of the table
  -h, --help              Help
```

Deterministic, no network, no telemetry. Same inputs → same verdict, every run. Built on [`@aibvf/core`](https://www.npmjs.com/package/@aibvf/core).

## License

MIT.
