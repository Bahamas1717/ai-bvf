/**
 * sequence_portfolio: the Coroner's Sequencer lifted into the engine, with
 * change capacity as a first-class constraint. Ten good ideas can still
 * break an organisation if they all land on Finance in the same quarter,
 * so the plan is three 30-day waves with named gates, and per-function
 * parallel-change limits that defer overflow rather than pretending an
 * organisation can absorb everything at once.
 *
 * Wave logic, unchanged from the Coroner:
 * - Wave 1, days 1-30: every Stop. Free the budget, signal seriousness.
 * - Wave 2, days 31-60: the quicker half of the Accelerates. Bank early
 *   wins, de-risk the sponsor.
 * - Wave 3, days 61-90: complex Accelerates plus all Fixes, which enter
 *   behind their re-score gates with the trust the first waves bought.
 *
 * Deterministic: same portfolio, same constraints, same plan.
 */
import type {
  SequenceInput, SequenceResult, SequencedItem, SequenceWave, CapacityConflict,
  Classification, FunctionId,
} from './types.js';
import { score } from './score.js';
import { buildAudit } from './audit.js';

const TIER_COMPLEXITY: Record<string, number> = { gen1: 1, gen2: 2, gen3: 4 };

/** Lower is quicker to ship: tier ambition plus a penalty for shaky confidence. */
function complexity(item: SequencedItem): number {
  return (TIER_COMPLEXITY[item.ai_tier] ?? 2) + (item.decision_confidence < 50 ? 2 : 0);
}

/**
 * Accept both input shapes: the flat SequenceInput, and the score_portfolio
 * wire document ({ portfolio: { organization, initiatives } }) with nested
 * { value } pillar scores. Agents naturally reuse the portfolio document
 * across the two tools; refusing it was a field-reported failure.
 */
function normalizeSequenceInput(raw: any): SequenceInput {
  const src = raw?.portfolio && !raw?.initiatives ? raw.portfolio : raw;
  const organization = src?.organization ?? raw?.organization;
  const rawInits = src?.initiatives;
  if (!organization || typeof organization.industry !== 'string') {
    throw new Error('sequence_portfolio needs organization.industry and organization.revenue_eur, either top-level or inside a portfolio document.');
  }
  if (!Array.isArray(rawInits) || rawInits.length === 0) {
    throw new Error('sequence_portfolio needs a non-empty initiatives array, either top-level or inside a portfolio document.');
  }
  const flat = (v: any): number | undefined =>
    typeof v === 'number' ? v : (v && typeof v.value === 'number' ? v.value : undefined);
  const initiatives = rawInits.map((i: any, idx: number) => {
    const sc = i?.scores ?? {};
    const scores: any = {};
    for (const k of ['strategic_alignment', 'financial_return', 'change_enablement', 'governance_risk']) {
      const n = flat(sc[k]);
      if (n !== undefined) scores[k] = n;
    }
    return {
      id: String(i?.id ?? `initiative-${idx + 1}`),
      name: String(i?.name ?? i?.id ?? `Initiative ${idx + 1}`),
      function: i?.function,
      ai_tier: i?.ai_tier,
      scores, // partial is fine: score() estimates missing pillars honestly
    };
  });
  return {
    organization,
    initiatives,
    readiness: raw?.readiness ?? src?.readiness,
    constraints: raw?.constraints,
  } as SequenceInput;
}

