/**
 * aibvf-mcp as a remote MCP connector.
 *
 * Serves the same eight AI BVF tools as the npm package, over MCP
 * Streamable HTTP, so any claude.ai user (web, mobile, Team) can add it
 * under Settings > Connectors with just this URL — no npx, no Desktop,
 * no config files.
 *
 * Stateless mode: a fresh Server + transport per request. Every AI BVF
 * tool is a pure deterministic calculation, so there is no session state
 * to keep, which is exactly what serverless wants. Telemetry contracts
 * are identical to the stdio path.
 */
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
// Relative import into the workspace build output: the function bundler traces
// plain file imports reliably, where package-name imports through workspace
// symlinks (with an ESM-only exports map) resolve as CJS and fail at runtime.
import { createAibvfServer } from '../packages/mcp/dist/server.js';

export default async function handler(req: any, res: any) {
  const server = createAibvfServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no sessions, safe behind serverless
    enableJsonResponse: true,      // plain JSON responses, no SSE stream needed
  });
  res.on('close', () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
