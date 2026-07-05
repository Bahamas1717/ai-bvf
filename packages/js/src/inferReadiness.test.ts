import test from 'node:test';
import assert from 'node:assert/strict';
import { inferReadiness } from './inferReadiness.js';

test('siloed-shaped signals classify siloed (procurement-flow shape)', () => {
  const r = inferReadiness({ function: 'supply', handoffs: 11, rework_rate: 0.22, touch_ratio: 0.08, automation_level: 0.1, cycle_time_days: 18 });
  assert.equal(r.readiness, 'siloed');
  assert.equal(r.readiness_basis, 'measured');
  assert.equal(r.signals_used, 5);
  assert.ok(r.confidence >= 70);
});

test('agile-shaped signals classify agile (ticket-triage shape)', () => {
  const r = inferReadiness({ function: 'cx', handoffs: 1, rework_rate: 0.03, touch_ratio: 0.55, automation_level: 0.6, cycle_time_days: 0.5 });
  assert.equal(r.readiness, 'agile');
  assert.ok(r.confidence >= 70);
});

test('middle signals classify traditional', () => {
  const r = inferReadiness({ function: 'finance', handoffs: 4, rework_rate: 0.08, touch_ratio: 0.3, automation_level: 0.35, cycle_time_days: 5 });
  assert.equal(r.readiness, 'traditional');
});

test('fewer signals means lower confidence', () => {
  const five = inferReadiness({ function: 'supply', handoffs: 11, rework_rate: 0.22, touch_ratio: 0.08, automation_level: 0.1, cycle_time_days: 18 });
  const two = inferReadiness({ function: 'supply', handoffs: 11, rework_rate: 0.22 });
  assert.equal(two.readiness, 'siloed');
  assert.ok(two.confidence < five.confidence);
});

test('disagreeing signals discount confidence and attach the disagreement note', () => {
  const r = inferReadiness({ function: 'cx', handoffs: 6, rework_rate: 0.02, touch_ratio: 0.6, automation_level: 0.1 });
  assert.ok(r.disagreement && r.disagreement.includes('disagree'));
  const unanimous = inferReadiness({ function: 'cx', handoffs: 1, rework_rate: 0.02, touch_ratio: 0.6, automation_level: 0.6 });
  assert.ok(r.confidence < unanimous.confidence);
});

test('fewer than two signals refuses honestly', () => {
  assert.throws(() => inferReadiness({ function: 'cx', handoffs: 3 }), /at least two measured signals/);
});

test('deterministic: same signals, same answer', () => {
  const a = inferReadiness({ function: 'hr', handoffs: 7, rework_rate: 0.18, touch_ratio: 0.1 });
  const b = inferReadiness({ function: 'hr', handoffs: 7, rework_rate: 0.18, touch_ratio: 0.1 });
  assert.deepEqual(a, b);
});

test('per-signal reads explain each lean in plain language', () => {
  const r = inferReadiness({ function: 'supply', handoffs: 11, rework_rate: 0.22 });
  assert.equal(r.signal_reads.length, 2);
  assert.ok(r.signal_reads.every(s => s.note.length > 20 && ['agile', 'traditional', 'siloed'].includes(s.leans)));
  assert.ok(!JSON.stringify(r).includes('—'), 'em-dash found in output text');
});
