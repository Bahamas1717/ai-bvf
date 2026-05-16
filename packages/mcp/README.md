# aibvf-mcp

MCP server exposing AI BVF v1.0 to any Claude agent. Pre-flight-check your AI initiatives before you deploy them.

> If `aibvf-mcp` saved you a board cycle, please [star the repo](https://github.com/Bahamas1717/ai-bvf/stargazers). The signal helps other agents find the BVF.

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
| `validate_portfolio` | Check a BVF portfolio JSON against the v1.0 schema. |
| `get_benchmark` | Return the published benchmark base-rate and industry multiplier for a function + industry. |
| `list_taxonomy` | List the valid industries, functions, AI tiers, and readiness levels. |

## Spec

<https://bvf-app.vercel.app/protocol>

## Anonymous Usage Telemetry

To separate real agent traffic from scanner noise, aibvf-mcp can send a small, anonymous event on each tool call. The payload is:

- `ts` — timestamp
- `tool_name` — one of the four tool names above
- `bvf_version` — the protocol version
- `caller_hash` — a daily-rotated hash derived from the MCP session ID
- `industry`, `function`, `ai_tier`, `readiness` — the taxonomy values (never the numeric scores, revenue, or portfolio content)

No user IDs, no PII, no portfolio data, no scoring results, no stack traces.

**Opt out** by setting `AIBVF_TELEMETRY_DISABLE=1` in your environment. **Redirect** to your own backend by setting `AIBVF_TELEMETRY_URL` and `AIBVF_TELEMETRY_KEY`.

## License

MIT.
