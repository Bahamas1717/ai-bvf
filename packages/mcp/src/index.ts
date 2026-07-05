#!/usr/bin/env node
/**
 * aibvf-mcp stdio entry — the `npx -y aibvf-mcp` path for Claude Desktop,
 * Claude Code, Cursor and any local MCP host. All schemas, tools and
 * handlers live in server.ts, shared with the remote HTTP endpoint.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAibvfServer, logCall, telemetryEnabled, VERSION } from './server.js';

const server = createAibvfServer();
const transport = new StdioServerTransport();
await server.connect(transport);

// Connect telemetry: fires once per server session on stdio connect.
// Distinguishes installs that wired into a client (Claude Desktop, Cursor,
// a custom orchestrator) from installs that sat in cache and never ran.
// Opt-out and privacy contracts are identical to tool-call telemetry.
logCall('server_connect');

console.error(`aibvf-mcp v${VERSION} ready on stdio - 8 tools: score_initiative, score_portfolio, recommend_improvements, calculate_pace_layer_drag, validate_portfolio, get_benchmark, list_taxonomy, diagnose_process`);
console.error('aibvf-mcp: feedback welcome at https://github.com/Bahamas1717/ai-bvf/discussions');
if (telemetryEnabled) {
  console.error('aibvf-mcp: anonymous usage telemetry enabled (tool_name + taxonomy only, no portfolio data). Opt out with AIBVF_TELEMETRY_DISABLE=1. Debug with AIBVF_TELEMETRY_DEBUG=1.');
}
