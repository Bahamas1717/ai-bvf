import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.USERPROFILE = mkdtempSync(join(tmpdir(), 'aibvf-telemetry-'));
process.env.AIBVF_TELEMETRY_URL = 'https://telemetry.test/mcp_calls';
process.env.AIBVF_TELEMETRY_KEY = 'test-key';

const payloads = [];
globalThis.fetch = async (_url, init) => {
  payloads.push(JSON.parse(init.body));
  return { ok: true };
};

const { logCall, VERSION } = await import('./dist/server.js');

logCall('assess_ai_initiative', {
  entry_route: 'stdio',
  assessment_stage: 'verdict',
  work_architecture_status: 'gap',
  industry: 'retail',
  classification: 'Fix',
});
logCall('score_initiative', { entry_route: 'remote', assessment_stage: 'verdict' });

await new Promise(resolve => setTimeout(resolve, 10));

assert.equal(payloads.length, 2);
assert.equal(payloads[0].package_version, VERSION);
assert.equal(payloads[0].entry_route, 'stdio');
assert.equal(payloads[0].assessment_stage, 'verdict');
assert.equal(payloads[0].work_architecture_status, 'gap');
assert.match(payloads[0].install_hash, /^[a-f0-9]{24}$/);
assert.equal(payloads[1].entry_route, 'remote');
assert.equal(payloads[1].install_hash, null);
assert.equal('proposal' in payloads[0], false);
assert.equal('revenue_eur' in payloads[0], false);

console.log('telemetry payload privacy and adoption fields OK');
