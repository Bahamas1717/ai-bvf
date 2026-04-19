import type { ScoreInput, ScoreResult, Classification } from './types.js';

interface BaseRate {
  rev: { lo: number; hi: number };
  cost: { lo: number; hi: number };
  drivers: string[];
  source: string;
}

/**
 * Published benchmark ranges, by business function.
 * Rates are fractions of annual revenue (lo/hi).
 * Sources: McKinsey Global Institute, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow.
 */
export const BASE_RATES: Record<string, BaseRate> = {
  finance: { rev: { lo: 0.010, hi: 0.030 }, cost: { lo: 0.030, hi: 0.060 }, drivers: ['Automated financial close (–40% cycle time)','AI FP&A & forecasting','Anomaly detection reducing write-offs'], source: 'McKinsey Global Institute — Finance AI benchmark' },
  hr:      { rev: { lo: 0.005, hi: 0.015 }, cost: { lo: 0.020, hi: 0.040 }, drivers: ['Attrition reduction (–15–25% replacement cost)','GenAI HR service desk (–30% AHT)','Skills-based talent deployment'], source: 'Deloitte Future of Work 2024' },
  sales:   { rev: { lo: 0.030, hi: 0.080 }, cost: { lo: 0.010, hi: 0.025 }, drivers: ['Hyper-personalisation at scale','Predictive lead scoring & pipeline accuracy','AI deal coaching'], source: 'McKinsey — AI personalisation drives up to 40% revenue uplift' },
  supply:  { rev: { lo: 0.005, hi: 0.015 }, cost: { lo: 0.040, hi: 0.090 }, drivers: ['Predictive maintenance (–10–25% unplanned downtime)','Inventory optimisation (–15% holding cost)','Quality defect AI (–20% rework)'], source: 'Gartner Supply Chain AI Benchmark 2024' },
  cx:      { rev: { lo: 0.020, hi: 0.050 }, cost: { lo: 0.020, hi: 0.050 }, drivers: ['GenAI deflection (up to 87% self-service)','AHT reduction –20–35%','Retention uplift from personalisation'], source: 'Forrester CX AI Impact 2024' },
  risk:    { rev: { lo: 0.005, hi: 0.010 }, cost: { lo: 0.020, hi: 0.040 }, drivers: ['AML false-positive reduction –30–50%','Automated CSRD / EU AI Act reporting','Continuous compliance monitoring'], source: 'Accenture Regulatory AI Report 2024' },
  it:      { rev: { lo: 0.005, hi: 0.015 }, cost: { lo: 0.030, hi: 0.070 }, drivers: ['MTTR reduction –20–40%','AIOps incident prevention','GenAI ITSM auto-resolution'], source: 'ServiceNow Platform Value Report 2024' },
  rd:      { rev: { lo: 0.010, hi: 0.040 }, cost: { lo: 0.010, hi: 0.030 }, drivers: ['Compressed time-to-market (–20–35% dev cycle)','AI-assisted design & simulation','IP analysis'], source: 'BCG — AI in R&D: The Next Frontier 2024' },
};

/**
 * Industry-by-function multipliers. Values < 1 mean below-average uplift; > 1 above-average.
 */
