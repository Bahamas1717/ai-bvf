# Changelog

All notable changes to `aibvf-mcp`, `@aibvf/core`, and `aibvf`, in reverse chronological order.

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
