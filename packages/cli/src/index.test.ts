import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCheck, lintManifest, type Manifest } from './index.js';

const baseManifest: Manifest = {
  bvf_version: '1.0',
  organization: { industry: 'financial', revenue_eur: 400_000_000 },
  policy: { fail_on: ['Stop'], max_governance_risk: 60, min_decision_confidence: 50 },
  initiatives: [
    {
      id: 'cx-genai-bot', function: 'cx', ai_tier: 'gen2', readiness: 'traditional',
      scores: { strategic_alignment: 70, financial_return: 50, change_enablement: 55, governance_risk: 45 },
    },
  ],
};

test('a healthy initiative passes the gate', () => {
  const r = runCheck(baseManifest);
  assert.equal(r.ok, true);
  assert.equal(r.failures.length, 0);
  assert.equal(r.results[0].violations.length, 0);
});

test('a Stop initiative fails on fail_on', () => {
  const m: Manifest = {
    ...baseManifest,
    initiatives: [{
      id: 'doomed', function: 'finance', ai_tier: 'gen1', readiness: 'siloed',
      // governance_risk 75 → score() returns Stop
      scores: { strategic_alignment: 30, financial_return: 15, change_enablement: 20, governance_risk: 75 },
    }],
  };
  const r = runCheck(m);
  assert.equal(r.ok, false);
  assert.equal(r.results[0].classification, 'Stop');
  assert.ok(r.failures.some((f) => f.includes('Stop')));
});

test('max_governance_risk ceiling is enforced independently of classification', () => {
  const m: Manifest = {
    ...baseManifest,
    policy: { fail_on: [], max_governance_risk: 40 },
    initiatives: [{
      id: 'risky', function: 'cx', ai_tier: 'gen2', readiness: 'traditional',
      scores: { strategic_alignment: 80, financial_return: 80, change_enablement: 80, governance_risk: 55 },
    }],
  };
  const r = runCheck(m);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('governance_risk 55 exceeds')));
});

test('min_decision_confidence floor catches low-confidence verdicts', () => {
  const m: Manifest = {
    ...baseManifest,
    policy: { fail_on: [], min_decision_confidence: 60 },
    initiatives: [{
      id: 'soft', function: 'cx', ai_tier: 'gen2', readiness: 'traditional',
      scores: { strategic_alignment: 70, financial_return: 50, change_enablement: 55, governance_risk: 45 },
      signal_completeness: 0.4, // haircuts confidence below 60
    }],
  };
  const r = runCheck(m);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('below min_decision_confidence')));
  assert.ok(r.results[0].caveat, 'low signal_completeness should surface a caveat');
});

test('policy defaults to fail_on Stop when omitted', () => {
  const m: Manifest = {
    organization: { industry: 'retail', revenue_eur: 100_000_000 },
    initiatives: [{
      id: 'ok', function: 'sales', ai_tier: 'gen2', readiness: 'agile',
      scores: { strategic_alignment: 75, financial_return: 70, change_enablement: 70, governance_risk: 20 },
    }],
  };
  const r = runCheck(m);
  assert.deepEqual(r.policy.fail_on, ['Stop']);
  assert.equal(r.ok, true);
});

test('failures aggregate across multiple initiatives, ids preserved', () => {
  const m: Manifest = {
    ...baseManifest,
    policy: { fail_on: ['Stop'], max_governance_risk: 50 },
    initiatives: [
      { id: 'good', function: 'cx', ai_tier: 'gen2', readiness: 'agile',
        scores: { strategic_alignment: 80, financial_return: 75, change_enablement: 70, governance_risk: 25 } },
      { id: 'bad', function: 'finance', ai_tier: 'gen1', readiness: 'siloed',
        scores: { strategic_alignment: 30, financial_return: 15, change_enablement: 20, governance_risk: 80 } },
    ],
  };
  const r = runCheck(m);
  assert.equal(r.ok, false);
  assert.ok(r.failures.every((f) => f.startsWith('good:') || f.startsWith('bad:')));
  assert.ok(r.failures.some((f) => f.startsWith('bad:')));
});

test('lintManifest catches structural gaps', () => {
  assert.ok(lintManifest({}).length > 0);
  assert.ok(lintManifest({ organization: { industry: 'retail', revenue_eur: 1 }, initiatives: [] }).length > 0);
  assert.equal(lintManifest(baseManifest).length, 0);
});
