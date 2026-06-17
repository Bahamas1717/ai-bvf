# aibvf-mcp

MCP server exposing AI BVF v1.0 to any Claude agent. Pre-flight-check your AI initiatives before you deploy them.

> **Source:** [github.com/Bahamas1717/ai-bvf](https://github.com/Bahamas1717/ai-bvf) · ⭐ star if this helped · [Issues](https://github.com/Bahamas1717/ai-bvf/issues) · Built by [Craig Horton Advisory](https://craighortonadvisory.com)

## Install and run

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
| `recommend_improvements` | For a Stop or Fix initiative, return concrete pillar-level actions that would flip its classification toward Accelerate. The "what do I do next" after `score_initiative`. |
| `calculate_pace_layer_drag` | Return the annual Organisational Drag Cost in EUR from misalignment between AI tier and organisational readiness — the cost of *not* changing the operating model. |
| `validate_portfolio` | Check a BVF portfolio JSON against the v1.0 schema. |
| `get_benchmark` | Return the published benchmark base-rate and industry multiplier for a function + industry. |
| `list_taxonomy` | List the valid industries, functions, AI tiers, and readiness levels. |

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
