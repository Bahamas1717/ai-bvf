# Changelog

All notable changes to `aibvf-mcp`, `@aibvf/core`, and `aibvf`, in reverse chronological order.

## 0.5.1 (aibvf-mcp), 28 June 2026

Changed: rewrote the `diagnose_process` tool description, which Glama's first v0.5.0 scan scored 4.1/5 — the lowest of the eight tools and, because the server-level Tool Definition Quality score is 60% mean + 40% minimum, the one pinning the whole server's TDQS. The previous description explained what the tool does in a single run-on sentence but never told an agent when to reach for it versus `score_initiative` (the Usage Guidelines dimension) and was dense to parse (Conciseness & Structure). The new description leads with a "CALL THIS WHEN the user describes a real, running process…" trigger, explicitly frames the tool as the operational counterpart to `score_initiative` (diagnose an existing process vs score a proposed initiative), points at `list_taxonomy` for the function enum, and adds the partial-signals guidance that the high-scoring tools carry (pass what you have, set `signal_completeness` accordingly). `score_initiative`'s description gains a reciprocal pointer at `diagnose_process` so the two are cross-linked both ways. Description-only edits; no change to any handler, input/output schema, or computed value.

Bumped: `aibvf-mcp` from 0.5.0 to 0.5.1 across the `Server({ version })` handshake, the startup banner, `packages/mcp/package.json`, and `server.json` (server-level and `packages[0]`). `@aibvf/core` unchanged at 0.3.3.

## 0.5.0 (aibvf-mcp), 26 June 2026

Added: an eighth tool, `score_portfolio`, that takes an AI BVF v1.0 portfolio document plus a single organisational `readiness` value and returns the board-level shape in one call — Accelerate/Fix/Stop counts, aggregate modelled EUR value range (integer EUR via the shared `eurRange` helper), mean decision confidence, the top initiative by mid-point value, the highest-risk initiative (worst classification, tie-broken by lowest decision confidence), and the per-initiative scoring results. Schema validation runs first; on a malformed portfolio the response sets `valid=false` and reports the validation errors without attempting to score. Initiatives that cannot be scored (missing `organization.revenue_eur`, unknown function/ai_tier) appear in `skipped_initiatives` rather than failing the call. Closes the Glama Server Coherence "Completeness" gap: previously `validate_portfolio` existed but no tool scored a portfolio in one call, so agents had to loop `score_initiative` per initiative. The portfolio schema does not carry per-initiative readiness, so this tool takes one organisational readiness value and applies it across all initiatives — realistic for a single organisation and explicit in the parameter description.

Added: MCP 2025-06-18 `annotations` on every tool (`title`, `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`). All eight BVF tools are pure reads against in-process data — the prose descriptions already said as much, but the annotations make the contract machine-readable, which is what Glama's Behavioural Transparency dimension scores against. No behavioural change to any handler.

Changed: `get_benchmark` description now states when to use it instead of `score_initiative` — the Glama Tool Definition Quality "Usage Guidelines" gap that was holding the min-weighted TDQS at 4.50. `score_initiative`'s description now ends with a pointer at `score_portfolio` so an agent looking at a portfolio is routed to the right tool. `list_taxonomy`'s "call this first when unsure" list now names `score_portfolio` and `diagnose_process` alongside the existing routes. `validate_portfolio` now mentions both single-initiative and whole-portfolio scoring as the next step after validation. All description-only edits; no behavioural change to any handler.

Bumped: `aibvf-mcp` from 0.4.4 to 0.5.0 across the `Server({ version })` handshake, the startup banner (now reads `8 tools: ..., score_portfolio, ..., diagnose_process`), `packages/mcp/package.json`, and `server.json` (server-level and `packages[0]` entries; the latter was on 0.4.3 against the package's 0.4.4, now synced). `@aibvf/core` is unchanged at 0.3.3 — `score_portfolio` reuses the existing `score()` and `validate()` exports.

## 0.4.2 (aibvf-mcp), 15 June 2026

Changed: the advisory call-to-action returned on Fix and Stop verdicts now leads with a booking link (a 20-minute teardown via Calendly) instead of only an email address. The CTA fires on exactly the verdicts where a human conversation pays, so this turns a high-intent moment into a low-friction next step rather than a passive email mention. Email remains as a fallback. No change to scoring, classification, or any computed value.

## 0.4.1 (aibvf-mcp), 14 June 2026

Fixed: the MCP confidence schema (decision_confidence / projected_decision_confidence were documented as 0-1 but the values are 0-100) and EUR rounding at the MCP layer (net/gross value ranges are now rounded to integer EUR via a shared helper, removing floating-point dust from the structured output).

## 0.4.0 (aibvf-mcp), 10 June 2026

Added: a declared `outputSchema` on all six tools, plus a `structuredContent` field on every tool response, hand-matched to each tool's real return shape. Through 0.3.x the tools advertised no output schema, so an MCP host (and Glama's scorer) had to infer the result format from prose — Glama read `calculate_pace_layer_drag` as returning a bare EUR number when it actually returns a low/high range, a drag rate, a pace-gap severity, drivers, and a source. Each tool now ships a JSON Schema describing its output and returns `structuredContent` conforming to it alongside the existing pretty-printed `text` block, so hosts get typed, machine-readable results and the contract is self-documenting. No change to the computed values or classification logic — the numbers and verdicts are identical to 0.3.5.

