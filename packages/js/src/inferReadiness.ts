/**
 * infer_readiness: measure organisational readiness instead of asking for it.
 *
 * Readiness is the AI BVF's most consequential input, it sets the value
 * capture rate, the pace-layer drag, and (since 0.8.0) the estimated
 * change-enablement pillar, and it has always been self-reported, which is
 * the same gaming surface every maturity model carries. This module closes
 * that surface: it reads the operational signals an organisation cannot
 * easily flatter, hand-offs, rework, wait time, automation coverage and
 * cycle time against the disclosed AI BVF function reference points, and returns the
 * readiness classification the process data supports, with a confidence
 * governed by how many signals were provided and how well they agree.
 *
 * The mapping is the operational definition of the words themselves:
 * siloed IS many hand-offs, high rework and long waits; agile IS few
 * hand-offs, low rework and short decision loops. Deterministic, like
 * everything in the engine: same signals, same answer.
 */
import type { FunctionId, Readiness, InferReadinessInput, InferReadinessResult, SignalRead } from './types.js';
import { FUNCTION_MEDIANS } from './diagnose.js';
import { buildAudit } from './audit.js';

type Lean = 0 | 1 | 2; // 0 = agile-leaning, 1 = traditional-leaning, 2 = siloed-leaning

const LEAN_LABEL: Record<Lean, Readiness> = { 0: 'agile', 1: 'traditional', 2: 'siloed' };

function read(signal: string, value: number, lean: Lean, note: string): SignalRead {
  return { signal, value, leans: LEAN_LABEL[lean], note };
}

/**
 * Infer readiness from measured process signals. Requires `function` (for
 * the medians) and at least two of the five signals; confidence scales with
 * coverage and drops when the signals disagree.
 */
