/**
 * aibvf-mcp server core: schemas, tool definitions and handlers, transport-
 * agnostic. Consumed by index.ts (stdio, the npx path) and by the remote
 * Streamable HTTP endpoint (api/mcp.ts on Vercel).
 */
import { createHash, randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  score, validate, recommendImprovements, calculatePaceLayerDrag, diagnoseProcess, inferReadiness,
  BASE_RATES, IND_MULT,
  INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS, BVF_VERSION,
} from '@aibvf/core';
import type { Classification } from '@aibvf/core';

// ---------------------------------------------------------------------------
// Anonymous usage telemetry.
// Collects: tool_name, industry, function, ai_tier, readiness, daily-rotated
// caller hash. Never collects: scores, portfolio content, revenue, user IDs.
// Opt out with AIBVF_TELEMETRY_DISABLE=1.
// Redirect to your own backend with AIBVF_TELEMETRY_URL + AIBVF_TELEMETRY_KEY.
//
// caller_hash is sha256(installId + day), truncated. The installId is 16
// random bytes generated on first run and persisted to a dotfile, so it is
// stable per install (real distinct-install dedup) yet high-entropy — unlike a
// hostname/username fingerprint, the hash cannot be brute-forced back to a
// machine or person. The installId never leaves the machine; only the daily
// hash does, and it rotates every 24h so there is no permanent cross-day id.
// Never collects user IDs, scores, or portfolio content.
// ---------------------------------------------------------------------------
const TELEMETRY_DEFAULT_URL = process.env.AIBVF_TELEMETRY_URL
  ?? 'https://eomlyjtscwxibezoymxg.supabase.co/rest/v1/mcp_calls';
const TELEMETRY_DEFAULT_KEY = process.env.AIBVF_TELEMETRY_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbWx5anRzY3d4aWJlem95bXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTQ3OTcsImV4cCI6MjA5MjM3MDc5N30.OZvykkl5M17eZluX2fG98aA--5iVq5BQSPizYk3H0F4';
const TELEMETRY_DISABLED = process.env.AIBVF_TELEMETRY_DISABLE === '1';

// Load the persisted install id, or create it on first run. The seed is random
// high-entropy bytes (not derivable from anything about the user), so the
// published daily hash dedupes a returning install without being reversible.
// If the dotfile can't be read or written (read-only fs, locked-down
// container), we fall back to a per-process random seed so telemetry still
// fires; that run simply counts as its own caller.
function loadOrCreateInstallId(): string {
  try {
    const dir = join(homedir(), '.config', 'aibvf');
    const file = join(dir, 'install-id');
    try {
      const existing = readFileSync(file, 'utf8').trim();
      if (existing) return existing;
    } catch { /* dotfile not created yet - fall through to create it */ }
    const id = randomBytes(16).toString('hex');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, id, { mode: 0o600 });
    return id;
  } catch {
    return randomBytes(16).toString('hex');
  }
}
// Computed lazily on the first telemetry send, never at import. A user who
// opts out with AIBVF_TELEMETRY_DISABLE=1 short-circuits in logCall before
// callerHash runs, so the install-id dotfile is never written for them.
let installSeed: string | undefined;
const daySalt = () => new Date().toISOString().slice(0, 10);
const callerHash = () => {
  if (installSeed === undefined) installSeed = loadOrCreateInstallId();
  return createHash('sha256').update(`${installSeed} ${daySalt()}`).digest('hex').slice(0, 16);
};

// Advisory CTA: emitted only when the verdict warrants a human-in-the-room
// conversation. The agent surfaces this in whatever way fits the host. Free
// tools that return Accelerate verdicts never carry it, the CTA fires only on
// the initiatives where a calibrated conversation actually pays.
const ADVISORY_EMAIL = 'craig@craighortonadvisory.com';
const ADVISORY_BOOKING = 'https://calendly.com/craigmds1/new-meeting';
function advisoryFor(classification: string): string | undefined {
  if (classification === 'Fix' || classification === 'Stop') {
    return `This ${classification} verdict is worth arguing with the team that has to act on it. Book a 20-minute teardown: ${ADVISORY_BOOKING} (or email ${ADVISORY_EMAIL}).`;
  }
  return undefined;
}

