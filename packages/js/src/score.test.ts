import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_RATES, score } from './score.js';
import type { ScoreInput } from './types.js';

// Manufacturing GenAI predictive-maintenance case — the canonical smoke fixture.
const base: ScoreInput = {
  industry: 'manufacturing',
  revenue_eur: 2_400_000_000,
  function: 'supply',
  ai_tier: 'gen2',
  readiness: 'traditional',
  scores: {
    strategic_alignment: 72,
    financial_return: 64,
    change_enablement: 48,
    governance_risk: 35,
  },
};

test('base rates disclose that they are planning assumptions', () => {
  for (const rate of Object.values(BASE_RATES)) {
    assert.equal(rate.evidence_status, 'modelled_planning_assumption');
    assert.equal(rate.reviewed_at, '2026-08-23');
    assert.match(rate.source, /AI BVF modelled planning range/);
    assert.match(rate.use_guidance, /Replace the range with measured baseline/);
  }
});

test('default (no signal_completeness) leaves confidence at the pre-0.3.4 value', () => {
  const v = score(base);
  // (72 + 64 + 48 + (100 - 35)) / 4 = 62.25 → 62
  assert.equal(v.confidence, 62);
  assert.equal(v.caveat, undefined);
});

test('signal_completeness = 1 behaves identically to omitting it (audit provenance may differ)', () => {
  const { audit: a1, ...explicit } = score({ ...base, signal_completeness: 1 });
  const { audit: a2, ...omitted } = score(base);
  assert.deepEqual(explicit, omitted);
  // the audit legitimately records given vs defaulted provenance
  assert.ok(a1.rules_fired.some(r => r.includes('(given)')));
  assert.ok(a2.rules_fired.some(r => r.includes('(defaulted)')));
});

test('low signal_completeness haircuts confidence and attaches a caveat', () => {
  const soft = score({ ...base, signal_completeness: 0.4 });
  // 62.25 * (0.5 + 0.5*0.4) = 62.25 * 0.7 = 43.575 → 44
  assert.equal(soft.confidence, 44);
  assert.ok(soft.caveat && soft.caveat.includes('soft inputs'));
});

test('confidence is monotonic in signal_completeness', () => {
  const lo = score({ ...base, signal_completeness: 0.2 }).confidence;
  const mid = score({ ...base, signal_completeness: 0.6 }).confidence;
  const hi = score({ ...base, signal_completeness: 1.0 }).confidence;
  assert.ok(lo < mid && mid < hi, `expected ${lo} < ${mid} < ${hi}`);
});

test('signal_completeness is clamped to [0,1] and never changes classification', () => {
  const over = score({ ...base, signal_completeness: 5 });
  const under = score({ ...base, signal_completeness: -3 });
  assert.equal(over.confidence, 62);          // clamped to 1
  assert.equal(over.caveat, undefined);
  assert.equal(under.classification, score(base).classification); // clamped to 0, verdict unchanged
  assert.ok(under.caveat); // soft inputs flagged
});

test('caveat appears at the threshold boundary, not above it', () => {
  assert.equal(score({ ...base, signal_completeness: 0.7 }).caveat, undefined); // 0.7 is not < 0.7
  assert.ok(score({ ...base, signal_completeness: 0.69 }).caveat);
});

// Regression: the readiness sensitivity used to reuse the resolved pillars and
// report the base decision_confidence unchanged. On the estimated path
// change_enablement is derived from readiness, so a notch down has to move the
// pillars, the confidence and, where it applies, the classification.
test('readiness_one_notch_down matches an actual score at that readiness', () => {
  const estimated = {
    industry: 'retail',
    revenue_eur: 500_000_000,
    function: 'cx',
    ai_tier: 'gen2',
    readiness: 'agile',
  } as ScoreInput;

  const agile = score(estimated);
  const down = agile.sensitivity.readiness_one_notch_down;
  assert.ok(down, 'agile has a notch down');

  const actual = score({ ...estimated, readiness: down.readiness });

  assert.equal(down.decision_confidence, actual.confidence);
  assert.equal(down.classification, actual.classification);
  assert.equal(down.net_value_eur.low, actual.net_low_eur);
  assert.equal(down.net_value_eur.high, actual.net_high_eur);
  // The whole point: the confidence actually moved.
  assert.ok(down.decision_confidence < agile.confidence);
});

// Given pillars are evidence, so a readiness notch must not rewrite them. Only
// the capture rate moves the money.
test('readiness_one_notch_down leaves given pillars alone', () => {
  const given = score(base);
  const down = given.sensitivity.readiness_one_notch_down;
  assert.ok(down, 'traditional has a notch down');

  const actual = score({ ...base, readiness: down.readiness });
  assert.equal(down.decision_confidence, actual.confidence);
  assert.equal(down.decision_confidence, given.confidence, 'all pillars given, so confidence holds');
});
