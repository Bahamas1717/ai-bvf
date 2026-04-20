// Local smoke test: spawn the MCP server, send a real tool-call, print the result.
// Run from packages/mcp after `npm run build`.
import { spawn } from 'node:child_process';

const server = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
const responses = [];
server.stdout.on('data', (chunk) => {
  buf += chunk.toString();
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (line.trim()) {
      try { responses.push(JSON.parse(line)); }
      catch { console.error('bad line:', line); }
    }
  }
});
server.stderr.on('data', (chunk) => process.stderr.write('[stderr] ' + chunk));

const send = (m) => server.stdin.write(JSON.stringify(m) + '\n');

send({ jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0.1.0' } } });
await new Promise(r => setTimeout(r, 300));
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
await new Promise(r => setTimeout(r, 200));
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
await new Promise(r => setTimeout(r, 200));
send({ jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: {
    name: 'score_initiative',
    arguments: {
      industry: 'manufacturing', revenue_eur: 2_400_000_000,
      function: 'supply', ai_tier: 'gen2', readiness: 'traditional',
      scores: { strategic_alignment: 72, financial_return: 64, change_enablement: 48, governance_risk: 35 },
    },
  }});
await new Promise(r => setTimeout(r, 500));
send({ jsonrpc: '2.0', id: 4, method: 'tools/call',
  params: { name: 'list_taxonomy', arguments: {} } });
await new Promise(r => setTimeout(r, 300));
server.kill();

console.log('\n=== SMOKE TEST RESULTS ===');
for (const r of responses) {
  if (r.id === 1) console.log(`init OK · protocol ${r.result?.protocolVersion} · ${r.result?.serverInfo?.name}@${r.result?.serverInfo?.version}`);
  else if (r.id === 2) console.log(`tools/list OK · ${r.result?.tools?.length} tools: ${r.result?.tools?.map(t => t.name).join(', ')}`);
  else if (r.id === 3) {
    const parsed = JSON.parse(r.result?.content?.[0]?.text);
    console.log(`score_initiative OK · ${parsed.classification} · €${Math.round(parsed.net_value_eur.low/1e6)}M–€${Math.round(parsed.net_value_eur.high/1e6)}M · conf ${parsed.decision_confidence}`);
  } else if (r.id === 4) {
    const parsed = JSON.parse(r.result?.content?.[0]?.text);
    console.log(`list_taxonomy OK · ${parsed.industries.length} industries · ${parsed.functions.length} functions · ${parsed.ai_tiers.length} tiers`);
  } else console.log('? id=' + r.id + ':', JSON.stringify(r).slice(0, 200));
}
process.exit(0);
