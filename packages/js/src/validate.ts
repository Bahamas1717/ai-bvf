import { INDUSTRIES, FUNCTIONS, AI_TIERS } from './taxonomy.js';
import type { ValidationError, ValidationResult } from './types.js';

const PILLARS = ['strategic_alignment','financial_return','change_enablement','governance_risk'] as const;
const BUCKETS = ['Agent-Proof','Agent-Augmented','Agent-Replaceable'];
const CLASSIFICATIONS = ['Accelerate','Fix','Stop'];
const COMPLIANCE = ['eu_ai_act','dora','csrd','gdpr_ai'];

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Validates a portfolio document against the AI BVF v1.0 schema.
 * Deterministic, no network, no dependencies.
 */
export function validate(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const push = (path: string, msg: string) => errors.push({ path, msg });

  if (!isObj(doc)) return { valid: false, errors: [{ path: '', msg: 'Document must be a JSON object.' }] };

  if (doc.bvf_version !== '1.0') push('bvf_version', 'Required. Must be the string "1.0".');

  const org = doc.organization;
  if (!isObj(org)) push('organization', 'Required object.');
  else {
    if (typeof org.name !== 'string' || !org.name) push('organization.name', 'Required string.');
    if (typeof org.industry !== 'string' || !INDUSTRIES.includes(org.industry as typeof INDUSTRIES[number])) {
      push('organization.industry', `Must be one of: ${INDUSTRIES.join(', ')}.`);
    }
    if (org.revenue_eur !== undefined && (typeof org.revenue_eur !== 'number' || org.revenue_eur < 0)) {
      push('organization.revenue_eur', 'Must be a non-negative number.');
    }
  }

  if (!Array.isArray(doc.initiatives) || doc.initiatives.length === 0) {
    push('initiatives', 'Required. Must be a non-empty array.');
  } else {
    doc.initiatives.forEach((init, i) => {
      const base = `initiatives[${i}]`;
      if (!isObj(init)) { push(base, 'Must be an object.'); return; }
      if (typeof init.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(init.id)) push(`${base}.id`, 'Required. Lowercase letters, digits, hyphens only (max 64).');
      if (typeof init.name !== 'string' || !init.name) push(`${base}.name`, 'Required string.');
      else if (init.name.length > 240) push(`${base}.name`, 'Exceeds 240 characters.');
      if (typeof init.function !== 'string' || !FUNCTIONS.includes(init.function as typeof FUNCTIONS[number])) push(`${base}.function`, `Must be one of: ${FUNCTIONS.join(', ')}.`);
      if (typeof init.ai_tier !== 'string' || !AI_TIERS.includes(init.ai_tier as typeof AI_TIERS[number])) push(`${base}.ai_tier`, `Must be one of: ${AI_TIERS.join(', ')}.`);
      if (init.bucket !== undefined && !BUCKETS.includes(init.bucket as string)) push(`${base}.bucket`, `Must be one of: ${BUCKETS.join(', ')}.`);

      const scores = init.scores;
      if (!isObj(scores)) push(`${base}.scores`, 'Required object with all four pillar scores.');
      else {
        for (const p of PILLARS) {
          // Both shapes are valid: a bare number, or { value, confidence? }.
          // Field reports showed agents naturally write scores: { pillar: 68 };
          // rejecting that was rigidity, not rigour.
          const ps = scores[p];
          if (typeof ps === 'number') {
            if (ps < 0 || ps > 100) push(`${base}.scores.${p}`, 'Number in [0, 100].');
            continue;
          }
          if (!isObj(ps)) { push(`${base}.scores.${p}`, 'Required. A number in [0, 100], or an object with a value in [0, 100].'); continue; }
          const v = ps.value;
          if (typeof v !== 'number' || v < 0 || v > 100) push(`${base}.scores.${p}.value`, 'Required. Number in [0, 100].');
          if (ps.confidence !== undefined && (typeof ps.confidence !== 'number' || ps.confidence < 0 || ps.confidence > 100)) {
            push(`${base}.scores.${p}.confidence`, 'Optional. Number in [0, 100].');
          }
        }
      }

      if (init.classification !== undefined && !CLASSIFICATIONS.includes(init.classification as string)) push(`${base}.classification`, `Must be one of: ${CLASSIFICATIONS.join(', ')}.`);
      if (init.decision_confidence !== undefined) {
        const v = init.decision_confidence;
        if (typeof v !== 'number' || v < 0 || v > 100) push(`${base}.decision_confidence`, 'Must be a number in [0, 100].');
      }
      if (init.compliance !== undefined) {
        if (!Array.isArray(init.compliance)) push(`${base}.compliance`, 'Must be an array.');
        else init.compliance.forEach((c, j) => {
          if (!COMPLIANCE.includes(c as string)) push(`${base}.compliance[${j}]`, `Must be one of: ${COMPLIANCE.join(', ')}.`);
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