Two range shapes exist in the wire format and both are now schema-documented: `{low,high}` for modelled EUR/value ranges (`score_initiative`, `calculate_pace_layer_drag`) and `{lo,hi}` for the raw benchmark rates (`get_benchmark`).

Changed: tool descriptions now disclose that every tool is a pure deterministic calculation/lookup with no network, auth, or side effects (the behavioural-transparency gap Glama flagged), `calculate_pace_layer_drag`'s description no longer implies a scalar EUR output, and its `readiness`/`ai_tier`/`industry` parameters carry fuller descriptions (the `readiness` enum values are spelled out; `industry` notes its `universal` default).

Also synced two stale version strings to the release: the `Server({ version })` handshake and `server.json` were still reporting `0.3.3`.

This is the first release to lean on `@modelcontextprotocol/sdk` semantics from the 2025-06-18 spec (`outputSchema` + `structuredContent`); the installed SDK is 1.29.0 and the dependency range `^1.0.0` is unchanged, as `structuredContent` is a plain response field the low-level `Server` passes through unmodified.

## 0.3.5 (aibvf-mcp), 9 June 2026

Changed: tightened the tool definitions for `validate_portfolio`, `list_taxonomy`, and `get_benchmark` so each tool describes itself, its parameters, and its return shape well enough for an agent to use it without guessing. No behavioural change to the handlers — descriptions and JSON-schema parameter semantics only. Motivated by Glama's quality score, which is 70% Tool Definition Quality (scored per tool, with the weakest tool weighted heavily) and 30% Server Coherence: `validate_portfolio` now documents the expected portfolio shape rather than an opaque `object`, `list_taxonomy` states when to call it and that it is side-effect free, and `get_benchmark`'s `function`/`industry` parameters carry descriptions pointing back to `list_taxonomy`.

Also added `glama.json` at the repo root to claim the Glama listing, and tagged `v0.3.4` (the first 0.3.x GitHub release) so Glama's release-gated scoring can run.

## 0.3.4 (aibvf-mcp), 9 June 2026

Changed: `caller_hash` derivation, so the distinct-install metric is real for the first time. Through 0.3.3 the hash was `sha256(SESSION_ID + day)` where `SESSION_ID` was random bytes minted fresh on every process start, so `count(distinct caller_hash)` only ever equalled the number of server sessions — it could not tell one install running ten times from ten installs running once. From 0.3.4 the hash is `sha256(installId + day)`, where `installId` is 16 random bytes generated on first run and persisted to `~/.config/aibvf/install-id`. The id is stable per install (so daily distinct-caller counts are now genuine distinct installs) yet high-entropy, so the published hash cannot be brute-forced back to a machine or person — a property a hostname/username fingerprint would not have had. The id never leaves the machine; only the daily-rotated hash does. No payload fields changed.

The install-id is created lazily on the first telemetry send, never at import. `AIBVF_TELEMETRY_DISABLE=1` short-circuits in `logCall` before `callerHash` runs, so opt-out installs write no dotfile at all. If the dotfile cannot be read or written (read-only filesystem, locked-down container) the server falls back to a per-process random seed, so telemetry still fires and that run simply counts as its own caller — the pre-0.3.4 behaviour, failing closed.

Historical rows are not back-corrected: `server_connect` counts captured before 0.3.4 remain one-per-session. Clean distinct-install counts begin accruing only as 0.3.4 is adopted.

Fixed: a stray NUL byte that had crept into the `caller_hash` template literal in `packages/mcp/src/index.ts`, which caused tooling to misclassify the source as a binary file. The separator is now a plain space; hash values are unaffected in practice.

## 0.3.3 (aibvf-mcp) and 0.3.1 (@aibvf/core), in flight

Fixed: floating-point dust on EUR values returned by `score_initiative` and `calculate_pace_layer_drag`. Outputs like `net_value_eur: 7425000.000000001` would survive into screenshots and damage the perception of a deterministic engine. All EUR values are now rounded to integer EUR before return. The classification thresholds were never affected, this is a presentation fix only. Surfaced by an end-to-end stdio verification run on 1 June 2026.

