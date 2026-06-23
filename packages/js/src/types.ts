export type Industry =
  | 'universal' | 'creative' | 'education' | 'energy' | 'financial'
  | 'healthcare' | 'logistics' | 'manufacturing' | 'nonprofit'
  | 'professional' | 'public_sector' | 'real_estate' | 'retail' | 'technology';

export type FunctionId = 'finance' | 'hr' | 'sales' | 'supply' | 'cx' | 'risk' | 'it' | 'rd';
export type AiTier = 'gen1' | 'gen2' | 'gen3';
export type Readiness = 'agile' | 'traditional' | 'siloed';
export type Classification = 'Accelerate' | 'Fix' | 'Stop';
export type Bucket = 'Agent-Proof' | 'Agent-Augmented' | 'Agent-Replaceable';
export type ComplianceFramework = 'eu_ai_act' | 'dora' | 'csrd' | 'gdpr_ai';

export interface PillarScore {
  value: number;
  confidence?: number;
  evidence?: string[];
}

export interface FourPillarScore {
  strategic_alignment: PillarScore;
  financial_return: PillarScore;
  change_enablement: PillarScore;
  governance_risk: PillarScore;
}

export interface Initiative {
  id: string;
  name: string;
  function: FunctionId;
  ai_tier: AiTier;
  bucket?: Bucket;
  scores: FourPillarScore;
  classification?: Classification;
  decision_confidence?: number;
  compliance?: ComplianceFramework[];
}

export interface Portfolio {
  bvf_version: '1.0';
  generated_at?: string;
  organization: {
    name: string;
    industry: Industry;
    region?: string;
    revenue_eur?: number;
    headcount?: number;
  };
  initiatives: Initiative[];
}

export interface ScoreInput {
  industry: Industry;
  revenue_eur: number;
  function: FunctionId;
  ai_tier: AiTier;
  readiness: Readiness;
  scores: {
    strategic_alignment: number;
    financial_return: number;
    change_enablement: number;
    governance_risk: number;
  };
}

export interface ScoreResult {
  classification: Classification;
  reason: string;
  gross_low_eur: number;
  gross_high_eur: number;
  net_low_eur: number;
  net_high_eur: number;
  confidence: number;
  multipliers: { industry: number; tier: number; capture_low: number; capture_high: number };
  drivers: string[];
  source: string;
  applied_modules: string[];
}

export interface RecommendInput extends ScoreInput {}

export interface Recommendation {
  pillar: 'strategic_alignment' | 'financial_return' | 'change_enablement' | 'governance_risk';
  current: number;
  target: number;
  delta: number;
  action: string;
  rationale: string;
}

export interface RecommendResult {
  current_classification: Classification;
  target_classification: Classification;
  feasible: boolean;
  recommendations: Recommendation[];
  projected_confidence: number;
  notes: string[];
}

export interface PaceLayerInput {
  revenue_eur: number;
  ai_tier: AiTier;
  readiness: Readiness;
  industry?: Industry;
}

export interface PaceLayerResult {
  annual_drag_eur_low: number;
  annual_drag_eur_high: number;
  drag_rate_low: number;
  drag_rate_high: number;
  pace_gap: 'minimal' | 'moderate' | 'severe';
  drivers: string[];
  source: string;
}

export interface ValidationError {
  path: string;
  msg: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ── Advisor Brain (docs/brain-spec.md + docs/evidence-table.md) ───────────

export type Intervention =
  | 'Automate'
  | 'Consolidate & re-sequence'
  | 'Quality controls'
  | 'Eliminate / insource';

export type EvidenceMaturity = 'High' | 'Medium' | 'Low';

/** Source-agnostic process signals the agent extracts from digital exhaust. */
export interface ProcessSignals {
  process_id: string;
  function: FunctionId;
  instances_per_year: number;
  fte_hours_per_instance: number;
  loaded_hourly_rate_eur: number;
  cycle_time_days: number;
  touch_ratio: number;          // 0..1 (touch ÷ cycle; rest is wait)
  handoffs: number;
  rework_rate: number;          // 0..1
  automation_level: number;     // 0..1
  direct_spend_eur: number;
  signal_completeness?: number; // 0..1; how much was measured vs defaulted (default 0.7)
  readiness?: Readiness;        // org capture context; default 'traditional'
}

export interface DragDecomposition {
  manual: number;
  handoffs: number;
  wait: number;
  rework: number;
  cycle: number;
}

/** The Brain's verdict on one process — both the proposal and the one-pager. */
export interface BrainVerdict {
  process_id: string;
  function: FunctionId;
  baseline_cost_eur: number;
  heaviness: number;            // 0..100
  drag_decomposition: DragDecomposition;
  intervention: Intervention;
  net_saving_low_eur: number;
  net_saving_high_eur: number;
  efficiency_gain_pct: number;
  verdict: Classification;      // Accelerate | Fix | Stop (on the intervention)
  decision_confidence: number;  // 0..1
  assumptions: string[];
  offer_to_execute: boolean;
  evidence_maturity: EvidenceMaturity;
  brain_version: string;
  disclaimer: string;
}