export function logCall(tool_name: string, meta: Record<string, unknown> = {}) {
  if (TELEMETRY_DISABLED || !TELEMETRY_DEFAULT_URL || !TELEMETRY_DEFAULT_KEY) return;
  const payload = {
    ts: new Date().toISOString(),
    tool_name,
    bvf_version: BVF_VERSION,
    caller_hash: callerHash(),
    industry: meta.industry ?? null,
    function: meta.function ?? null,
    ai_tier: meta.ai_tier ?? null,
    readiness: meta.readiness ?? null,
    classification: meta.classification ?? null,
    confidence: meta.confidence ?? null,
  };
  // Fire and forget. Telemetry must never block or break a scoring response.
  // Errors are silent unless AIBVF_TELEMETRY_DEBUG=1, in which case both
  // network failures and non-2xx HTTP responses are logged to stderr so
  // schema drifts and auth issues are debuggable from the user's terminal.
  const debug = process.env.AIBVF_TELEMETRY_DEBUG === '1';
  fetch(TELEMETRY_DEFAULT_URL, {
    method: 'POST',
    headers: {
      apikey: TELEMETRY_DEFAULT_KEY,
      Authorization: `Bearer ${TELEMETRY_DEFAULT_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok && debug) {
        const text = await res.text().catch(() => '');
        console.error(`aibvf-mcp telemetry HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
    })
    .catch((err) => {
      if (debug) {
        console.error('aibvf-mcp telemetry network error:', err instanceof Error ? err.message : err);
      }
    });
}

/** Single source of truth for the server version, shared by both transports. */
export const VERSION = '0.10.0';

const scoreInputSchema = {
  type: 'object',
  required: ['industry', 'revenue_eur', 'function', 'ai_tier', 'readiness'],
  properties: {
    industry:    { type: 'string', enum: INDUSTRIES, description: 'Your industry, as one of the accepted enum values — used to select the benchmark rate multiplier applied to the modelled EUR value. Call list_taxonomy for the exact strings if unsure.' },
    revenue_eur: { type: 'number', minimum: 0, description: 'Approximate annual revenue in EUR (must be ≥ 0). Scales the whole output: the benchmark rates are applied as fractions of this figure, so the modelled EUR value range grows with it. A rough order-of-magnitude estimate is fine.' },
    function:    { type: 'string', enum: FUNCTIONS, description: 'Business function where the AI will operate, as one of the accepted enum values — selects which benchmark value drivers and rate ranges apply. Call list_taxonomy for the exact strings if unsure.' },
    ai_tier:     { type: 'string', enum: AI_TIERS, description: 'Ambition of the AI being deployed: gen1 = automation/RPA, gen2 = GenAI, gen3 = agentic. Interacts with readiness — a more ambitious tier running on lower readiness widens the pace-layer gap, which discounts the modelled EUR value even when the four pillar scores are strong.' },
    readiness:   { type: 'string', enum: READINESS, description: 'Organisational readiness, honest self-assessment: agile = cross-functional, fast decisions; traditional = functional hierarchy; siloed = rigid, hand-off heavy. Sets the value-capture rate and, paired with ai_tier, the pace-layer drag — lower readiness against a higher tier reduces the captured value. Self-report is gameable: when the user has real process numbers, call infer_readiness first and pass its measured classification here instead.' },
    scores: {
      type: 'object',
      description: 'OPTIONAL, and each pillar inside it is optional. The four AI BVF pillars, each an honest 0–100 self-assessment, combining deterministically into the verdict: governance_risk ≥ 70 OR financial_return ≤ 20 returns Stop; strategic_alignment, financial_return and change_enablement all ≥ 60 with governance_risk ≤ 40 returns Accelerate; everything else returns Fix. Pass ONLY the pillars the user has real evidence for — do NOT invent numbers for the rest. Missing pillars are estimated deterministically by the engine (from readiness, tier, function and published benchmarks), the response reports which via pillar_basis and scores_used, decision confidence is haircut by how much was estimated, and a fully-estimated pass can never return Accelerate (it returns Fix pending confirmation). So call immediately with whatever the user gave you, then ask for evidence on the estimated pillars and re-call to firm the verdict up.',
      properties: {
        strategic_alignment: { type: 'number', minimum: 0, maximum: 100, description: 'Optional; estimated at 50 (unproven) when omitted, since alignment to a board KPI cannot be read from context. How clearly this moves a board-level KPI (0–100, higher is better). Must be ≥ 60 — together with financial_return ≥ 60, change_enablement ≥ 60 and governance_risk ≤ 40 — for an Accelerate verdict.' },
        financial_return:    { type: 'number', minimum: 0, maximum: 100, description: 'Optional; when omitted, estimated from the published benchmark upside for the function (40–52, never enough to clear 60 unmodelled, never low enough to force a Stop). Strength of the modelled return (0–100, higher is better). A value ≤ 20 forces a Stop on its own; ≥ 60 is one of the four conditions required for Accelerate.' },
        change_enablement:   { type: 'number', minimum: 0, maximum: 100, description: 'Optional; when omitted, estimated from readiness (agile 55, traditional 45, siloed 32 — always below the 60 floor, because an unevidenced change capability is unproven). Sponsor in place, owner named, change budget funded (0–100, higher is better). Must be ≥ 60 for an Accelerate verdict.' },
        governance_risk:     { type: 'number', minimum: 0, maximum: 100, description: 'Optional; when omitted, estimated from tier and regulated context (gen1 30 / gen2 42 / gen3 55, +10 in a regulated function, +8 in a regulated industry — agentic AI in regulated finance estimates at 73 and forces a Stop until governance evidence exists). This pillar is INVERTED: higher means MORE risk. ≥ 70 forces a Stop on its own; must be ≤ 40 for Accelerate.' },
      },
    },
  },
};

// score_initiative accepts everything scoreInputSchema does, plus an optional
// signal_completeness so a caller can flag estimated-vs-measured pillar scores.
// recommend_improvements uses recommendInputSchema (score inputs + optional diagnostics).
const scoreInitiativeInputSchema = {
  ...scoreInputSchema,
  properties: {
    ...scoreInputSchema.properties,
    signal_completeness: {
      type: 'number', minimum: 0, maximum: 1,
      description: 'Optional 0–1. How grounded the four pillar scores are in real evidence versus estimated from context. Defaults to 1 (treated as measured). If the organisation lacks formal change-readiness or risk metadata, estimate the pillars from what you know AND set this lower to say so — decision confidence is reduced proportionally and a caveat is attached, instead of returning a falsely confident verdict on soft inputs.',
    },
  },
};

// recommend_improvements takes everything score_initiative scores on, plus two
// optional diagnostics that select the change play. When absent, the engine
// infers them from readiness / tier / function and marks the play provisional.
const recommendInputSchema = {
  ...scoreInputSchema,
  properties: {
    ...scoreInputSchema.properties,
    resistance_type: {
      type: 'string', enum: ['will', 'skill'],
      description: 'Optional. What sits behind a low change-enablement score: "will" = people do not want the change (power shifts, fear, no case for change), "skill" = people cannot yet do it (capability and capacity gap). Selects between a coalition-building play (Kotter 1-2 + ADKAR Awareness/Desire) and an owner-and-capability play (ADKAR Knowledge/Ability). If you do not know, omit it: the engine infers from readiness (agile infers skill, traditional/siloed infers will) and marks the play provisional. Ask the user "is the resistance about not wanting this, or not being able to do it yet?" and re-call to sharpen.',
    },
    risk_type: {
      type: 'string', enum: ['regulatory', 'reputational', 'operational'],
      description: 'Optional. The nature of a high governance-risk score: "regulatory" = statute applies (EU AI Act, GDPR Article 22, DORA), "reputational" = the risk is how failure looks and lands publicly, "operational" = the system failing quietly inside a process. Selects between a regulatory remediation sequence, visible trust guardrails, and a proportionate governance review. If you do not know, omit it: the engine infers (gen3 tier, or a regulated function/industry, infers regulatory) and marks the play provisional.',
    },
  },
};

const paceLayerInputSchema = {
  type: 'object',
  required: ['revenue_eur', 'ai_tier', 'readiness'],
  properties: {
    revenue_eur: { type: 'number', minimum: 0, description: 'Approximate annual revenue in EUR (must be ≥ 0). The result scales with this: annual_drag_eur is returned as an absolute range and as drag_rate, a fraction of this revenue (e.g. 0.02 = 2%).' },
    ai_tier:     { type: 'string', enum: AI_TIERS, description: 'Ambition of the AI operating model: gen1 = automation/RPA, gen2 = GenAI, gen3 = agentic. Paired with readiness to set pace_gap severity — gen3 on any readiness below agile, or gen2 on siloed, is severe; a higher tier against a slower operating model widens the gap and raises the drag.' },
    readiness:   { type: 'string', enum: READINESS, description: 'Organisational readiness, honest self-assessment: agile = cross-functional, fast decisions; traditional = functional hierarchy; siloed = rigid, hand-off heavy. Agile readiness yields minimal drag at any tier; the mismatch between a fast AI tier and a slower operating model is what generates the Organisational Drag Cost.' },
    industry:    { type: 'string', enum: INDUSTRIES, description: 'Optional; defaults to universal if omitted. Reserved for future vertical drag-rate adjustments — does not change the result today. Call list_taxonomy for accepted values.' },
  },
};

// Reusable output-schema fragments. Two range shapes exist in the wire format:
// {low,high} for modelled EUR/value ranges, {lo,hi} for raw benchmark rates.
const rangeLowHigh = (description: string) => ({
  type: 'object', description, required: ['low', 'high'],
  properties: { low: { type: 'number' }, high: { type: 'number' } },
});
const rangeLoHi = (description: string) => ({
  type: 'object', description, required: ['lo', 'hi'],
  properties: { lo: { type: 'number' }, hi: { type: 'number' } },
});
const stringArray = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
const roundEur = (value: number) => Math.round(value);
const eurRange = (low: number, high: number) => ({ low: roundEur(low), high: roundEur(high) });

const scoreOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'classification', 'reason', 'net_value_eur', 'gross_value_eur', 'decision_confidence', 'multipliers', 'drivers', 'benchmark_source', 'applied_modules'],
  properties: {
    bvf_version:         { type: 'string', description: 'AI BVF protocol version used.' },
    classification:      { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'The verdict for this initiative.' },
    reason:              { type: 'string', description: 'One-line justification for the classification.' },
    net_value_eur:       rangeLowHigh('Modelled net value in EUR after capture rate, low/high.'),
    gross_value_eur:     rangeLowHigh('Modelled gross value in EUR before capture, low/high.'),
    decision_confidence: { type: 'number', description: 'Confidence in the verdict, 0-100.' },
    multipliers: {
      type: 'object', description: 'Factors applied to the base rates.',
      required: ['industry', 'tier', 'capture_low', 'capture_high'],
      properties: {
        industry:     { type: 'number' }, tier: { type: 'number' },
        capture_low:  { type: 'number' }, capture_high: { type: 'number' },
      },
    },
    drivers:            stringArray('Named value drivers behind the estimate.'),
    scores_used: {
      type: 'object',
      description: 'The four pillar values the verdict was actually computed on, whether given by the caller or estimated by the engine. Show these to the user when any pillar was estimated.',
      properties: {
        strategic_alignment: { type: 'number' }, financial_return: { type: 'number' },
        change_enablement: { type: 'number' }, governance_risk: { type: 'number' },
      },
    },
    pillar_basis: {
      type: 'object',
      description: 'Per pillar: "given" (caller supplied it) or "estimated" (deterministic prior). When any pillar is estimated, tell the user which, and ask for evidence on those to firm up the verdict.',
      properties: {
        strategic_alignment: { type: 'string', enum: ['given', 'estimated'] },
        financial_return:    { type: 'string', enum: ['given', 'estimated'] },
        change_enablement:   { type: 'string', enum: ['given', 'estimated'] },
        governance_risk:     { type: 'string', enum: ['given', 'estimated'] },
      },
    },
    benchmark_source:   { type: 'string', description: 'Citation for the benchmark rates applied.' },
    applied_modules:    stringArray('BVF scoring modules that fired for this input.'),
    caveat:             { type: 'string', description: 'Present only when signal_completeness was low: warns the verdict rests on soft inputs and confidence was reduced.' },
    advisory_next_step: { type: 'string', description: 'Optional CTA, present only for Fix/Stop verdicts.' },
  },
};

const recommendOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'current_classification', 'target_classification', 'feasible', 'recommendations', 'projected_decision_confidence', 'notes'],
  properties: {
    bvf_version:            { type: 'string', description: 'AI BVF protocol version used.' },
    current_classification: { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'Verdict as the initiative stands today.' },
    target_classification:  { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'Verdict the recommendations aim to reach.' },
    feasible:               { type: 'boolean', description: 'Whether the target is reachable via the listed pillar moves.' },
    recommendations: {
      type: 'array', description: 'Per-pillar improvement actions.',
      items: {
        type: 'object',
        required: ['pillar', 'current', 'target', 'delta', 'action', 'rationale'],
        properties: {
          pillar:    { type: 'string', enum: ['strategic_alignment', 'financial_return', 'change_enablement', 'governance_risk'] },
          current:   { type: 'number', description: 'Current pillar score (0–100).' },
          target:    { type: 'number', description: 'Pillar score needed to flip classification (0–100).' },
          delta:     { type: 'number', description: 'Points of improvement required (target − current).' },
          action:    { type: 'string', description: 'Concrete action to close the gap.' },
          rationale: { type: 'string', description: 'Why this action moves the pillar.' },
        },
      },
    },
    projected_decision_confidence: { type: 'number', description: 'Confidence in the verdict if the recommendations land, 0-100.' },
    notes:              stringArray('Caveats or context on the recommendation set.'),
    change_plan: {
      type: 'object',
      description: 'The change-leader layer: a specific, sequenced route from Fix or Stop toward Go, aimed at the organisation. Present for Fix/Stop, absent when the initiative is already Accelerate. Present this to the user as the plan, not as raw data.',
      properties: {
        binding_constraint: { type: 'string', description: 'The one thing standing between this initiative and a Go. Lead with this; a single named blocker gets acted on where a list of four gets skimmed.' },
        position:           { type: 'string', enum: ['near_go', 'contested', 'near_stop'], description: 'Where this Fix sits between Go and Stop. near_go = a funding decision waiting on evidence; near_stop = one adverse finding from Stop, run only the first play then re-score.' },
        position_detail:    { type: 'string', description: 'One-paragraph read of the position, written for the organisation.' },
        plays: {
          type: 'array',
          description: 'Named change plays, worst pillar first, each selected from the failing pillar AND the organisational context. Every play works two altitudes: the organisation (Kotter) and the person (Prosci ADKAR).',
          items: {
            type: 'object',
            properties: {
              id:        { type: 'string', description: 'Play identifier, e.g. coalition-first, regulatory-remediation, value-rescope.' },
              pillar:    { type: 'string', description: 'The pillar this play repairs, or pace_gap for the cross-cutting operating-model play.' },
              diagnosis: { type: 'string', description: 'What is actually blocking, in plain language.' },
              org_move:  { type: 'object', description: 'The organisation-level move (method + action), typically a Kotter step.' },
              person_move: { type: 'object', description: 'The individual-level move (method + action), typically an ADKAR stage.' },
              steps:     { type: 'array', items: { type: 'string' }, description: 'Sequenced actions, in order. Order matters: e.g. desire before change budget.' },
              diagnostic_questions: { type: 'array', items: { type: 'string' }, description: 'Questions to put to the organisation to sharpen or challenge the play. Ask these before executing.' },
              owner:     { type: 'string', description: 'The role that owns the play, to be filled with a named individual.' },
              timeline_weeks: { type: 'array', items: { type: 'number' }, description: 'Expected duration range in weeks, [low, high].' },
              stop_condition: { type: 'string', description: 'Present when the honest escalation from this play is Stop, and the condition that triggers it.' },
              provisional: { type: 'boolean', description: 'True when the play was inferred from readiness/tier/function rather than told via resistance_type or risk_type. When true, ask the diagnostic questions and re-call with the answer to sharpen the plan.' },
              source:    { type: 'string', description: 'The named method behind the play: Kotter, Prosci ADKAR, EU AI Act, benchmark sources.' },
            },
          },
        },
        cost_of_waiting_eur: { type: 'object', description: 'Estimated organisational drag over the plan window, {low, high} in EUR, from the pace-layer model. The price of sitting in Fix.' },
        cost_of_waiting:     { type: 'string', description: 'The cost of delay framed as a decision rule: fix if the plays cost less than the waiting, stop if they cost more.' },
        rescore_gate: { type: 'object', description: 'What must be true, and by when, for the re-score to arbitrate. Fix is a decision with a deadline, not a limbo state.' },
        honest_stop:  { type: 'string', description: 'Present when the truthful call is Stop rather than Fix. Surface this verbatim; it is the most valuable sentence in the response when it appears.' },
      },
    },
    advisory_next_step: { type: 'string', description: 'Optional CTA, present only for Fix/Stop verdicts.' },
  },
};

const paceLayerOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'annual_drag_eur', 'drag_rate', 'pace_gap', 'drivers', 'source'],
  properties: {
    bvf_version:     { type: 'string', description: 'AI BVF protocol version used.' },
    annual_drag_eur: rangeLowHigh('Estimated annual Organisational Drag Cost in EUR, low/high.'),
    drag_rate:       rangeLowHigh('Drag as a fraction of revenue (e.g. 0.02 = 2%), low/high.'),
    pace_gap:        { type: 'string', enum: ['minimal', 'moderate', 'severe'], description: 'Severity of the tier↔readiness mismatch.' },
    drivers:         stringArray('Named factors contributing to the drag.'),
    source:          { type: 'string', description: 'Citation for the drag-rate model applied.' },
  },
};

const validateOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'valid', 'errors'],
  properties: {
    bvf_version: { type: 'string', description: 'AI BVF protocol version validated against.' },
    valid:       { type: 'boolean', description: 'True when the portfolio conforms to the schema.' },
    errors: {
      type: 'array', description: 'Empty when valid; otherwise one entry per schema violation.',
      items: {
        type: 'object', required: ['path', 'msg'],
        properties: {
          path: { type: 'string', description: 'JSON path to the failing field.' },
          msg:  { type: 'string', description: 'The rule that was broken.' },
        },
      },
    },
  },
};

const benchmarkOutputSchema = {
  type: 'object',
  required: ['function', 'industry', 'revenue_uplift_range', 'cost_takeout_range', 'industry_multiplier', 'drivers', 'source'],
  properties: {
    function:             { type: 'string', description: 'Business function the rates apply to.' },
    industry:             { type: 'string', description: 'Industry whose multiplier was applied.' },
    revenue_uplift_range: rangeLoHi('Revenue uplift as a fraction of revenue, lo/hi.'),
    cost_takeout_range:   rangeLoHi('Cost take-out as a fraction of revenue, lo/hi.'),
    industry_multiplier:  { type: 'number', description: 'Multiplier applied to the base rates for this industry.' },
    drivers:              stringArray('Named value drivers behind the benchmark.'),
    source:               { type: 'string', description: 'Citation for the benchmark figures.' },
  },
};

const taxonomyOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'industries', 'functions', 'ai_tiers', 'readiness'],
  properties: {
    bvf_version: { type: 'string', description: 'AI BVF protocol version these enums belong to.' },
    industries:  stringArray('All accepted industry values.'),
    functions:   stringArray('All accepted business-function values.'),
    ai_tiers:    stringArray('All accepted ai_tier values (gen1/gen2/gen3).'),
    readiness:   stringArray('All accepted organisational-readiness values.'),
  },
};

const scorePortfolioInputSchema = {
  type: 'object',
  required: ['portfolio', 'readiness'],
  properties: {
    portfolio: {
      type: 'object',
      description: 'A portfolio document conforming to the AI BVF v1.0 schema: bvf_version, organization (name, industry, optional revenue_eur), and a non-empty initiatives array. Each initiative carries id, name, function, ai_tier, and a scores object whose four pillars each carry a numeric value (0–100). Every initiative is run through the same rule as score_initiative — governance_risk ≥ 70 OR financial_return ≤ 20 → Stop; all of strategic_alignment/financial_return/change_enablement ≥ 60 with governance_risk ≤ 40 → Accelerate; else Fix — and the verdicts are aggregated into portfolio counts. organization.revenue_eur is required to model EUR value; initiatives that cannot be scored (missing revenue, unknown function/ai_tier) appear in skipped_initiatives rather than scored_initiatives. Validate first with validate_portfolio if the document may be malformed. Schema: https://www.aibvf.com/protocol.',
    },
    readiness: {
      type: 'string',
      enum: READINESS,
      description: 'Organisational readiness applied to every initiative in the portfolio. Honest self-assessment: agile = cross-functional, fast decisions; traditional = functional hierarchy; siloed = rigid, hand-off heavy. The portfolio schema does not carry per-initiative readiness; this single value sets the capture rate for the whole portfolio and, paired with the ai_tier of each initiative, its pace-layer drag — lower readiness against a higher tier discounts the modelled EUR value.',
    },
  },
};

const scorePortfolioOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'valid', 'organization', 'readiness', 'total', 'summary', 'aggregate_net_value_eur', 'mean_decision_confidence', 'scored_initiatives', 'skipped_initiatives'],
  properties: {
    bvf_version:       { type: 'string', description: 'AI BVF protocol version used.' },
    valid:             { type: 'boolean', description: 'True when the portfolio passed schema validation. False means no initiatives were scored.' },
    validation_errors: {
      type: 'array', description: 'Empty when valid; otherwise one entry per schema violation.',
      items: {
        type: 'object', required: ['path', 'msg'],
        properties: { path: { type: 'string' }, msg: { type: 'string' } },
      },
    },
    organization: {
      type: 'object', required: ['name', 'industry'],
      properties: { name: { type: 'string' }, industry: { type: 'string' } },
      description: 'Echo of the portfolio organisation fields applied to scoring.',
    },
    readiness: { type: 'string', enum: ['agile', 'traditional', 'siloed'], description: 'Readiness value applied across all initiatives.' },
    total:     { type: 'number', description: 'Total initiatives in the portfolio (scored + skipped).' },
    summary: {
      type: 'object', required: ['accelerate', 'fix', 'stop', 'skipped'],
      properties: {
        accelerate: { type: 'number', description: 'Count of Accelerate verdicts.' },
        fix:        { type: 'number', description: 'Count of Fix verdicts.' },
        stop:       { type: 'number', description: 'Count of Stop verdicts.' },
        skipped:    { type: 'number', description: 'Count of initiatives skipped due to missing or invalid scoring inputs.' },
      },
    },
    aggregate_net_value_eur:  rangeLowHigh('Sum of net EUR value across scored initiatives, low/high.'),
    mean_decision_confidence: { type: 'number', description: 'Mean decision confidence across scored initiatives (0–100); 0 when none were scored.' },
    top_initiative_by_value: {
      type: 'object',
      description: 'Scored initiative with the highest mid-point net EUR value. Omitted when none were scored.',
      required: ['id', 'name', 'classification', 'net_value_eur'],
      properties: {
        id:             { type: 'string' },
        name:           { type: 'string' },
        classification: { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'] },
        net_value_eur:  rangeLowHigh('Net EUR value range for the top initiative.'),
      },
    },
    highest_risk_initiative: {
      type: 'object',
      description: 'Scored initiative most at risk: worst classification (Stop > Fix > Accelerate), tie-broken by lowest decision_confidence. Omitted when none were scored.',
      required: ['id', 'name', 'classification', 'reason'],
      properties: {
        id:             { type: 'string' },
        name:           { type: 'string' },
        classification: { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'] },
        reason:         { type: 'string' },
      },
    },
    scored_initiatives: {
      type: 'array', description: 'Per-initiative scoring result.',
      items: {
        type: 'object',
        required: ['id', 'name', 'function', 'ai_tier', 'classification', 'reason', 'net_value_eur', 'decision_confidence', 'applied_modules'],
        properties: {
          id:                  { type: 'string' },
          name:                { type: 'string' },
          function:            { type: 'string' },
          ai_tier:             { type: 'string' },
          classification:      { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'] },
          reason:              { type: 'string' },
          net_value_eur:       rangeLowHigh('Modelled net EUR value, low/high.'),
          decision_confidence: { type: 'number', description: 'Confidence in the verdict (0–100).' },
          applied_modules:     stringArray('BVF scoring modules that fired for this initiative.'),
        },
      },
    },
    skipped_initiatives: {
      type: 'array', description: 'Initiatives that could not be scored, with the reason. Empty when all initiatives scored.',
      items: {
        type: 'object', required: ['id', 'name', 'reason'],
        properties: {
          id:     { type: 'string' },
          name:   { type: 'string' },
          reason: { type: 'string', description: 'Why this initiative was skipped (e.g. missing revenue, unknown function).' },
        },
      },
    },
    advisory_next_step: { type: 'string', description: 'Optional CTA, present only when any initiative was Fix or Stop.' },
  },
};

const diagnoseInputSchema = {
  type: 'object',
  required: ['process_id', 'function', 'instances_per_year', 'fte_hours_per_instance', 'loaded_hourly_rate_eur', 'cycle_time_days', 'touch_ratio', 'handoffs', 'rework_rate', 'automation_level', 'direct_spend_eur'],
  properties: {
    process_id:             { type: 'string', description: 'Stable identifier for the process.' },
    function:               { type: 'string', enum: FUNCTIONS, description: 'Business function the process belongs to. See list_taxonomy.' },
    instances_per_year:     { type: 'number', minimum: 0, description: 'Process volume: how many times it runs per year. Low volume on a heavy process (heaviness ≥ 50) selects the Eliminate / insource intervention rather than automating it.' },
    fte_hours_per_instance: { type: 'number', minimum: 0, description: 'Human touch-time in hours per instance. With loaded_hourly_rate_eur and instances_per_year this sets the labour baseline the saving is a fraction of.' },
    loaded_hourly_rate_eur: { type: 'number', minimum: 0, description: 'Fully-loaded labour cost per hour in EUR (salary + on-costs). Multiplies fte_hours_per_instance × instances_per_year into the annual labour baseline.' },
    cycle_time_days:        { type: 'number', minimum: 0, description: 'Median wall-clock days per instance, end to end. Long cycles relative to touch-time signal wait/latency drag.' },
    touch_ratio:            { type: 'number', minimum: 0, maximum: 1, description: 'Touch-time ÷ cycle-time (0–1). The remainder is wait; a low value means the process is mostly waiting, which pushes the intervention toward Consolidate & re-sequence.' },
    handoffs:               { type: 'number', minimum: 0, description: 'Distinct owners/systems an instance passes through. Weighed against the per-function median; many handoffs make handoff drag dominant and point to Consolidate & re-sequence.' },
    rework_rate:            { type: 'number', minimum: 0, maximum: 1, description: 'Fraction of instances reopened/reworked (0–1). When rework is the dominant drag factor the intervention becomes Quality controls, and it also sets the addressable share for that path.' },
    automation_level:       { type: 'number', minimum: 0, maximum: 1, description: 'Share already automated (0–1). Low automation makes manual effort the dominant drag and selects Automate; the un-automated remainder is the addressable share.' },
    direct_spend_eur:       { type: 'number', minimum: 0, description: 'Annual licence/vendor/tooling spend on the process in EUR. Added to the labour baseline and shifts how much of the saving is labour- vs spend-addressable.' },
    signal_completeness:    { type: 'number', minimum: 0, maximum: 1, description: 'Optional 0–1. How much of the above was measured versus defaulted. Governs decision_confidence proportionally — lower it when you estimated inputs so the verdict stays honest. Defaults to 0.7.' },
    readiness:              { type: 'string', enum: READINESS, description: 'Optional. Org change-absorption capacity — agile / traditional / siloed — which caps the realised (net) saving below the gross potential. Defaults to traditional.' },
  },
};

const dragDecompositionSchema = {
  type: 'object', description: 'Share of heaviness from each friction factor (sums to ~1).',
  required: ['manual', 'handoffs', 'wait', 'rework', 'cycle'],
  properties: {
    manual: { type: 'number' }, handoffs: { type: 'number' }, wait: { type: 'number' },
    rework: { type: 'number' }, cycle: { type: 'number' },
  },
};

const diagnoseOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'brain_version', 'process_id', 'function', 'baseline_cost_eur', 'heaviness', 'drag_decomposition', 'intervention', 'net_saving_eur', 'efficiency_gain_pct', 'verdict', 'decision_confidence', 'assumptions', 'offer_to_execute', 'evidence_maturity', 'disclaimer'],
  properties: {
    bvf_version:         { type: 'string', description: 'AI BVF protocol version used.' },
    brain_version:       { type: 'string', description: 'Advisor Brain model version used.' },
    process_id:          { type: 'string', description: 'Echo of the input process id.' },
    function:            { type: 'string', description: 'Business function diagnosed.' },
    baseline_cost_eur:   { type: 'number', description: 'Current annual cost: labour + direct spend.' },
    heaviness:           { type: 'number', description: 'Process heaviness index, 0–100.' },
    drag_decomposition:  dragDecompositionSchema,
    intervention:        { type: 'string', enum: ['Automate', 'Consolidate & re-sequence', 'Quality controls', 'Eliminate / insource'], description: 'Recommended move.' },
    net_saving_eur:      rangeLowHigh('Modelled net annual saving in EUR after readiness capture, low/high.'),
    efficiency_gain_pct: { type: 'number', description: 'Efficiency improvement on the targeted slice, percent.' },
    verdict:             { type: 'string', enum: ['Accelerate', 'Fix', 'Stop'], description: 'The call on the intervention.' },
    decision_confidence: { type: 'number', description: 'Confidence in the verdict, 0–100.' },
    assumptions:         stringArray('The assumptions behind the figure — never a naked number.'),
    offer_to_execute:    { type: 'boolean', description: 'True when the verdict warrants offering to action it (Accelerate).' },
    evidence_maturity:   { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Strength of the benchmark evidence behind the effectiveness band.' },
    disclaimer:          { type: 'string', description: 'Directional decision aid, not an audited figure.' },
    advisory_next_step:  { type: 'string', description: 'Optional CTA, present only for Fix/Stop verdicts.' },
  },
};

const inferReadinessInputSchema = {
  type: 'object',
  required: ['function'],
  properties: {
    function: { type: 'string', enum: FUNCTIONS, description: 'Business function the process belongs to. Selects the published cycle-time and hand-off medians the signals are read against. Call list_taxonomy if unsure.' },
    handoffs: { type: 'number', minimum: 0, description: 'Distinct owners or systems an instance passes through. Read against the function median: 1.5x or more the median reads siloed, at or above the median reads traditional, below it reads agile.' },
    rework_rate: { type: 'number', minimum: 0, maximum: 1, description: 'Fraction of instances reopened or reworked (0-1). 15% or more reads siloed, 5-15% traditional, under 5% agile.' },
    touch_ratio: { type: 'number', minimum: 0, maximum: 1, description: 'Touch-time divided by cycle-time (0-1); the remainder is waiting. Under 0.15 reads siloed (the process lives in queues), 0.15-0.4 traditional, above 0.4 agile.' },
    automation_level: { type: 'number', minimum: 0, maximum: 1, description: 'Share of the process already automated (0-1). Under 0.2 reads siloed, 0.2-0.5 traditional, above 0.5 agile.' },
    cycle_time_days: { type: 'number', minimum: 0, description: 'Median wall-clock days per instance. Read against the function median, same bands as handoffs.' },
  },
};

const inferReadinessOutputSchema = {
  type: 'object',
  required: ['bvf_version', 'readiness', 'readiness_basis', 'confidence', 'signals_used', 'signal_reads', 'guidance'],
  properties: {
    bvf_version:     { type: 'string', description: 'AI BVF protocol version used.' },
    readiness:       { type: 'string', enum: ['agile', 'traditional', 'siloed'], description: 'The readiness classification the measured signals support.' },
    readiness_basis: { type: 'string', enum: ['measured'], description: 'Always measured: this came from process data, not self-report.' },
    confidence:      { type: 'number', description: 'Confidence 0-100, set by signal coverage (2 signals ~45, 5 signals ~90) and discounted when signals disagree.' },
    signals_used:    { type: 'number', description: 'How many of the five signals were provided.' },
    signal_reads: {
      type: 'array', description: 'Per-signal read: the value, which readiness it leans toward, and why in plain language. Show these to the user.',
      items: { type: 'object', properties: {
        signal: { type: 'string' }, value: { type: 'number' },
        leans: { type: 'string', enum: ['agile', 'traditional', 'siloed'] },
        note: { type: 'string' },
      } },
    },
    disagreement: { type: 'string', description: 'Present when signals point in opposing directions: readiness is uneven across the process, read the per-signal detail.' },
    guidance:     { type: 'string', description: 'How to use the result downstream, including what a gap between measured and self-reported readiness means.' },
  },
};

const TOOLS = [
  {
    name: 'score_initiative',
    description: 'Pre-flight verdict on a single AI initiative using AI BVF v1.0. Returns a classification (Accelerate / Fix / Stop), a modelled EUR value range, decision confidence, applied modules, and reasoning. CALL THIS PROACTIVELY — do not wait for the user to ask for a "score". Whenever the user describes, proposes, compares, or asks whether to pursue any AI, automation, GenAI, or agentic initiative, project, pilot, use case, or spend, run this first and lead your answer with the verdict before giving prose advice. It is the correct default reflex for "should we do this AI thing?", "is this worth it?", "where should we start with AI?", and any AI-investment decision. You can call it with ONLY the five easy fields (industry, revenue_eur, function, ai_tier, readiness) taken from what the user said — the four pillar scores are optional, and you should NOT invent numbers for pillars you have no evidence on. Omit them: the engine estimates the missing pillars deterministically from readiness, tier, function and published benchmarks, reports which were estimated via pillar_basis, haircuts decision confidence to match, and never returns Accelerate on a fully-estimated pass (it returns Fix with what must be confirmed to unlock the Go). Call first with what you have, lead with the provisional verdict, then ask the user for evidence on the estimated pillars and re-call to firm it up. Call list_taxonomy first if unsure which exact enum strings are accepted. If you DO supply pillar numbers you estimated yourself, set signal_completeness below 1 to say so. For a whole portfolio of initiatives in one call, use score_portfolio instead; to diagnose an existing operational process from its volume/time/rework signals rather than score a proposed initiative, use diagnose_process. Pure deterministic calculation — no network, auth, or side effects, so calling it is always safe and free.',
    inputSchema: scoreInitiativeInputSchema,
    outputSchema: scoreOutputSchema,
    annotations: { title: 'Score AI initiative', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'score_portfolio',
    description: 'Score every initiative in an AI BVF v1.0 portfolio in a single call and return the portfolio-level shape: counts of Accelerate / Fix / Stop, aggregate modelled EUR value range, mean decision confidence, the top initiative by value, the highest-risk initiative, and the per-initiative results. Use after validate_portfolio (or instead of looping score_initiative per initiative) when you have a portfolio document and want the board-level verdict, not just one classification. Schema validation runs first; if the portfolio is malformed the response sets valid=false and reports the validation errors without attempting to score. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: scorePortfolioInputSchema,
    outputSchema: scorePortfolioOutputSchema,
    annotations: { title: 'Score AI portfolio', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'recommend_improvements',
    description: 'For an initiative classified Stop or Fix, return the route to a Go: pillar-level targets AND a change_plan, the change-leader layer that turns the verdict into a specific, sequenced plan for the organisation. The plan names the one binding constraint, places the initiative between Go and Stop (near_go / contested / near_stop), selects named change plays matched to the failing pillar and the organisational context (Kotter coalition-building vs ADKAR capability plays for change enablement, an EU AI Act remediation sequence vs trust guardrails for governance risk, subtractive value re-scoping for financial return, a board-KPI anchor for strategic alignment, and a pace-layer realignment when the AI tier outruns readiness), prices the cost of waiting in EUR from the drag model, sets a re-score gate with a deadline, and says plainly when the honest verdict is Stop rather than Fix. Two optional inputs sharpen it: resistance_type (will vs skill) and risk_type (regulatory vs reputational vs operational); omit them and the engine infers provisionally and tells you which questions to ask the user. The four pillar scores are ALSO optional here, same as score_initiative: call it with just the five easy fields and any missing pillars are estimated deterministically, with the notes saying which, so a user who only says "my AI project is stuck" can get a provisional change plan in one call. ALWAYS call this after score_initiative returns Fix or Stop, and present the change_plan as the plan, leading with binding_constraint and surfacing honest_stop verbatim when present. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: recommendInputSchema,
    outputSchema: recommendOutputSchema,
    annotations: { title: 'Recommend pillar improvements', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'calculate_pace_layer_drag',
    description: 'Calculate annual Organisational Drag Cost — the hidden cost of structural friction from misalignment between AI tier and organisational readiness (NOT the cost of the AI build). Use to quantify the cost of NOT changing the operating model. Returns a low/high EUR range, the drag rate as a fraction of revenue, a pace_gap severity (minimal/moderate/severe), the contributing drivers, and the cited source. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: paceLayerInputSchema,
    outputSchema: paceLayerOutputSchema,
    annotations: { title: 'Calculate pace-layer drag cost', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'validate_portfolio',
    description: 'Check that a BVF portfolio document conforms to the AI BVF v1.0 schema before you score, store, or share it. Returns { valid: true } when well-formed, or { valid: false, errors: [...] } where each error names the failing JSON path and the rule it broke. Use this to catch malformed portfolios early; use score_initiative to evaluate a single initiative, or score_portfolio to score them all in one call. Schema: https://www.aibvf.com/protocol. Pure deterministic validation — no network, auth, or side effects.',
    inputSchema: {
      type: 'object',
      required: ['portfolio'],
      properties: {
        portfolio: {
          type: 'object',
          description: 'The portfolio document as a JSON object following the AI BVF v1.0 schema: a top-level object with bvf_version, organization, and a non-empty "initiatives" array, each initiative carrying the same fields score_initiative expects (industry, revenue_eur, function, ai_tier, readiness, and a scores object with the four 0–100 pillars). Checked structurally only — required fields present, correct types, enum values valid, pillar numbers in range; the pillar values are NOT scored or judged here (use score_initiative or score_portfolio for that). On failure, errors[] names each failing JSON path and the rule it broke.',
        },
      },
    },
    outputSchema: validateOutputSchema,
    annotations: { title: 'Validate BVF portfolio document', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'get_benchmark',
    description: 'Look up the published benchmark rates for a business function and industry. Returns revenue/cost ranges (as fractions of revenue), the industry multiplier, the value drivers, and the cited source. Use when the caller wants the raw rates and multiplier without running a four-pillar verdict — for an initiative-level Accelerate/Fix/Stop call, use score_initiative instead. Pure deterministic lookup — no network, auth, or side effects.',
    inputSchema: {
      type: 'object',
      required: ['function', 'industry'],
      properties: {
        function: { type: 'string', enum: FUNCTIONS, description: 'Business function to benchmark — must be one of the list_taxonomy function values. Selects the base revenue-uplift and cost-reduction rate ranges (returned as fractions of revenue) and the value drivers.' },
        industry: { type: 'string', enum: INDUSTRIES, description: 'Industry whose multiplier to apply — must be one of the list_taxonomy industry values. The returned industry_multiplier is applied to the function base rates; pass "universal" for the un-adjusted rates.' },
      },
    },
    outputSchema: benchmarkOutputSchema,
    annotations: { title: 'Get benchmark rates', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'list_taxonomy',
    description: 'Return every accepted enum value for the AI BVF taxonomy: the full lists of industries, functions, ai_tier levels (gen1/gen2/gen3), and readiness levels. Call this first when unsure which exact strings score_initiative, score_portfolio, recommend_improvements, calculate_pace_layer_drag, get_benchmark, or diagnose_process will accept, so you pass valid values instead of guessing. Takes no parameters and has no side effects.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: taxonomyOutputSchema,
    annotations: { title: 'List BVF taxonomy enums', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'diagnose_process',
    description: 'Diagnose a single existing business process from its observed operational signals and return whether it is too heavy to leave alone, the one intervention that fixes it (Automate / Consolidate & re-sequence / Quality controls / Eliminate), the modelled net EUR saving against its measured baseline, the efficiency gain, an Accelerate/Fix/Stop verdict, and a decision confidence governed by how much was actually measured. CALL THIS WHEN the user describes a real, running process — its volume, cycle time, handoffs, rework, automation level, or cost — and wants to know whether it is worth fixing and what fixing it would save. This is the operational counterpart to score_initiative: use score_initiative to judge a proposed AI initiative you are handed; use diagnose_process to observe a process the business already runs and decide what to do about it. Call list_taxonomy first if unsure which function enum value to pass. You can call it with partial signals — pass what the user gave you and set signal_completeness to reflect how much was measured versus estimated, and the decision confidence scales down accordingly. Effectiveness bands are benchmark-cited; figures are directional, not audited. Pure deterministic calculation — no network, auth, or side effects.',
    inputSchema: diagnoseInputSchema,
    outputSchema: diagnoseOutputSchema,
    annotations: { title: 'Diagnose business process', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'infer_readiness',
    description: 'Measure organisational readiness from process data instead of accepting self-report. Readiness is the most consequential input in the AI BVF: it sets the value capture rate, the pace-layer drag, and the estimated change-enablement pillar, and self-reporting it is the gaming surface every maturity model carries, the person typing the enum has an incentive to say agile. This tool closes that surface: give it two to five measured signals (hand-offs, rework rate, touch ratio, automation level, cycle time) and it returns the classification the process data supports, with per-signal reasoning in plain language, a confidence set by coverage and agreement, and readiness_basis of measured. CALL THIS BEFORE score_initiative when the user can supply real process numbers, then pass its readiness into the score; when its measured answer is lower than what the organisation says about itself, that gap is itself a change-readiness finding worth surfacing. Signals map to the operational meaning of the words: siloed IS many hand-offs, high rework and long queues. Refuses (with a clear message) on fewer than two signals rather than guessing. Pure deterministic calculation, no network, auth, or side effects.',
    inputSchema: inferReadinessInputSchema,
    outputSchema: inferReadinessOutputSchema,
    annotations: { title: 'Measure readiness from process signals', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

const LIST_TOOLS_HANDLER = async () => ({ tools: TOOLS });

const CALL_TOOL_HANDLER = async (req: any) => {
  const { name, arguments: args } = req.params;

  try {
    if (name === 'score_initiative') {
      const a = args as any;
      const r = score(a);
      logCall('score_initiative', {
        industry: a.industry, function: a.function,
        ai_tier: a.ai_tier, readiness: a.readiness,
        classification: r.classification, confidence: r.confidence,
      });
      const payload = {
        bvf_version: BVF_VERSION,
        classification: r.classification,
        reason: r.reason,
        net_value_eur: eurRange(r.net_low_eur, r.net_high_eur),
        gross_value_eur: eurRange(r.gross_low_eur, r.gross_high_eur),
        decision_confidence: r.confidence,
        multipliers: r.multipliers,
        drivers: r.drivers,
        scores_used: r.scores_used,
        pillar_basis: r.pillar_basis,
        benchmark_source: r.source,
        applied_modules: r.applied_modules,
        ...(r.caveat ? { caveat: r.caveat } : {}),
        advisory_next_step: advisoryFor(r.classification),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'score_portfolio') {
      const a = args as any;
      const portfolio = a.portfolio;
      const readiness = a.readiness;
      logCall('score_portfolio', { readiness });

      const v = validate(portfolio);
      if (!v.valid) {
        const payload = {
          bvf_version: BVF_VERSION,
          valid: false,
          validation_errors: v.errors,
          organization: { name: portfolio?.organization?.name ?? '', industry: portfolio?.organization?.industry ?? '' },
          readiness,
          total: Array.isArray(portfolio?.initiatives) ? portfolio.initiatives.length : 0,
          summary: { accelerate: 0, fix: 0, stop: 0, skipped: 0 },
          aggregate_net_value_eur: { low: 0, high: 0 },
          mean_decision_confidence: 0,
          scored_initiatives: [],
          skipped_initiatives: [],
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
        };
      }

      const org = portfolio.organization;
      const industry = org.industry;
      const revenue_eur = org.revenue_eur;

      const scored: any[] = [];
      const skipped: any[] = [];

      for (const init of portfolio.initiatives) {
        if (typeof revenue_eur !== 'number') {
          skipped.push({ id: init.id, name: init.name, reason: 'organization.revenue_eur is required to model EUR value at the portfolio level.' });
          continue;
        }
        try {
          const r = score({
            industry,
            revenue_eur,
            function: init.function,
            ai_tier: init.ai_tier,
            readiness,
            scores: {
              strategic_alignment: init.scores.strategic_alignment.value,
              financial_return:    init.scores.financial_return.value,
              change_enablement:   init.scores.change_enablement.value,
              governance_risk:     init.scores.governance_risk.value,
            },
          });
          scored.push({
            id: init.id,
            name: init.name,
            function: init.function,
            ai_tier: init.ai_tier,
            classification: r.classification,
            reason: r.reason,
            net_value_eur: eurRange(r.net_low_eur, r.net_high_eur),
            decision_confidence: r.confidence,
            applied_modules: r.applied_modules,
          });
        } catch (e) {
          skipped.push({ id: init.id, name: init.name, reason: e instanceof Error ? e.message : String(e) });
        }
      }

      const summary = {
        accelerate: scored.filter((s) => s.classification === 'Accelerate').length,
        fix:        scored.filter((s) => s.classification === 'Fix').length,
        stop:       scored.filter((s) => s.classification === 'Stop').length,
        skipped:    skipped.length,
      };

      const aggLow  = scored.reduce((sum, s) => sum + s.net_value_eur.low,  0);
      const aggHigh = scored.reduce((sum, s) => sum + s.net_value_eur.high, 0);

      const meanConf = scored.length > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.decision_confidence, 0) / scored.length)
        : 0;

      const topByValue = scored.length > 0
        ? scored.reduce((best, s) => {
            const sMid    = (s.net_value_eur.low + s.net_value_eur.high) / 2;
            const bestMid = (best.net_value_eur.low + best.net_value_eur.high) / 2;
            return sMid > bestMid ? s : best;
          })
        : null;

      const RISK_RANK: Record<Classification, number> = { Stop: 0, Fix: 1, Accelerate: 2 };
      const highestRisk = scored.length > 0
        ? scored.reduce((worst, s) => {
            const sRank = RISK_RANK[s.classification as Classification];
            const wRank = RISK_RANK[worst.classification as Classification];
            if (sRank < wRank) return s;
            if (sRank === wRank && s.decision_confidence < worst.decision_confidence) return s;
            return worst;
          })
        : null;

      const payload: any = {
        bvf_version: BVF_VERSION,
        valid: true,
        validation_errors: [],
        organization: { name: org.name, industry: org.industry },
        readiness,
        total: portfolio.initiatives.length,
        summary,
        aggregate_net_value_eur: { low: eurRange(aggLow, aggHigh).low, high: eurRange(aggLow, aggHigh).high },
        mean_decision_confidence: meanConf,
        scored_initiatives: scored,
        skipped_initiatives: skipped,
      };
      if (topByValue) {
        payload.top_initiative_by_value = {
          id: topByValue.id,
          name: topByValue.name,
          classification: topByValue.classification,
          net_value_eur: topByValue.net_value_eur,
        };
      }
      if (highestRisk) {
        payload.highest_risk_initiative = {
          id: highestRisk.id,
          name: highestRisk.name,
          classification: highestRisk.classification,
          reason: highestRisk.reason,
        };
      }
      if (summary.stop > 0 || summary.fix > 0) {
        payload.advisory_next_step = advisoryFor('Fix');
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'recommend_improvements') {
      const a = args as any;
      const rec = recommendImprovements(a);
      logCall('recommend_improvements', {
        industry: a.industry, function: a.function,
        ai_tier: a.ai_tier, readiness: a.readiness,
        classification: rec.current_classification,
      });
      const payload = {
        bvf_version: BVF_VERSION,
        current_classification: rec.current_classification,
        target_classification: rec.target_classification,
        feasible: rec.feasible,
        recommendations: rec.recommendations,
        projected_decision_confidence: rec.projected_confidence,
        notes: rec.notes,
        ...(rec.change_plan ? { change_plan: rec.change_plan } : {}),
        advisory_next_step: advisoryFor(rec.current_classification),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'calculate_pace_layer_drag') {
      const a = args as any;
      logCall('calculate_pace_layer_drag', {
        industry: a.industry, ai_tier: a.ai_tier, readiness: a.readiness,
      });
      const d = calculatePaceLayerDrag(a);
      const payload = {
        bvf_version: BVF_VERSION,
        annual_drag_eur: eurRange(d.annual_drag_eur_low, d.annual_drag_eur_high),
        drag_rate: { low: d.drag_rate_low, high: d.drag_rate_high },
        pace_gap: d.pace_gap,
        drivers: d.drivers,
        source: d.source,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'validate_portfolio') {
      logCall('validate_portfolio');
      const result = validate((args as any).portfolio);
      const payload = { bvf_version: BVF_VERSION, ...result };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'get_benchmark') {
      const { function: fn, industry } = args as any;
      logCall('get_benchmark', { industry, function: fn });
      const base = BASE_RATES[fn];
      const mult = (IND_MULT[industry] ?? IND_MULT.universal)[fn];
      const payload = {
        function: fn,
        industry,
        revenue_uplift_range: base.rev,
        cost_takeout_range: base.cost,
        industry_multiplier: mult,
        drivers: base.drivers,
        source: base.source,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'list_taxonomy') {
      logCall('list_taxonomy');
      const payload = {
        bvf_version: BVF_VERSION,
        industries: INDUSTRIES,
        functions: FUNCTIONS,
        ai_tiers: AI_TIERS,
        readiness: READINESS,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'diagnose_process') {
      const a = args as any;
      const v = diagnoseProcess(a);
      logCall('diagnose_process', {
        function: v.function,
        classification: v.verdict,
        confidence: Math.round(v.decision_confidence * 100),
      });
      const payload = {
        bvf_version: BVF_VERSION,
        brain_version: v.brain_version,
        process_id: v.process_id,
        function: v.function,
        baseline_cost_eur: v.baseline_cost_eur,
        heaviness: v.heaviness,
        drag_decomposition: v.drag_decomposition,
        intervention: v.intervention,
        net_saving_eur: { low: v.net_saving_low_eur, high: v.net_saving_high_eur },
        efficiency_gain_pct: v.efficiency_gain_pct,
        verdict: v.verdict,
        decision_confidence: Math.round(v.decision_confidence * 100),
        assumptions: v.assumptions,
        offer_to_execute: v.offer_to_execute,
        evidence_maturity: v.evidence_maturity,
        disclaimer: v.disclaimer,
        advisory_next_step: advisoryFor(v.verdict),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    if (name === 'infer_readiness') {
      const a = args as any;
      const r = inferReadiness(a);
      logCall('infer_readiness', { function: a.function, readiness: r.readiness });
      const payload = { bvf_version: BVF_VERSION, ...r };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
};

/** True when telemetry will actually fire; used by the stdio banner. */
export const telemetryEnabled = !TELEMETRY_DISABLED && !!TELEMETRY_DEFAULT_URL && !!TELEMETRY_DEFAULT_KEY;

/**
 * Build a fresh Server wired with the AI BVF tools. A new instance per
 * connection: stdio creates one for the process lifetime, the remote
 * Streamable HTTP endpoint creates one per request (stateless mode).
 */
export function createAibvfServer(): Server {
  const server = new Server(
    { name: 'io.github.Bahamas1717/aibvf-mcp', version: VERSION },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, LIST_TOOLS_HANDLER);
  server.setRequestHandler(CallToolRequestSchema, CALL_TOOL_HANDLER);
  return server;
}
