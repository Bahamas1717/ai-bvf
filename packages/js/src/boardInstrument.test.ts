import test from 'node:test';
import assert from 'node:assert/strict';
import { score, recommendImprovements } from './score.js';
import { inferReadiness } from './inferReadiness.js';
import { sequencePortfolio } from './sequencePortfolio.js';
import { mapToTaxonomy } from './aliases.js';
import { validate } from './validate.js';
import { CORE_VERSION } from './audit.js';
import type { ScoreInput, SequenceInput } from './types.js';

const base: ScoreInput = {
  industry: 'retail', revenue_eur: 300_000_000, function: 'cx', ai_tier: 'gen2', readiness: 'traditional',
  scores: { strategic_alignment: 70, financial_return: 64, change_enablement: 48, governance_risk: 35 },
};

// ── audit ──────────────────────────────────────────────────────────────────

test('every scoring call carries a reproducible audit record', () => {
  const s = score(base);
  assert.equal(s.audit.engine, '@aibvf/core');
  assert.equal(s.audit.engine_version, CORE_VERSION);
  assert.ok(s.audit.rules_fired.some(r => r.startsWith('classify:Fix')));
  assert.ok(s.audit.rules_fired.some(r => r.startsWith('value:BASE_RATES[cx]')));
  const r = recommendImprovements(base);
  assert.ok(r.audit.rules_fired.some(x => x.startsWith('gap:change_enablement')));
  const i = inferReadiness({ function: 'cx', handoffs: 5, rework_rate: 0.2 });
  assert.ok(i.audit.rules_fired.some(x => x.startsWith('classify:')));
});

test('audit reflects estimation when pillars are omitted', () => {
  const s = score({ ...base, scores: undefined });
  assert.ok(s.audit.rules_fired.some(r => r.startsWith('estimate:')));
  assert.ok(s.audit.rules_fired.some(r => r.includes('(defaulted)')));
});

// ── sensitivity ────────────────────────────────────────────────────────────

test('sensitivity: readiness notch-down shrinks value, revenue -20pct scales, flips are named', () => {
  const s = score(base);
  assert.ok(s.sensitivity.readiness_one_notch_down);
  assert.equal(s.sensitivity.readiness_one_notch_down!.readiness, 'siloed');
  assert.ok(s.sensitivity.readiness_one_notch_down!.net_value_eur.high < s.net_high_eur);
  assert.equal(s.sensitivity.revenue_minus_20pct.net_value_eur.low, Math.round(s.net_low_eur * 0.8));
  assert.ok(s.sensitivity.verdict_flips.some(f => f.includes('to Accelerate')));
  assert.ok(s.sensitivity.verdict_flips.some(f => f.includes('Stop')));
});

test('sensitivity: siloed has no notch down; Accelerate names its margins', () => {
  const s = score({ ...base, readiness: 'siloed', scores: { ...base.scores! } as any });
  assert.equal(s.sensitivity.readiness_one_notch_down, null);
  const a = score({ ...base, scores: { strategic_alignment: 75, financial_return: 70, change_enablement: 65, governance_risk: 38 } });
  assert.equal(a.classification, 'Accelerate');
  assert.ok(a.sensitivity.verdict_flips.some(f => f.includes('governance_risk +3')));
});

// ── claimed vs measured readiness ──────────────────────────────────────────

test('claimed agile vs measured siloed reports the gap as a finding', () => {
  const r = inferReadiness({
    function: 'supply', handoffs: 11, rework_rate: 0.22, touch_ratio: 0.08, automation_level: 0.1, cycle_time_days: 18,
    claimed_readiness: 'agile',
  });
  assert.equal(r.readiness, 'siloed');
  assert.equal(r.claimed_readiness, 'agile');
  assert.equal(r.readiness_gap, 2);
  assert.ok(r.gap_finding && r.gap_finding.includes('two notches'));
});

test('claimed matches measured strengthens rather than flags', () => {
  const r = inferReadiness({ function: 'cx', handoffs: 1, rework_rate: 0.03, touch_ratio: 0.55, claimed_readiness: 'agile' });
  assert.equal(r.readiness_gap, 0);
  assert.ok(r.gap_finding && r.gap_finding.includes('holds up'));
});

// ── taxonomy aliases ───────────────────────────────────────────────────────

test('everyday language maps onto the canonical taxonomy', () => {
  const m = mapToTaxonomy({ function: 'Customer Service', industry: 'Banking', ai_tier: 'GenAI copilot', readiness: 'bureaucratic' });
  assert.equal(m.function!.resolved, 'cx');
  assert.equal(m.industry!.resolved, 'financial');
  assert.equal(m.ai_tier!.resolved, 'gen2');
  assert.equal(m.readiness!.resolved, 'siloed');
});

test('no confident match returns null with suggestions, never a guess', () => {
  const m = mapToTaxonomy({ function: 'astrology' });
  assert.equal(m.function!.resolved, null);
  assert.ok(m.function!.suggestions!.includes('cx'));
});

// ── sequence_portfolio ─────────────────────────────────────────────────────

