import type {
  WorkArchitectureAssessment,
  WorkArchitectureCheck,
  WorkArchitectureInput,
} from './types.js';

const CHECKS: Array<{ id: keyof WorkArchitectureInput; label: string }> = [
  { id: 'workflow_redesigned', label: 'end-to-end workflow redesigned' },
  { id: 'roles_redesigned', label: 'affected roles and accountabilities redesigned' },
  { id: 'decision_rights_defined', label: 'decision, override and escalation rights defined' },
  { id: 'measures_updated', label: 'performance measures and incentives updated' },
];

export function assessWorkArchitecture(input?: WorkArchitectureInput): WorkArchitectureAssessment {
  const checks: WorkArchitectureCheck[] = CHECKS.map(({ id, label }) => ({
    id,
    label,
    status: input?.[id] === true ? 'met' : input?.[id] === false ? 'gap' : 'unknown',
  }));
  const gaps = checks.filter(check => check.status === 'gap').map(check => check.label);
  const known = checks.filter(check => check.status !== 'unknown').length;
  const status: WorkArchitectureAssessment['status'] = gaps.length
    ? 'gap'
    : known === checks.length
      ? 'ready'
      : known > 0 ? 'partial' : 'unknown';

  return {
    status,
    blocks_accelerate: gaps.length > 0,
    checks,
    gaps,
    ...(status !== 'ready' ? {
      next_question: 'What changes in the end-to-end workflow, affected roles, human decision rights and performance measures before this AI goes live?',
    } : {}),
    gate: 'Accelerate requires no stated work architecture gaps, with the workflow, affected roles, human decision rights and performance measures evidenced before deployment.',
  };
}
