/**
 * aibvf-check — the AI BVF CI/CD pre-flight gate.
 *
 * Reads a declared manifest of AI initiatives, scores each one with the
 * deterministic AI BVF engine (@aibvf/core), applies a policy, and reports
 * which initiatives violate it. The executable (cli.ts) turns a violation
 * into a non-zero exit so the build goes red — "SonarQube for AI".
 *
 * This module is pure: no file IO, no process.exit, no console. That keeps
 * the gate logic unit-testable; cli.ts owns the side effects.
 */
import { score } from '@aibvf/core';
import type { Industry, FunctionId, AiTier, Readiness, Classification } from '@aibvf/core';

export interface ManifestInitiative {
  id: string;
  function: FunctionId;
  ai_tier: AiTier;
  readiness: Readiness;
  scores: {
    strategic_alignment: number;
    financial_return: number;
    change_enablement: number;
    governance_risk: number;
  };
  /** Optional 0–1; forwarded to score() so estimated inputs haircut confidence. */
  signal_completeness?: number;
}

export interface ManifestPolicy {
  /** Classifications that fail the gate. Defaults to ['Stop']. */
  fail_on?: Classification[];
  /** Optional hard ceiling on governance_risk (0–100). A higher value fails. */
  max_governance_risk?: number;
  /** Optional floor on decision confidence (0–100). A lower value fails. */
  min_decision_confidence?: number;
}

export interface Manifest {
  bvf_version?: string;
  organization: { industry: Industry; revenue_eur: number };
  policy?: ManifestPolicy;
  initiatives: ManifestInitiative[];
}

export interface InitiativeResult {
  id: string;
  function: FunctionId;
  ai_tier: AiTier;
  classification: Classification;
  decision_confidence: number;
  governance_risk: number;
  net_value_eur: { low: number; high: number };
  reason: string;
  caveat?: string;
  violations: string[];
}

export interface CheckResult {
  ok: boolean;
  policy: Required<Pick<ManifestPolicy, 'fail_on'>> & ManifestPolicy;
  results: InitiativeResult[];
  /** Flat list of "<id>: <violation>" strings across all initiatives. */
  failures: string[];
}

const DEFAULT_FAIL_ON: Classification[] = ['Stop'];

/**
 * Validate the manifest shape enough to score it. Returns a list of human
 * error strings; empty means well-formed. Kept deliberately light — score()
 * itself rejects unknown enums, so this only catches structural gaps.
 */
export function lintManifest(m: unknown): string[] {
  const errors: string[] = [];
  if (typeof m !== 'object' || m === null) return ['Manifest must be a JSON object.'];
  const man = m as Record<string, unknown>;
  const org = man.organization as Record<string, unknown> | undefined;
  if (!org || typeof org !== 'object') errors.push('organization is required.');
  else {
    if (typeof org.industry !== 'string') errors.push('organization.industry is required.');
    if (typeof org.revenue_eur !== 'number') errors.push('organization.revenue_eur (number) is required.');
  }
  if (!Array.isArray(man.initiatives) || man.initiatives.length === 0) {
    errors.push('initiatives must be a non-empty array.');
  } else {
    man.initiatives.forEach((init, i) => {
      const it = init as Record<string, unknown>;
      if (typeof it.id !== 'string') errors.push(`initiatives[${i}].id is required.`);
      if (typeof it.function !== 'string') errors.push(`initiatives[${i}].function is required.`);
      if (typeof it.ai_tier !== 'string') errors.push(`initiatives[${i}].ai_tier is required.`);
      if (typeof it.readiness !== 'string') errors.push(`initiatives[${i}].readiness is required.`);
      const sc = it.scores as Record<string, unknown> | undefined;
      if (!sc || typeof sc !== 'object') errors.push(`initiatives[${i}].scores is required.`);
      else {
        for (const p of ['strategic_alignment', 'financial_return', 'change_enablement', 'governance_risk']) {
          if (typeof sc[p] !== 'number') errors.push(`initiatives[${i}].scores.${p} (number) is required.`);
        }
      }
    });
  }
  return errors;
}

/**
 * Score every initiative in the manifest and apply the policy.
 * Pure: deterministic, no IO. Throws only if score() rejects an enum value.
 */
export function runCheck(manifest: Manifest): CheckResult {
  const fail_on = manifest.policy?.fail_on ?? DEFAULT_FAIL_ON;
  const maxGov = manifest.policy?.max_governance_risk;
  const minConf = manifest.policy?.min_decision_confidence;
  const { industry, revenue_eur } = manifest.organization;

  const results: InitiativeResult[] = manifest.initiatives.map((init) => {
    const r = score({
      industry,
      revenue_eur,
      function: init.function,
      ai_tier: init.ai_tier,
      readiness: init.readiness,
      scores: init.scores,
      signal_completeness: init.signal_completeness,
    });

    const violations: string[] = [];
    if (fail_on.includes(r.classification)) {
      violations.push(`classification ${r.classification} is blocked by policy.fail_on`);
    }
    if (typeof maxGov === 'number' && init.scores.governance_risk > maxGov) {
      violations.push(`governance_risk ${init.scores.governance_risk} exceeds max_governance_risk ${maxGov}`);
    }
    if (typeof minConf === 'number' && r.confidence < minConf) {
      violations.push(`decision_confidence ${r.confidence} below min_decision_confidence ${minConf}`);
    }

    return {
      id: init.id,
      function: init.function,
      ai_tier: init.ai_tier,
      classification: r.classification,
      decision_confidence: r.confidence,
      governance_risk: init.scores.governance_risk,
      net_value_eur: { low: r.net_low_eur, high: r.net_high_eur },
      reason: r.reason,
      ...(r.caveat ? { caveat: r.caveat } : {}),
      violations,
    };
  });

  const failures = results.flatMap((res) => res.violations.map((v) => `${res.id}: ${v}`));
  return {
    ok: failures.length === 0,
    policy: { fail_on, max_governance_risk: maxGov, min_decision_confidence: minConf },
    results,
    failures,
  };
}