const seqInput: SequenceInput = {
  organization: { name: 'Test org', industry: 'financial', revenue_eur: 1_200_000_000 },
  readiness: 'traditional',
  initiatives: [
    { id: 'a', name: 'Doomed voice bot', function: 'cx', ai_tier: 'gen3', scores: { strategic_alignment: 40, financial_return: 15, change_enablement: 30, governance_risk: 60 } },
    { id: 'b', name: 'Quick finance win', function: 'finance', ai_tier: 'gen1', scores: { strategic_alignment: 72, financial_return: 68, change_enablement: 66, governance_risk: 30 } },
    { id: 'c', name: 'CX assist', function: 'cx', ai_tier: 'gen2', scores: { strategic_alignment: 70, financial_return: 65, change_enablement: 62, governance_risk: 35 } },
    { id: 'd', name: 'Agentic supply pilot', function: 'finance', ai_tier: 'gen3', scores: { strategic_alignment: 75, financial_return: 70, change_enablement: 64, governance_risk: 38 } },
    { id: 'e', name: 'Finance copilot', function: 'finance', ai_tier: 'gen2', scores: { strategic_alignment: 68, financial_return: 63, change_enablement: 61, governance_risk: 32 } },
    { id: 'f', name: 'Fixable claims triage', function: 'risk', ai_tier: 'gen2', scores: { strategic_alignment: 65, financial_return: 62, change_enablement: 45, governance_risk: 50 } },
  ],
};

test('stops land in wave 1, quick wins in wave 2, fixes behind gates in wave 3', () => {
  const r = sequencePortfolio(seqInput);
  assert.equal(r.waves[0].initiatives.length, 1);
  assert.equal(r.waves[0].initiatives[0].id, 'a');
  assert.ok(r.waves[0].initiatives[0].action.includes('Stop now'));
  const w3fix = r.waves[2].initiatives.find(x => x.id === 'f');
  assert.ok(w3fix && w3fix.action.includes('re-score gate'));
  assert.equal(r.totals.stopped, 1);
});

test('change capacity defers overflow and reports the conflict', () => {
  const r = sequencePortfolio({ ...seqInput, constraints: { max_parallel_per_function: 1 } });
  // three finance initiatives cannot all land at once with max_parallel 1
  assert.ok(r.capacity_conflicts.some(c => c.function === 'finance'));
  const placedFinanceW2 = r.waves[1].initiatives.filter(x => x.function === 'finance').length;
  assert.ok(placedFinanceW2 <= 1);
  assert.ok(r.capacity_conflicts.every(c => c.resolution.includes('overflow')));
});

test('sequencing is deterministic and audited', () => {
  const a = sequencePortfolio(seqInput);
  const b = sequencePortfolio(seqInput);
  assert.deepEqual(a, b);
  assert.ok(a.audit.rules_fired.some(x => x.startsWith('capacity:')));
  assert.ok(a.sequencing_principles.some(p => p.includes('break an organisation')));
});

test('no em-dashes or banned vocabulary in any new output text', () => {
  const blobs = [
    JSON.stringify(score(base).sensitivity), JSON.stringify(score(base).audit),
    JSON.stringify(inferReadiness({ function: 'supply', handoffs: 11, rework_rate: 0.22, claimed_readiness: 'agile' })),
    JSON.stringify(sequencePortfolio(seqInput)),
    JSON.stringify(mapToTaxonomy({ function: 'legal' })),
  ].join(' ');
  assert.ok(!blobs.includes('—'), 'em-dash found');
  for (const w of ['boardroom', 'leverage', 'crucial', 'seamless']) {
    assert.ok(!blobs.toLowerCase().includes(w), `banned word: ${w}`);
  }
});

test('sequencer accepts the score_portfolio document shape with nested value scores', () => {
  const r = sequencePortfolio({
    portfolio: {
      bvf_version: '1.0',
      organization: { name: 'Health Group', industry: 'healthcare', revenue_eur: 800_000_000 },
      initiatives: [
        { id: 'amb', name: 'Ambient documentation', function: 'cx', ai_tier: 'gen2',
          scores: { strategic_alignment: { value: 72 }, financial_return: { value: 64 }, change_enablement: { value: 48 }, governance_risk: { value: 35 } } },
      ],
    },
    readiness: 'siloed',
  } as any);
  assert.equal(r.waves.length, 3);
  const placed = r.waves.flatMap(w => w.initiatives);
  assert.equal(placed.length, 1);
  assert.equal(placed[0].id, 'amb');
});

test('validate accepts bare numeric pillar scores and the { value } shape equally', () => {
  const doc = (scores: any) => ({
    bvf_version: '1.0',
    organization: { name: 'Health Group', industry: 'healthcare', revenue_eur: 800_000_000 },
    initiatives: [{ id: 'amb', name: 'Ambient documentation', function: 'cx', ai_tier: 'gen2', scores }],
  });
  const bare = validate(doc({ strategic_alignment: 72, financial_return: 64, change_enablement: 48, governance_risk: 35 }));
  assert.equal(bare.valid, true, JSON.stringify(bare.errors));
  const nested = validate(doc({ strategic_alignment: { value: 72 }, financial_return: { value: 64 }, change_enablement: { value: 48 }, governance_risk: { value: 35 } }));
  assert.equal(nested.valid, true);
  const outOfRange = validate(doc({ strategic_alignment: 172, financial_return: 64, change_enablement: 48, governance_risk: 35 }));
  assert.equal(outOfRange.valid, false);
  assert.ok(outOfRange.errors.some(e => e.path.includes('strategic_alignment')));
});

test('sequencer gives a plain-language error on malformed input, never a TypeError', () => {
  assert.throws(() => sequencePortfolio({ readiness: 'agile' } as any), /organization\.industry/);
  assert.throws(() => sequencePortfolio({ organization: { industry: 'retail', revenue_eur: 1 }, initiatives: [], readiness: 'agile' } as any), /non-empty initiatives/);
});
