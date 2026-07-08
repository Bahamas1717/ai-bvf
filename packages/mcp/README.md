# aibvf-mcp

MCP server exposing AI BVF v1.0 to any Claude agent, twelve deterministic tools that pre-flight-check AI initiatives before the budget is committed: score honestly from whatever is known (a fully estimated pass can never return Accelerate), return the change plan when the verdict is Fix, and measure organisational readiness from process data instead of self-report.

> **Source:** [github.com/Bahamas1717/ai-bvf](https://github.com/Bahamas1717/ai-bvf) · ⭐ star if this helped · [Issues](https://github.com/Bahamas1717/ai-bvf/issues) · Built by [Craig Horton Advisory](https://craighortonadvisory.com)

## No install: use it on claude.ai

Settings, then Connectors, then Add custom connector, and paste the hosted endpoint. Works on web and mobile, all twelve tools, same deterministic engine:

```
https://mcp.aibvf.com/api/mcp
```

## Install and run (stdio)

```bash
npx aibvf-mcp
```

## Wire into Claude Desktop / Cursor / any MCP host

### macOS and Linux

Add to your MCP config (on Claude Desktop macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### Windows

Windows needs `cmd /c` because `npx` on Windows is `npx.cmd` and Claude Desktop's process spawner doesn't auto-resolve the `.cmd` extension. Use this config in `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aibvf": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "aibvf-mcp"]
    }
  }
}
```

If that still fails, use the full path to `npx.cmd`. Find it with `where npx` in a terminal; it's usually `C:\Program Files\nodejs\npx.cmd`. Then:

```json
{
  "mcpServers": {
    "aibvf": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "aibvf-mcp"]
    }
  }
}
```

(Double backslashes are required inside JSON strings.)

### After configuring

Fully quit and restart the host (on Windows, right-click the Claude tray icon → Quit; closing the window leaves it running). Then ask Claude:

> *"Score this AI initiative using AI BVF: we're a €2.4bn manufacturer, planning a GenAI predictive maintenance rollout in our EU plants, we're a traditional hierarchy, strong sponsor, modest change budget."*

Claude will call `score_initiative` and return the classification, euro range, and reasoning.

## Troubleshooting

- **No tools icon appears after restart.** The config JSON probably has a syntax error. Validate with `python -m json.tool <path-to-config>`.
- **"Could not attach to MCP server aibvf."** Open the host's MCP log (on Claude Desktop Windows: `%APPDATA%\Claude\logs\mcp-server-aibvf.log`) for the actual error. Most common cause on Windows is the `npx` / `cmd /c` spawning issue above.
- **Tools show but calls fail.** Your npx cache may have a broken copy; clear it with `npx clear-npx-cache` and retry.

## Tools exposed

| Tool | Purpose |
|---|---|
| `score_initiative` | Return classification (Accelerate/Fix/Stop), euro range, and reasoning for one initiative. |
| `score_portfolio` | Score every initiative in a BVF portfolio in one call and return the board-level shape: Accelerate/Fix/Stop counts, aggregate EUR value, mean decision confidence, top initiative by value, highest-risk initiative, per-initiative results. Use instead of looping `score_initiative`. |
| `assemble_portfolio` | Assembles a valid BVF v1.0 portfolio document from loose inputs: names, plain-language functions and tiers, and whatever pillar scores exist. Aliases resolved, ids generated, missing pillars estimated with the estimation reported per initiative, document validated before return. Nothing stored, nothing edited. |
| `recommend_improvements` | For a Stop or Fix initiative, return concrete pillar-level actions that would flip its classification toward Accelerate. The "what do I do next" after `score_initiative`. |
| `calculate_pace_layer_drag` | Return the annual Organisational Drag Cost in EUR from misalignment between AI tier and organisational readiness — the cost of *not* changing the operating model. |
| `validate_portfolio` | Check a BVF portfolio JSON against the v1.0 schema. |
| `get_benchmark` | Return the published benchmark base-rate and industry multiplier for a function + industry. Use when the caller wants the raw rates without an initiative-level verdict. |
| `list_taxonomy` | List the valid industries, functions, AI tiers, and readiness levels. |
| `diagnose_process` | AI BVF Advisor Brain: diagnose one business process from observed signals (volume, labour, cycle time, handoffs, rework, automation, spend) and return heaviness, the recommended intervention (Automate / Consolidate & re-sequence / Quality controls / Eliminate), the modelled net EUR saving, the efficiency gain, an Accelerate/Fix/Stop verdict, and a decision confidence governed by how much was actually measured. |
| `infer_readiness` | Measures organisational readiness from process signals (hand-offs, rework, touch ratio, automation, cycle time vs function medians) instead of accepting self-report. Returns the classification the data supports, per-signal reasoning, and a confidence set by coverage and agreement. When the measured answer is lower than the claimed one, that gap is itself a change-readiness finding. |
| `sequence_portfolio` | Turns a scored portfolio into a three-wave rollout plan with named gates: Stops first (free the budget), quick Accelerates second (buy trust), complex work and Fixes third. Enforces change capacity per function, because ten good ideas can still break an organisation if they all land in one place. |
| `map_to_taxonomy` | Maps everyday business language (customer service, procurement, banking, GenAI copilot, bureaucratic) onto the canonical enums, deterministically, with suggestions instead of guesses when there is no confident match. |

## Spec

<https://www.aibvf.com/protocol>

## Anonymous Usage Telemetry

To separate real agent traffic from scanner noise, aibvf-mcp can send a small, anonymous event on each tool call. The payload is:

- `ts` — timestamp
- `tool_name` — one of the tool names above
- `bvf_version` — the protocol version
- `caller_hash` — a daily-rotated, one-way hash that lets us count distinct installs without identifying them (see below)
- `industry`, `function`, `ai_tier`, `readiness` — the taxonomy values (never the numeric scores, revenue, or portfolio content)

No user IDs, no PII, no portfolio data, no scoring results, no stack traces.

**How `caller_hash` works.** On first run the server generates 16 random bytes and stores them in `~/.config/aibvf/install-id`. The transmitted hash is `sha256(installId + currentDate)`, truncated. Because the seed is random and high-entropy, the hash cannot be reversed to identify your machine or you — it is *not* derived from your hostname, username, or any system identifier. Because the seed is stable, the same install produces the same hash within a day, which is what lets us distinguish one install running many times from many installs running once. The hash rotates every 24 hours, so there is no permanent cross-day identifier, and the install-id itself never leaves your machine.

The install-id file is created only when an event is actually sent. If you opt out, no file is written. If the file cannot be written (read-only filesystem, locked-down container), the server uses a per-process random seed instead and that run counts as its own caller. To reset your anonymous identity at any time, delete `~/.config/aibvf/install-id`.

**Opt out** by setting `AIBVF_TELEMETRY_DISABLE=1` in your environment — no events are sent and no install-id file is created. **Redirect** to your own backend by setting `AIBVF_TELEMETRY_URL` and `AIBVF_TELEMETRY_KEY`.

## License

MIT.
