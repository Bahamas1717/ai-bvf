/**
 * The autonomy loop, first walking skeleton. docs/autonomy-spec.md §1:
 * PERCEIVE → REMEMBER → PRIORITISE → JUDGE → ACT(T0) → VERIFY(schedule),
 * fired by the Vercel cron heartbeat, bounded by the mandate row.
 *
 * Customer zero is the AI BVF estate itself: the three processes that run
 * this one-person firm, measured honestly at their real (small) baselines.
 * Perception is seeded inline for now; connectors replace the seed without
 * changing anything downstream, because everything downstream reads the
 * estate model, not the source.
 *
 * Autonomy tier is T0 (advise only). The loop writes verdicts, one proposed
 * action for the top attention item, and a verification date. It changes
 * nothing outside its own tables.
 */
import { diagnoseProcess } from '../../packages/js/dist/index.js';

const ESTATE_URL = process.env.AIBVF_ESTATE_URL
  ?? 'https://eomlyjtscwxibezoymxg.supabase.co/rest/v1';
// Service role, set only in Vercel env. Never shipped, never public — the
// estate tables are default-deny and this key is the only way in.
const ESTATE_KEY = process.env.AIBVF_ESTATE_SERVICE_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const MANDATE = {
  name: 'craig-horton-estate', // DB identifier, matches the live bvf_mandate row; not a GitHub handle
  scope: { functions: ['sales', 'it', 'cx'], exclude_processes: [] },
  autonomy_tier: 'T0',
  act_floor: { min_saving_eur: 1000, min_confidence: 0.5 },
  hard_limits: ['advise only', 'no outward communication', 'no spend'],
  cadence: { sweep: 'nightly', verify_after_days: 30 },
  report_to: 'craigmds1@gmail.com',
};

/**
 * The estate, measured 2026-07-06. Real numbers for a firm of one: rate is
 * Craig's loaded hour, volumes come from the calendar and the release log,
 * completeness says how much was measured rather than guessed. readiness is
 * agile because a one-person firm with agents decides in minutes.
 */
const SEED_PROCESSES = [
  {
    external_ref: 'brief-production',
    name: 'Transformation Brief weekly production',
    function: 'sales' as const,
    signals: {
      instances_per_year: 52, fte_hours_per_instance: 10, loaded_hourly_rate_eur: 150,
      cycle_time_days: 4, touch_ratio: 0.10, handoffs: 3, rework_rate: 0.15,
      automation_level: 0.35, direct_spend_eur: 0, signal_completeness: 0.7,
    },
  },
  {
    external_ref: 'release-pipeline',
    name: 'Engine and connector release pipeline',
    function: 'it' as const,
    signals: {
      instances_per_year: 40, fte_hours_per_instance: 1.5, loaded_hourly_rate_eur: 150,
      cycle_time_days: 0.15, touch_ratio: 0.6, handoffs: 2, rework_rate: 0.08,
      automation_level: 0.85, direct_spend_eur: 0, signal_completeness: 0.8,
    },
  },
  {
    external_ref: 'field-support',
    name: 'Field reports and connector support',
    function: 'cx' as const,
    signals: {
      instances_per_year: 50, fte_hours_per_instance: 2.5, loaded_hourly_rate_eur: 150,
      cycle_time_days: 1, touch_ratio: 0.15, handoffs: 2, rework_rate: 0.06,
      automation_level: 0.4, direct_spend_eur: 0, signal_completeness: 0.5,
    },
  },
];

