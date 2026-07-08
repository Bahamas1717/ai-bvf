import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblePortfolio } from './assemblePortfolio.js';
import { validate } from './validate.js';

const loose = {
  organization: { name: 'Health Group', industry: 'pharma', revenue_eur: 800_000_000 },
  readiness: 'bureaucratic',
  initiatives: [
    { name: 'Invoice Matching Automation', function: 'accounts payable', ai_tier: 'rpa', scores: { strategic_alignment: 70, financial_return: 62, change_enablement: 55, governance_risk: 30 } },
    { name: 'Contact Centre Copilot', function: 'customer service', ai_tier: 'copilot', scores: { strategic_alignment: 68 } },
    { name: 'Contact Centre Copilot', function: 'cx', ai_tier: 'gen2' },
  ],
};

test('assembles a valid document from plain-language inputs', () => {
  const r = assemblePortfolio(loose);
  assert.ok(r.portfolio, 'portfolio assembled');
  assert.equal(r.portfolio!.organization.industry, 'healthcare');
  assert.equal(r.portfolio!.initiatives[0].function, 'finance');
  assert.equal(r.portfolio!.initiatives[0].ai_tier, 'gen1');
  assert.equal(r.portfolio!.initiatives[1].function, 'cx');
  assert.equal(r.portfolio!.initiatives[1].ai_tier, 'gen2');
  assert.equal(r.readiness_used, 'siloed');
  assert.ok(r.validation?.valid, 'assembled document passes validate()');
  assert.ok(validate(r.portfolio).valid, 'external validate agrees');
});

test('ids generated from names and deduplicated deterministically', () => {
  const r = assemblePortfolio(loose);
  const ids = r.portfolio!.initiatives.map((i) => i.id);
  assert.equal(ids[0], 'invoice-matching-automation');
  assert.equal(ids[1], 'contact-centre-copilot');
  assert.equal(ids[2], 'contact-centre-copilot-2');
});

test('missing pillars estimated, reported, and carried with low confidence', () => {
  const r = assemblePortfolio(loose);
  const est = r.estimated_pillars['contact-centre-copilot'];
  assert.deepEqual(est, ['financial_return', 'change_enablement', 'governance_risk']);
  const scores = r.portfolio!.initiatives[1].scores as Record<string, any>;
  assert.equal(typeof scores.strategic_alignment, 'number', 'given pillar stays a bare number');
  assert.equal(typeof scores.financial_return.value, 'number', 'estimated pillar wrapped');
  assert.ok(scores.financial_return.confidence <= 50, 'estimated pillar carries low confidence');
  assert.equal(r.estimated_pillars['invoice-matching-automation'], undefined, 'fully-given initiative reports nothing');
});

test('deterministic: same input, same document', () => {
  assert.deepEqual(assemblePortfolio(loose), assemblePortfolio(loose));
});

test('unresolvable inputs block assembly with suggestions, never guesses', () => {
  const r = assemblePortfolio({
    organization: { name: 'X', industry: 'floristry' },
    initiatives: [{ name: 'A', function: 'gardening', ai_tier: 'gen2' }],
  });
  assert.equal(r.portfolio, null);
  assert.ok(r.issues.some((i) => i.path === 'organization.industry'));
  assert.ok(r.issues.some((i) => i.path.endsWith('.function')));
  assert.equal(r.validation, null);
});

test('voice rules hold on all output text', () => {
  const blob = JSON.stringify(assemblePortfolio(loose)) + JSON.stringify(assemblePortfolio({ organization: { name: 'X', industry: 'floristry' }, initiatives: [] }));
  assert.ok(!blob.includes('—'), 'em-dash found');
  for (const w of ['boardroom', 'leverage', 'crucial', 'seamless', 'delve', 'robust']) {
    assert.ok(!blob.toLowerCase().includes(w), `banned word: ${w}`);
  }
});
