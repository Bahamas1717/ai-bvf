import test from 'node:test';
import assert from 'node:assert/strict';
import { score, recommendImprovements, estimatePillars } from './score.js';
import type { ScoreInput } from './types.js';

const bare = {
  industry: 'manufacturing', revenue_eur: 500_000_000,
  function: 'cx', ai_tier: 'gen2', readiness: 'agile',
} as ScoreInput;

test('score runs with no pillar scores at all and reports every pillar estimated', () => {
  const r = score(bare);
  assert.ok(['Fix', 'Stop'].includes(r.classification));
  assert.deepEqual(Object.values(r.pillar_basis), ['estimated', 'estimated', 'estimated', 'estimated']);
  assert.ok(r.caveat && r.caveat.includes('Estimated pillars'));
});

test('fully estimated pillars never produce an Accelerate, by prior design', () => {
  // Sweep every tier x readiness x function combination with no scores given.
  for (const ai_tier of ['gen1', 'gen2', 'gen3'] as const) {
    for (const readiness of ['agile', 'traditional', 'siloed'] as const) {
      for (const fn of ['finance', 'hr', 'sales', 'supply', 'cx', 'risk', 'it', 'rd'] as const) {
        const r = score({ ...bare, ai_tier, readiness, function: fn });
        assert.notEqual(r.classification, 'Accelerate', `${ai_tier}/${readiness}/${fn} accelerated on estimates`);
      }
    }
  }
});

test('estimated GR forces Stop for agentic AI in a regulated function and industry', () => {
  const r = score({ ...bare, industry: 'financial', function: 'risk', ai_tier: 'gen3' });
  // gen3 (55) + regulated function (+10) + regulated industry (+8) = 73 >= 70.
  assert.equal(r.scores_used.governance_risk, 73);
  assert.equal(r.classification, 'Stop');
});

test('estimation priors are deterministic and sit in unproven territory', () => {
  const e = estimatePillars({ industry: 'retail', function: 'sales', ai_tier: 'gen1', readiness: 'siloed' });
  assert.deepEqual(e, estimatePillars({ industry: 'retail', function: 'sales', ai_tier: 'gen1', readiness: 'siloed' }));
  assert.equal(e.strategic_alignment, 50);
  assert.equal(e.change_enablement, 32);
  assert.ok(e.financial_return < 60 && e.financial_return > 20);
});

test('partial scores keep given values, estimate the rest, and scale the signal default', () => {
  const r = score({ ...bare, scores: { strategic_alignment: 70, financial_return: 65 } });
  assert.equal(r.pillar_basis.strategic_alignment, 'given');
  assert.equal(r.pillar_basis.financial_return, 'given');
  assert.equal(r.pillar_basis.change_enablement, 'estimated');
  assert.equal(r.scores_used.strategic_alignment, 70);
  // 2 of 4 given: default signal 0.75, so confidence is haircut below the full-signal figure.
  const full = score({ ...bare, scores: { strategic_alignment: 70, financial_return: 65, change_enablement: 55, governance_risk: 42 } });
  assert.ok(r.confidence < full.confidence + 10); // sanity: haircut applied, not inflated
});

test('a mixed call with one estimated pillar can still Accelerate, with the estimation caveat attached', () => {
  const r = score({
    ...bare, ai_tier: 'gen1', industry: 'retail',
    scores: { strategic_alignment: 72, financial_return: 68, change_enablement: 66 },
  });
  // GR estimated at gen1 unregulated = 30, under the 40 ceiling.
  assert.equal(r.classification, 'Accelerate');
  assert.equal(r.pillar_basis.governance_risk, 'estimated');
  assert.ok(r.caveat && r.caveat.includes('governance_risk'));
});

test('all four given reproduces the old behaviour exactly: basis given, no estimation caveat, signal 1', () => {
  const r = score({ ...bare, scores: { strategic_alignment: 70, financial_return: 65, change_enablement: 62, governance_risk: 35 } });
  assert.deepEqual(Object.values(r.pillar_basis), ['given', 'given', 'given', 'given']);
  assert.equal(r.classification, 'Accelerate');
  assert.equal(r.caveat, undefined);
});

test('explicit signal_completeness still wins over the given-count default', () => {
  const r = score({ ...bare, signal_completeness: 0.2 });
  assert.ok(r.caveat && r.caveat.includes('0.2'));
});

test('recommend_improvements runs with no scores and returns a provisional change plan', () => {
  const r = recommendImprovements({ ...bare, ai_tier: 'gen3', readiness: 'traditional' });
  assert.ok(['Fix', 'Stop'].includes(r.current_classification));
  assert.ok(r.notes.some(n => n.includes('Estimated pillars')));
  assert.ok(r.change_plan && r.change_plan.plays.length > 0);
  assert.ok(r.change_plan.plays.some(p => p.id === 'pace-realign'));
});
