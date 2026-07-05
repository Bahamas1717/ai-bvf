import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendImprovements } from './score.js';
import type { RecommendInput } from './types.js';

const base: RecommendInput = {
  industry: 'manufacturing',
  revenue_eur: 2_400_000_000,
  function: 'supply',
  ai_tier: 'gen2',
  readiness: 'traditional',
  scores: { strategic_alignment: 70, financial_return: 65, change_enablement: 45, governance_risk: 35 },
};

test('CE-low on traditional readiness selects coalition-first, provisional, with a stop condition', () => {
  const r = recommendImprovements(base);
  const plan = r.change_plan!;
  const play = plan.plays.find(p => p.pillar === 'change_enablement')!;
  assert.equal(play.id, 'coalition-first');
  assert.equal(play.provisional, true);
  assert.ok(play.person_move.method.includes('Awareness'));
  assert.ok(play.stop_condition && play.stop_condition.includes('Stop'));
  assert.ok(play.diagnostic_questions.length >= 3);
});

test('caller-supplied resistance_type=skill overrides inference and is not provisional', () => {
  const r = recommendImprovements({ ...base, resistance_type: 'skill' });
  const play = r.change_plan!.plays.find(p => p.pillar === 'change_enablement')!;
  assert.equal(play.id, 'owner-and-capability');
  assert.equal(play.provisional, false);
  assert.ok(play.person_move.method.includes('Knowledge'));
});

test('agile readiness infers the skill-side play', () => {
  const r = recommendImprovements({ ...base, readiness: 'agile' });
  const play = r.change_plan!.plays.find(p => p.pillar === 'change_enablement')!;
  assert.equal(play.id, 'owner-and-capability');
  assert.equal(play.provisional, true);
});

test('high GR in a regulated function selects regulatory remediation with the honest stop language', () => {
  const r = recommendImprovements({
    ...base,
    function: 'risk',
    scores: { ...base.scores, change_enablement: 70, governance_risk: 65 },
  });
  const play = r.change_plan!.plays.find(p => p.pillar === 'governance_risk')!;
  assert.equal(play.id, 'regulatory-remediation');
  assert.ok(play.stop_condition && play.stop_condition.includes('Stop'));
  assert.ok(play.steps.some(s => s.includes('EU AI Act')));
});

test('risk_type=reputational selects trust-guardrails', () => {
  const r = recommendImprovements({
    ...base,
    risk_type: 'reputational',
    scores: { ...base.scores, change_enablement: 70, governance_risk: 55 },
  });
  const play = r.change_plan!.plays.find(p => p.pillar === 'governance_risk')!;
  assert.equal(play.id, 'trust-guardrails');
});

test('forcing FR selects value-rescope, positions near_stop, and binds the constraint to financial return', () => {
  const r = recommendImprovements({
    ...base,
    scores: { strategic_alignment: 70, financial_return: 15, change_enablement: 70, governance_risk: 35 },
  });
  const plan = r.change_plan!;
  assert.equal(plan.position, 'near_stop');
  assert.ok(plan.binding_constraint.includes('financial return'));
  const play = plan.plays.find(p => p.pillar === 'financial_return')!;
  assert.equal(play.id, 'value-rescope');
  assert.ok(play.stop_condition);
});

test('gen3 on siloed adds the cross-cutting pace-realign play', () => {
  const r = recommendImprovements({ ...base, ai_tier: 'gen3', readiness: 'siloed' });
  assert.ok(r.change_plan!.plays.some(p => p.id === 'pace-realign'));
});

test('near_go when the total shortfall is small', () => {
  const r = recommendImprovements({
    ...base,
    scores: { strategic_alignment: 58, financial_return: 62, change_enablement: 58, governance_risk: 42 },
  });
  assert.equal(r.change_plan!.position, 'near_go');
});

test('cost of waiting is a positive EUR range tied to the plan window', () => {
  const plan = recommendImprovements(base).change_plan!;
  assert.ok(plan.cost_of_waiting_eur.low > 0);
  assert.ok(plan.cost_of_waiting_eur.high > plan.cost_of_waiting_eur.low);
  assert.ok(plan.cost_of_waiting.includes('EUR'));
  assert.ok(plan.rescore_gate.deadline_weeks >= 4);
});

test('Accelerate carries no change plan', () => {
  const r = recommendImprovements({
    ...base,
    scores: { strategic_alignment: 80, financial_return: 75, change_enablement: 70, governance_risk: 30 },
  });
  assert.equal(r.change_plan, undefined);
});

test('infeasible gaps surface the honest stop', () => {
  const r = recommendImprovements({
    ...base,
    scores: { strategic_alignment: 30, financial_return: 5, change_enablement: 30, governance_risk: 80 },
  });
  assert.equal(r.feasible, false);
  assert.ok(r.change_plan!.honest_stop && r.change_plan!.honest_stop.includes('Stop'));
});

test('plan text carries no em-dashes and no banned vocabulary', () => {
  const plan = recommendImprovements(base).change_plan!;
  const text = JSON.stringify(plan);
  assert.ok(!text.includes('—'), 'em-dash found in plan text');
  for (const banned of ['boardroom', 'leverage', 'crucial', 'pivotal', 'seamless']) {
    assert.ok(!text.toLowerCase().includes(banned), `banned word found: ${banned}`);
  }
});