export const IND_MULT: Record<string, Record<string, number>> = {
  universal:     { finance: 1.0, hr: 1.0, sales: 1.0, supply: 1.0, cx: 1.0, risk: 1.0, it: 1.0, rd: 1.0 },
  creative:      { finance: 1.0, hr: 1.0, sales: 1.3, supply: 1.0, cx: 1.3, risk: 1.0, it: 1.0, rd: 1.2 },
  education:     { finance: 1.0, hr: 1.2, sales: 1.0, supply: 1.0, cx: 1.0, risk: 1.0, it: 1.2, rd: 1.4 },
  energy:        { finance: 1.0, hr: 1.0, sales: 1.0, supply: 1.4, cx: 1.0, risk: 1.3, it: 1.3, rd: 1.0 },
  financial:     { finance: 1.4, hr: 1.1, sales: 1.2, supply: 0.7, cx: 1.3, risk: 1.5, it: 1.1, rd: 0.8 },
  healthcare:    { finance: 1.1, hr: 1.1, sales: 1.0, supply: 0.8, cx: 1.1, risk: 1.4, it: 1.0, rd: 1.5 },
  logistics:     { finance: 1.2, hr: 1.0, sales: 1.0, supply: 1.5, cx: 1.0, risk: 1.0, it: 1.3, rd: 1.0 },
  manufacturing: { finance: 1.0, hr: 1.0, sales: 0.9, supply: 1.4, cx: 0.9, risk: 1.1, it: 1.3, rd: 1.1 },
  nonprofit:     { finance: 1.1, hr: 1.2, sales: 1.0, supply: 1.0, cx: 1.2, risk: 1.0, it: 1.0, rd: 1.0 },
  professional:  { finance: 1.0, hr: 1.2, sales: 1.4, supply: 1.0, cx: 1.3, risk: 1.0, it: 1.0, rd: 1.0 },
  public_sector: { finance: 1.0, hr: 1.2, sales: 1.0, supply: 1.0, cx: 1.0, risk: 1.3, it: 1.2, rd: 1.0 },
  real_estate:   { finance: 1.3, hr: 1.0, sales: 1.2, supply: 1.2, cx: 1.0, risk: 1.0, it: 1.0, rd: 1.0 },
  retail:        { finance: 1.0, hr: 1.0, sales: 1.4, supply: 1.2, cx: 1.4, risk: 0.9, it: 1.0, rd: 0.8 },
  technology:    { finance: 1.0, hr: 1.1, sales: 1.2, supply: 0.8, cx: 1.1, risk: 1.0, it: 1.4, rd: 1.4 },
};

export const TIER_ADJ = { gen1: 0.55, gen2: 1.00, gen3: 1.35 } as const;

export const READINESS_CAPTURE = {
  agile:       { low: 0.85, high: 1.00, label: 'Agile & Collaborative' },
  traditional: { low: 0.50, high: 0.70, label: 'Traditional Hierarchy' },
  siloed:      { low: 0.25, high: 0.40, label: 'Siloed & Bureaucratic' },
} as const;

function classify(sa: number, fr: number, ce: number, gr: number): { label: Classification; reason: string } {
  if (gr >= 70 || fr <= 20) {
    return { label: 'Stop', reason: gr >= 70 ? 'Governance risk above the safe threshold.' : 'Financial return too thin to justify scope.' };
  }
  if (sa >= 60 && fr >= 60 && ce >= 60 && gr <= 40) {
    return { label: 'Accelerate', reason: 'All four pillars clear, governance contained. Fund it.' };
  }
  const gaps: string[] = [];
  if (sa < 60) gaps.push('strategic alignment is weak');
  if (fr < 60) gaps.push('financial return is thin');
  if (ce < 60) gaps.push('change enablement is a risk');
  if (gr > 40) gaps.push('governance exposure is real');
  return { label: 'Fix', reason: `Workable, but ${gaps.join('; ')}. Close the gap before scaling.` };
}

/**
 * Score an initiative according to AI BVF v1.0.
 * Deterministic. No network. No dependencies.
 */
export function score(input: ScoreInput): ScoreResult {
  const { industry, revenue_eur, function: fn, ai_tier, readiness, scores } = input;
  const base = BASE_RATES[fn];
  if (!base) throw new Error(`Unknown function: ${fn}`);
  const mult = (IND_MULT[industry] ?? IND_MULT.universal)[fn] ?? 1;
  const tAdj = TIER_ADJ[ai_tier];
  if (tAdj === undefined) throw new Error(`Unknown ai_tier: ${ai_tier}`);
  const cap = READINESS_CAPTURE[readiness];
  if (!cap) throw new Error(`Unknown readiness: ${readiness}`);

  const { strategic_alignment: sa, financial_return: fr, change_enablement: ce, governance_risk: gr } = scores;

  const grossLo = revenue_eur * (base.rev.lo + base.cost.lo) * mult * tAdj;
  const grossHi = revenue_eur * (base.rev.hi + base.cost.hi) * mult * tAdj;
  const netLo = grossLo * cap.low;
  const netHi = grossHi * cap.high;

  const cls = classify(sa, fr, ce, gr);
  const confidence = Math.round((sa + fr + ce + (100 - gr)) / 4);

  return {
    classification: cls.label,
    reason: cls.reason,
    gross_low_eur: grossLo,
    gross_high_eur: grossHi,
    net_low_eur: netLo,
    net_high_eur: netHi,
    confidence,
    multipliers: { industry: mult, tier: tAdj, capture_low: cap.low, capture_high: cap.high },
    drivers: base.drivers,
    source: base.source,
  };
}