async function sb(path: string, init: RequestInit & { prefer?: string } = {}) {
  const res = await fetch(`${ESTATE_URL}/${path}`, {
    ...init,
    headers: {
      apikey: ESTATE_KEY,
      Authorization: `Bearer ${ESTATE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`estate ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ensureMandate() {
  const rows = await sb(`bvf_mandate?name=eq.${MANDATE.name}&select=*`);
  if (rows.length) return rows[0];
  const created = await sb('bvf_mandate', {
    method: 'POST', body: JSON.stringify(MANDATE), prefer: 'return=representation',
  });
  return created[0];
}

export default async function handler(req: any, res: any) {
  const auth = String(req.headers?.authorization ?? '');
  const key = String(req.query?.key ?? '');
  if (!CRON_SECRET || (auth !== `Bearer ${CRON_SECRET}` && key !== CRON_SECRET)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'heartbeat requires the cron secret' }));
  }
  if (!ESTATE_KEY) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'AIBVF_ESTATE_SERVICE_KEY is not set; the estate is unreachable and the agent will not guess' }));
  }

  try {
    const mandate = await ensureMandate();
    const summary: any = { mandate: mandate.name, tier: mandate.autonomy_tier, judged: [], actions_created: 0, snapshots_written: 0 };

    for (const p of SEED_PROCESSES) {
      // REMEMBER: stable process identity, idempotent on (mandate, external_ref)
      const proc = (await sb('bvf_process?on_conflict=mandate_id,external_ref', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify({ mandate_id: mandate.id, external_ref: p.external_ref, name: p.name, function: p.function, last_seen: new Date().toISOString() }),
      }))[0];

      // PERCEIVE: one snapshot per day, append-only; a fresh one within 20h
      // means this heartbeat already saw today.
      const recent = await sb(`bvf_signal_snapshot?process_id=eq.${proc.id}&captured_at=gte.${new Date(Date.now() - 20 * 3600e3).toISOString()}&select=id&limit=1`);
      let snapshotId: string | null = recent[0]?.id ?? null;
      if (!snapshotId) {
        const snap = (await sb('bvf_signal_snapshot', {
          method: 'POST', prefer: 'return=representation',
          body: JSON.stringify({ process_id: proc.id, source: 'seed-v1', ...p.signals }),
        }))[0];
        snapshotId = snap.id;
        summary.snapshots_written++;
      }

      // JUDGE: the Brain, deterministic, same engine the connector ships.
      const verdict = diagnoseProcess({ process_id: p.external_ref, function: p.function, readiness: 'agile', ...p.signals });
      const v = (await sb('bvf_verdict', {
        method: 'POST', prefer: 'return=representation',
        body: JSON.stringify({
          process_id: proc.id, snapshot_id: snapshotId,
          baseline_cost_eur: verdict.baseline_cost_eur, heaviness: verdict.heaviness,
          drag_decomposition: verdict.drag_decomposition, intervention: verdict.intervention,
          net_saving_low_eur: verdict.net_saving_low_eur, net_saving_high_eur: verdict.net_saving_high_eur,
          efficiency_gain_pct: verdict.efficiency_gain_pct, verdict: verdict.verdict,
          decision_confidence: verdict.decision_confidence, assumptions: verdict.assumptions,
          offer_to_execute: verdict.verdict === 'Accelerate', brain_version: '0.1',
        }),
      }))[0];
      summary.judged.push({ process: p.name, verdict: verdict.verdict, net_saving_eur: { low: verdict.net_saving_low_eur, high: verdict.net_saving_high_eur }, confidence: verdict.decision_confidence, intervention: verdict.intervention, verdict_id: v.id });
    }

    // PRIORITISE: the attention view ranks Accelerates by euros-at-stake.
    const attention = await sb('bvf_attention?select=*');
    summary.attention = attention;

    // ACT, T0 only: propose (never execute) for the top item over the floor,
    // and schedule the verification that will audit the promise.
    const floor = mandate.act_floor ?? MANDATE.act_floor;
    const top = attention[0];
    if (top && top.net_saving_low_eur >= floor.min_saving_eur && top.decision_confidence >= floor.min_confidence) {
      // One open proposal per PROCESS, not per verdict: every sweep writes a
      // fresh verdict row, so deduping on verdict_id would re-propose the same
      // work nightly. A watchman who nags daily is a watchman who gets ignored.
      const existing = await sb(`bvf_action?select=id,bvf_verdict!inner(process_id)&bvf_verdict.process_id=eq.${top.process_id}&status=in.(proposed,approved,executing)&limit=1`);
      if (!existing.length) {
        const action = (await sb('bvf_action', {
          method: 'POST', prefer: 'return=representation',
          body: JSON.stringify({
            verdict_id: top.verdict_id, tier: 'T0', status: 'proposed',
            predicted_saving_low_eur: top.net_saving_low_eur, predicted_saving_high_eur: top.net_saving_high_eur,
            artifact_ref: `advisory: ${top.name} — heaviness ${top.heaviness}, judge says act`,
          }),
        }))[0];
        await sb('bvf_verification', {
          method: 'POST',
          body: JSON.stringify({ action_id: action.id, verify_due_at: new Date(Date.now() + (mandate.cadence?.verify_after_days ?? 30) * 86400e3).toISOString() }),
        });
        summary.actions_created++;
      }
    }

    // VERIFY: surface anything due, so no promise quietly expires.
    summary.verifications_due = await sb(`bvf_verification?verified_at=is.null&verify_due_at=lte.${new Date().toISOString()}&select=id,action_id,verify_due_at`);

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(summary, null, 2));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
}