export function inferReadiness(input: InferReadinessInput): InferReadinessResult {
  const med = FUNCTION_MEDIANS[input.function as FunctionId];
  if (!med) throw new Error(`Unknown function: ${input.function}`);

  const reads: SignalRead[] = [];
  const leans: Lean[] = [];

  if (typeof input.handoffs === 'number') {
    const ratio = input.handoffs / med.handoffs;
    const lean: Lean = ratio >= 1.5 ? 2 : ratio >= 1.0 ? 1 : 0;
    leans.push(lean);
    reads.push(read('handoffs', input.handoffs, lean,
      `${input.handoffs} hand-offs against a ${med.handoffs} median for ${input.function}: ${lean === 2 ? 'work moves by escalation, the structural signature of a siloed organisation' : lean === 1 ? 'a functional hierarchy passing work along its lines' : 'few owners per outcome, decisions stay close to the work'}.`));
  }
  if (typeof input.rework_rate === 'number') {
    const lean: Lean = input.rework_rate >= 0.15 ? 2 : input.rework_rate >= 0.05 ? 1 : 0;
    leans.push(lean);
    reads.push(read('rework_rate', input.rework_rate, lean,
      `${Math.round(input.rework_rate * 100)}% of instances reopened: ${lean === 2 ? 'quality is being negotiated between departments after the fact' : lean === 1 ? 'normal friction for a traditional operating model' : 'first-time-right discipline, a fast-feedback culture'}.`));
  }
  if (typeof input.touch_ratio === 'number') {
    const lean: Lean = input.touch_ratio < 0.15 ? 2 : input.touch_ratio <= 0.4 ? 1 : 0;
    leans.push(lean);
    reads.push(read('touch_ratio', input.touch_ratio, lean,
      `${Math.round(input.touch_ratio * 100)}% of elapsed time is actual work, the rest is waiting: ${lean === 2 ? 'the process spends its life in queues between functions' : lean === 1 ? 'meaningful wait states between owners' : 'short decision loops, little queueing'}.`));
  }
  if (typeof input.automation_level === 'number') {
    const lean: Lean = input.automation_level < 0.2 ? 2 : input.automation_level <= 0.5 ? 1 : 0;
    leans.push(lean);
    reads.push(read('automation_level', input.automation_level, lean,
      `${Math.round(input.automation_level * 100)}% already automated: ${lean === 2 ? 'manual effort is the norm, prior automation attempts have not stuck' : lean === 1 ? 'partial automation, typical of a traditional estate' : 'the organisation already absorbs automation well'}.`));
  }
  if (typeof input.cycle_time_days === 'number') {
    const ratio = input.cycle_time_days / med.cycle_days;
    const lean: Lean = ratio >= 1.5 ? 2 : ratio >= 0.75 ? 1 : 0;
    leans.push(lean);
    reads.push(read('cycle_time_days', input.cycle_time_days, lean,
      `${input.cycle_time_days} days against a ${med.cycle_days}-day median for ${input.function}: ${lean === 2 ? 'the operating model is adding most of the elapsed time' : lean === 1 ? 'in line with a functional hierarchy' : 'faster than the median, the structure is not in the way'}.`));
  }

  if (leans.length < 2) {
    throw new Error('infer_readiness needs at least two measured signals (of handoffs, rework_rate, touch_ratio, automation_level, cycle_time_days). With fewer, self-reported readiness plus signal_completeness is the honest fallback.');
  }

  const avg = leans.reduce((s: number, l) => s + l, 0) / leans.length;
  const readiness: Readiness = avg >= 1.4 ? 'siloed' : avg >= 0.7 ? 'traditional' : 'agile';

  // Confidence: coverage sets the base, disagreement discounts it.
  const COVERAGE_BASE: Record<number, number> = { 2: 45, 3: 60, 4: 75, 5: 90 };
  const base = COVERAGE_BASE[leans.length] ?? 90;
  const spread = Math.max(...leans) - Math.min(...leans); // 0 = unanimous, 2 = fully split
  const confidence = Math.max(20, Math.round(base - spread * 10));

  const disagreement = spread === 2
    ? 'The signals disagree with each other, some read agile while others read siloed, which usually means readiness is uneven across the process rather than one thing. Treat the classification as the centre of gravity and look at the per-signal reads.'
    : undefined;

  // Claimed versus measured: when the organisation's self-image and its
  // process data disagree, the gap is the finding, not a rounding error.
  const ORDER: Record<Readiness, number> = { agile: 0, traditional: 1, siloed: 2 };
  let claimedBlock: Pick<InferReadinessResult, 'claimed_readiness' | 'readiness_gap' | 'gap_finding'> = {};
  if (input.claimed_readiness) {
    const gap = ORDER[readiness] - ORDER[input.claimed_readiness];
    claimedBlock = {
      claimed_readiness: input.claimed_readiness,
      readiness_gap: gap,
      ...(gap > 0 ? { gap_finding: `The organisation describes itself as ${input.claimed_readiness} and measures as ${readiness}, ${gap === 1 ? 'one notch' : 'two notches'} below its self-image. That gap is itself a change-readiness finding: plan the change work for the measured level, because the process data is what the initiative will actually land on.` }
        : gap < 0 ? { gap_finding: `The organisation describes itself as ${input.claimed_readiness} but measures as ${readiness}, better than it claims. Understated capacity is rare and useful: there is more change absorption available than the self-report suggests.` }
        : { gap_finding: `Claimed and measured readiness agree at ${readiness}: the self-report holds up against the process data, which strengthens confidence in every score built on it.` }),
    };
  }

  return {
    readiness,
    readiness_basis: 'measured',
    confidence,
    signals_used: leans.length,
    signal_reads: reads,
    ...(disagreement ? { disagreement } : {}),
    ...claimedBlock,
    guidance: `Pass readiness="${readiness}" to score_initiative, score_portfolio, recommend_improvements or calculate_pace_layer_drag. If this measured classification is lower than the self-reported one, trust the process data: the gap between what an organisation says and what its hand-offs show is itself a change-readiness finding.`,
    audit: buildAudit(
      [
        `signals:${leans.length}`,
        `mean_lean:${(leans.reduce((a: number, b) => a + b, 0) / leans.length).toFixed(2)}`,
        `classify:${readiness}`,
        `confidence:${confidence}(coverage_base-disagreement)`,
        ...(input.claimed_readiness ? [`claimed_vs_measured:${input.claimed_readiness}->${readiness}`] : []),
      ],
      { function: input.function, signals_provided: leans.length, ...(input.claimed_readiness ? { claimed_readiness: input.claimed_readiness } : {}) },
    ),
  };
}