export function sequencePortfolio(rawInput: SequenceInput | Record<string, unknown>): SequenceResult {
  const input = normalizeSequenceInput(rawInput);
  const { organization, initiatives, readiness } = input;
  const maxParallel = Math.max(1, input.constraints?.max_parallel_per_function ?? 2);
  const horizon = input.constraints?.horizon_days ?? 90;
  const waveLen = Math.round(horizon / 3);

  const scored: SequencedItem[] = [];
  const skipped: Array<{ id: string; name: string; reason: string }> = [];

  for (const init of initiatives) {
    try {
      const r = score({
        industry: organization.industry,
        revenue_eur: organization.revenue_eur,
        function: init.function,
        ai_tier: init.ai_tier,
        readiness,
        scores: init.scores,
      });
      scored.push({
        id: init.id, name: init.name, function: init.function, ai_tier: init.ai_tier,
        classification: r.classification,
        action: '', reason: r.reason,
        net_value_eur: { low: r.net_low_eur, high: r.net_high_eur },
        decision_confidence: r.confidence,
      });
    } catch (e) {
      skipped.push({ id: init.id, name: init.name, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  const stops = scored.filter(x => x.classification === 'Stop');
  const accelerates = scored.filter(x => x.classification === 'Accelerate').sort((a, b) => complexity(a) - complexity(b) || b.net_value_eur.high - a.net_value_eur.high);
  const fixes = scored.filter(x => x.classification === 'Fix');

  const quickCount = accelerates.length ? Math.max(1, Math.floor(accelerates.length / 2)) : 0;
  const wave2Seed = accelerates.slice(0, quickCount);
  const wave3Seed = [...accelerates.slice(quickCount), ...fixes];

  stops.forEach(x => { x.action = 'Stop now and reclaim the budget and attention. Announce it: a visible Stop is what makes the rest of the plan credible.'; });
  wave2Seed.forEach(x => { x.action = 'Ship inside the wave. Scoped, measured, and reported as the early win the later waves borrow trust from.'; });
  wave3Seed.forEach(x => {
    x.action = x.classification === 'Fix'
      ? 'Run recommend_improvements for the change plan first; this enters the wave behind its re-score gate, not before.'
      : 'Deliver with the trust and capacity the first two waves freed up.';
  });

  // Change-capacity constraint: at most maxParallel initiatives landing on
  // one function per wave. Overflow defers to the next wave, then beyond
  // the horizon, and every deferral is reported as a conflict, because the
  // constraint IS the finding.
  const conflicts: CapacityConflict[] = [];
  const deferred: SequencedItem[] = [];

  function applyCapacity(seed: SequencedItem[], wave: number, carryTo: SequencedItem[] | null): SequencedItem[] {
    const kept: SequencedItem[] = [];
    const perFn = new Map<FunctionId, number>();
    for (const item of seed) {
      const n = perFn.get(item.function) ?? 0;
      if (n < maxParallel) {
        perFn.set(item.function, n + 1);
        kept.push(item);
      } else {
        const existing = conflicts.find(c => c.function === item.function && c.wave === wave);
        if (existing) existing.overflow.push(item.name);
        else conflicts.push({
          function: item.function, wave, overflow: [item.name],
          resolution: carryTo
            ? `More than ${maxParallel} initiatives land on ${item.function} in wave ${wave}; overflow moves to the next wave so the function is changed, not overwhelmed.`
            : `More than ${maxParallel} initiatives land on ${item.function} in wave ${wave}; overflow moves beyond the ${horizon}-day horizon and needs its own decision.`,
        });
        if (carryTo) carryTo.push(item);
        else deferred.push(item);
      }
    }
    return kept;
  }

  const wave1Items = stops; // stopping does not consume change capacity, it frees it
  const wave3Carry: SequencedItem[] = [];
  const wave2Items = applyCapacity(wave2Seed, 2, wave3Carry);
  const wave3All = [...wave3Seed, ...wave3Carry];
  const wave3Items = applyCapacity(wave3All, 3, null);

  const waves: SequenceWave[] = [
    {
      wave: 1, window_days: [1, waveLen], theme: 'Stop and reclaim',
      rationale: 'Every Stop verdict lands first. Freeing budget and attention is the cheapest value in the portfolio, and a visible Stop signals the scoring is real.',
      initiatives: wave1Items,
      gate_to_next: 'Stops announced and budgets reclaimed; owners of wave 2 initiatives named.',
    },
    {
      wave: 2, window_days: [waveLen + 1, waveLen * 2], theme: 'Quick, visible wins',
      rationale: 'The quicker half of the Accelerates, by tier and confidence. Early wins buy the sponsor the trust the complex work will spend.',
      initiatives: wave2Items,
      gate_to_next: 'At least one wave 2 initiative measurably delivering; change capacity confirmed free for wave 3.',
    },
    {
      wave: 3, window_days: [waveLen * 2 + 1, horizon], theme: 'Complex builds and repaired Fixes',
      rationale: 'The ambitious Accelerates plus every Fix, each behind its re-score gate. This wave only works on the trust and capacity the first two created.',
      initiatives: wave3Items,
      gate_to_next: null,
    },
  ];

  const accEUR = [...wave2Items, ...wave3Items].filter(x => x.classification === 'Accelerate');
  const aggregate = {
    low: accEUR.reduce((s, x) => s + x.net_value_eur.low, 0),
    high: accEUR.reduce((s, x) => s + x.net_value_eur.high, 0),
  };

  return {
    waves,
    capacity_conflicts: conflicts,
    deferred_beyond_horizon: deferred,
    skipped,
    totals: { stopped: wave1Items.length, quick_wins: wave2Items.length, complex_or_fix: wave3Items.length, deferred: deferred.length },
    aggregate_accelerate_value_eur: aggregate,
    sequencing_principles: [
      'Stops go first: reclaimed budget and attention fund everything after.',
      'Early wins precede ambition: wave 2 exists to buy wave 3 its trust.',
      `No function absorbs more than ${maxParallel} concurrent changes per wave: ten good ideas can still break an organisation if they all land in one place.`,
      'Fixes enter only behind their re-score gates, never on hope.',
    ],
    audit: buildAudit(
      [
        `waves:3x${waveLen}d(horizon:${horizon})`,
        `capacity:max_parallel_per_function=${maxParallel}`,
        `wave1:stops=${wave1Items.length}`,
        `wave2:quick_accelerates=${wave2Items.length}`,
        `wave3:complex_plus_fixes=${wave3Items.length}`,
        ...(conflicts.length ? [`capacity_conflicts:${conflicts.length}`] : []),
      ],
      { organization: { industry: organization.industry, revenue_eur: organization.revenue_eur }, readiness, initiatives: initiatives.length },
    ),
  };
}
