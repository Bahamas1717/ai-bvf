import test from 'node:test';
import assert from 'node:assert/strict';
import { assessInitiative, extractRevenueEur } from './assessInitiative.js';

const examples = [
  {
    proposal: 'We are a 300 million euro retailer, a traditional organisation, considering a GenAI assistant for customer service.',
    expected: { industry: 'retail', revenue_eur: 300_000_000, function: 'cx', ai_tier: 'gen2', readiness: 'traditional' },
  },
  {
    proposal: 'A siloed hospital group with EUR 1.2 billion revenue is considering an agentic prior-authorisation agent for compliance.',
    expected: { industry: 'healthcare', revenue_eur: 1_200_000_000, function: 'risk', ai_tier: 'gen3', readiness: 'siloed' },
  },
  {
    proposal: 'An established bank with annual revenue of EUR 2bn wants RPA automation for accounts payable.',
    expected: { industry: 'financial', revenue_eur: 2_000_000_000, function: 'finance', ai_tier: 'gen1', readiness: 'traditional' },
  },
];

test('extractRevenueEur reads common EUR business formats', () => {
  assert.equal(extractRevenueEur('a EUR 300m retailer'), 300_000_000);
  assert.equal(extractRevenueEur('turnover of 1.2 billion'), 1_200_000_000);
  assert.equal(extractRevenueEur('300 million euro retailer'), 300_000_000);
});

test('prepared sector examples resolve and return a deterministic verdict', () => {
  for (const example of examples) {
    const first = assessInitiative({ proposal: example.proposal });
    const second = assessInitiative({ proposal: example.proposal });
    assert.equal(first.status, 'verdict');
    assert.deepEqual(first.resolved_inputs, example.expected);
    assert.ok(first.verdict);
    assert.deepEqual(second, first);
  }
});

test('asks one question when a required field is missing', () => {
  const result = assessInitiative({
    proposal: 'A traditional retailer wants a GenAI assistant for customer service.',
  });
  assert.equal(result.status, 'needs_input');
  assert.deepEqual(result.missing_fields, ['revenue_eur']);
  assert.equal(result.next_question, "What is the organisation's approximate annual revenue in EUR?");
  assert.equal(result.verdict, undefined);
});

test('provided values override proposal resolution', () => {
  const result = assessInitiative({
    proposal: 'A traditional retailer with EUR 300m revenue wants a GenAI assistant for customer service.',
    readiness: 'agile',
  });
  assert.equal(result.resolved_inputs.readiness, 'agile');
  assert.equal(result.status, 'verdict');
});
