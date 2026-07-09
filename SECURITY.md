# Security policy

The AI BVF scoring engine is deterministic and runs no inbound network path beyond the MCP stdio transport. Telemetry is fire-and-forget HTTPS to a single Supabase endpoint, opt-out via `AIBVF_TELEMETRY_DISABLE=1`. The benchmark corpus and scoring math live in source, not behind a network call.

## Reporting a vulnerability

Use GitHub's [Security Advisories](https://github.com/craig-horton/ai-bvf/security/advisories) to report any issue you believe has security impact. Advisories are private by default until a fix ships.

For anything that should not sit in a public security advisory, including credential leaks in the telemetry pipeline or anything affecting the proprietary benchmark corpus, email craig@craighortonadvisory.com directly.

## What counts as a vulnerability

- Anything that breaks the deterministic no-network guarantee of the scoring path.
- Anything that leaks portfolio content, scores, or revenue figures via the telemetry channel.
- Anything in the MCP server response that could be used to execute code on the agent host.
- RLS bypass or other Supabase telemetry concerns.
- Supply-chain compromise of a published artifact under `aibvf-mcp`, `@aibvf/core`, or `aibvf`.

## Response window

Acknowledged within 72 hours. A patch released within 7 days for anything meeting the above criteria. Calibration disputes about benchmark accuracy are not security issues and belong in [Discussions](https://github.com/craig-horton/ai-bvf/discussions) instead.

## Scope

In scope: source under this repository, the three published packages above, and the public telemetry endpoint.

Out of scope: the proprietary benchmark corpus (handled under separate written agreement), third-party MCP clients consuming the server, and downstream agents that consume the scoring output.
