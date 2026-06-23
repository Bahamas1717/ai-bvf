import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseProcess } from './diagnose.js';
import type { ProcessSignals } from './types.js';

// A heavy, mostly-manual finance process: high volume, low automation,
// real rework, fully measured.
const heavyFinance: ProcessSignals = {
  process_id: 'fin-ap',
  function: 'finance',
  instances_per_year: 50_000,
  fte_hours_per_instance: 0.5,
  loaded_hourly_rate_eur: 60,
  cycle_time_days: 12,
  touch_ratio: 0.3,
  handoffs: 6,
  rework_rate: 0.25,
  automation_level: 0.1,
  direct_spend_eur: 200_000,
  signal_completeness: 0.9,
  readiness: 'traditional',
};

test('baseline cost = labour + direct spend', () => {
  const v = diagnoseProcess(heavyFinance);
  // 50000 * 0.5 * 60 = 1_500_000 + 200_000 = 1_700_000
  assert.equal(v.baseline_cost_eur, 1_700_000);
});

test('deterministic: same input → identical output', () => {
  assert.deepEqual(diagnoseProcess(heavyFinance), diagnoseProcess(heavyFinance));
});

test('heavy manual finance process → Automate + Accelerate + offer', () => {
  const v = diagnoseProcess(heavyFinance);
  assert.equal(v.intervention, 'Automate');
  assert.equal(v.verdict, 'Accelerate');
  assert.equal(v.offer_to_execute, true);
  assert.equal(v.evidence_maturity, 'High'); // finance×Automate
});

test('bounds: heaviness 0..100, confidence 0..1, savings ordered', () => {
  const v = diagnoseProcess(heavyFinance);
  assert.ok(v.heaviness >= 0 && v.heaviness <= 100);
  assert.ok(v.decision_confidence >= 0 && v.decision_confidence <= 1);
  assert.ok(v.net_saving_low_eur <= v.net_saving_high_eur);
  const sum = Object.values(v.drag_decomposition).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 0.02); // decomposition normalised
});

test('light process → low heaviness → Stop', () => {
  const light: ProcessSignals = {
    ...heavyFinance,
    process_id: 'fin-light',
    automation_level: 0.95,
    rework_rate: 0.01,
    handoffs: 1,
    touch_ratio: 0.95,
    cycle_time_days: 1,
  };
  const v = diagnoseProcess(light);
  assert.ok(v.heaviness < 25, `expected light, got heaviness ${v.heaviness}`);
  assert.equal(v.verdict, 'Stop');
});

test('low signal completeness drags confidence down', () => {
  const blind = { ...heavyFinance, signal_completeness: 0.2 };
  const seen = diagnoseProcess(heavyFinance).decision_confidence;
  const unseen = diagnoseProcess(blind).decision_confidence;
  assert.ok(unseen < seen, `expected ${unseen} < ${seen}`);
});

test('evidence fallback: rework-dominant sales uses cross-cutting Quality band', () => {
  const sales: ProcessSignals = {
    process_id: 'sales-rework',
    function: 'sales',
    instances_per_year: 10_000,
    fte_hours_per_instance: 1,
    loaded_hourly_rate_eur: 70,
    cycle_time_days: 5,
    touch_ratio: 0.8,
    handoffs: 2,
    rework_rate: 0.9,        // rework dominates → Quality controls
    automation_level: 0.8,
    direct_spend_eur: 0,
    signal_completeness: 0.8,
  };
  const v = diagnoseProcess(sales);
  assert.equal(v.intervention, 'Quality controls');
  // sales has no Quality cell → cross-cutting Medium
  assert.equal(v.evidence_maturity, 'Medium');
});

test('low-volume heavy process → Eliminate / insource', () => {
  const niche: ProcessSignals = {
    ...heavyFinance,
    process_id: 'fin-niche',
    instances_per_year: 100, // below ELIMINATE_VOLUME
  };
  const v = diagnoseProcess(niche);
  assert.equal(v.intervention, 'Eliminate / insource');
});