`aibvf-mcp` and `@aibvf/core` ship paired in this release, both versions republish, the MCP server's dependency range `^0.3.0` continues to accept the new core.

## 0.3.2, in flight

Added: `server_connect` telemetry event, fires once per server session on stdio connect. Distinguishes installs that wired into a client (Claude Desktop, Cursor, custom orchestrator) from installs that sat in npm cache and never ran. Same opt-out (`AIBVF_TELEMETRY_DISABLE=1`) and same privacy contract as tool-call telemetry, no new payload fields. Active install count is now measurable as `select count(distinct caller_hash) from public.mcp_calls where tool_name = 'server_connect' and ts >= now() - interval '7 days'`.

Fixed: `LICENSE` now ships inside the published npm tarball for both `aibvf-mcp` and `@aibvf/core`. Previously the file lived only at the repo root, so Glama's scanner of the published package found no license and rated the listing F. The next Glama rescan after this publish moves the rating to A.

## Production fix, 29 May 2026 (no code release)

Fixed: anonymous telemetry pipeline silently dropping rows since v0.2.0 launched on 5 May 2026. Production Supabase columns were named `tool` and `version`. The MCP server source and the `20260421_mcp_calls.sql` migration both used `tool_name` and `bvf_version`. PostgREST rejected every write, the fire-and-forget telemetry block in `packages/mcp/src/index.ts` silently caught and discarded the errors.

Resolved by renaming production columns to match the source code:

```sql
alter table public.mcp_calls rename column tool to tool_name;
alter table public.mcp_calls rename column version to bvf_version;
```

No code change in this fix, no version bump, no user action required. The opt-out and privacy contracts in the README held throughout, the bug failed closed not open, no portfolio data was ever transmitted, less data was captured than the design intended.

Six weeks of anonymous usage shape data was not captured (5 May to 29 May 2026). Industry distribution, tool-call distribution, score-to-recommend conversion, and version adoption are unknown for the launch window. Going forward, the table is receiving rows as designed.

The 0.2.1 entry below claimed telemetry was "landing cleanly" after the classification-column migration. That verification did not include a 24-hour row-count check. Future telemetry changes will.

Full post-mortem on the project [Discussions](https://github.com/Bahamas1717/ai-bvf/discussions) thread.

## 0.3.1, 27 May 2026

Added: `advisory_next_step` field on Fix and Stop verdicts in `score_initiative` and `recommend_improvements`. Returns a one-line pointer to `craig@craighortonadvisory.com` for the calibration conversation the verdict implies. Accelerate verdicts remain unchanged.

Fixed: version-string drift across `packages/mcp/package.json`, `server.json`, the `Server({ version })` declaration in source, and the startup banner. All four now match.

Added: three-tier engagement section on the public landing page, Verdict Audit, Calibration Programme, Transformation Practice.

## 0.3.0, 14 May 2026

The v0.3 line. Synced major version across `aibvf-mcp` and `@aibvf/core`. Telemetry payload extended to carry `classification` and `confidence` for downstream calibration analysis.

## 0.2.3, 6 May 2026

Fixed: MCP registry publish workflow. Description shortened to 94 characters to meet the registry's 100-character cap.

## 0.2.2, 6 May 2026

Changed: description and keywords expanded for search discoverability on the MCP registry. The package was findable only under "aibvf" or "bvf" before this change.

## 0.2.1, 5 May 2026

Added: telemetry diagnostics banner on startup. The MCP server now prints a clear opt-out path on stderr.

Added: feedback link in the startup banner pointing at GitHub Discussions.

Added: provenance attestation on the npm publish workflow.

Fixed: telemetry POST not firing due to schema mismatch on the Supabase target table. Migration `20260422_mcp_calls_add_classification.sql` was missing from production. Re-aligned, telemetry now lands cleanly.

Fixed: auto-unlock BVF gate from URL parameter on the public protocol page.

## 0.2.0, 5 May 2026

First feature-complete release. Six tools on stdio:

- `score_initiative`
- `recommend_improvements`
- `calculate_pace_layer_drag`
- `validate_portfolio`
- `get_benchmark`
- `list_taxonomy`

Anonymous telemetry with opt-out via `AIBVF_TELEMETRY_DISABLE=1`. Deterministic four-pillar scoring against published benchmark ranges. Schema validation against AI BVF v1.0.

Industry modules included: healthcare clinical validation, financial services capture multipliers, cross-industry readiness capture rates from EY/Oxford, Prosci change-success calibration, Pace Layer drag calculation.

## 0.1.0 to 0.1.4, April 2026

Initial protocol drafts, registry plumbing, and pre-feature-complete iterations.
