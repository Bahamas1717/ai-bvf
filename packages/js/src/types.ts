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

/** The four pillars, fully resolved (every pillar carries a number). */
export interface PillarScores {
  strategic_alignment: number;
  financial_return: number;
  change_enablement: number;
  governance_risk: number;
}

/** Where each resolved pillar value came from. */
export type PillarBasis = Record<keyof PillarScores, 'given' | 'estimated'>;

export interface ScoreInput {
  industry: Industry;
  revenue_eur: number;
  function: FunctionId;
  ai_tier: AiTier;
  readiness: Readiness;
  /**
   * Optional, and each pillar inside it is optional. Give the pillars you
   * have evidence for; any missing pillar is estimated deterministically
   * from readiness, tier, function and the published benchmarks, the result
   * reports which were estimated via pillar_basis, and a fully-estimated
   * pass can never return Accelerate.
   */
  scores?: Partial<PillarScores>;
  /**
   * Optional 0–1. How grounded the four pillar scores are in real evidence
   * versus estimated from context. When omitted it defaults from the count
   * of pillars actually given (all four = 1, none = 0.5), which haircuts
   * decision confidence and attaches a caveat on soft inputs. Mirrors
   * diagnose_process's signal_completeness.
   */
  signal_completeness?: number;
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
  /** The four pillar values the verdict was computed on, given or estimated. */
  scores_used: PillarScores;
  /** Which pillars were given by the caller and which were estimated by the engine. */
  pillar_basis: PillarBasis;
  /** Present when signal_completeness is low or any pillar was estimated: warns the verdict rests on soft inputs. */
  caveat?: string;
}

/** What kind of resistance sits behind a low change-enablement score. */
export type ResistanceType = 'will' | 'skill';
/** What kind of exposure sits behind a high governance-risk score. */
export type RiskType = 'regulatory' | 'reputational' | 'operational';

export interface RecommendInput extends ScoreInput {
  /** Optional. Whether people do not WANT the change (will) or cannot yet DO it (skill). Sharpens the change plan; inferred from readiness when absent. */
  resistance_type?: ResistanceType;
  /** Optional. The nature of the governance exposure. Sharpens the change plan; inferred from tier, function and industry when absent. */
  risk_type?: RiskType;
}

export interface Recommendation {
  pillar: 'strategic_alignment' | 'financial_return' | 'change_enablement' | 'governance_risk';
  current: number;
  target: number;
  delta: number;
  action: string;
  rationale: string;
}

/** One move at one altitude: the organisation (Kotter) or the person (ADKAR). */
export interface ChangeMove {
  method: string;
  action: string;
}

/** A named, context-selected change play. The unit of advice in the change plan. */
export interface ChangePlay {
  id: string;
  pillar: Recommendation['pillar'] | 'pace_gap';
  diagnosis: string;
  org_move: ChangeMove;
  person_move: ChangeMove;
  steps: string[];
  diagnostic_questions: string[];
  owner: string;
  timeline_weeks: [number, number];
  /** Present when the honest escalation from this play is Stop, and under what condition. */
  stop_condition?: string;
  /** True when the play was inferred from context rather than told via resistance_type / risk_type. */
  provisional: boolean;
  source: string;
}

export interface RescoreGate {
  clears_when: string;
  deadline_weeks: number;
}

/** The change-leader layer: a specific, sequenced route from Fix or Stop toward Go. */
export interface ChangePlan {
  binding_constraint: string;
  position: 'near_go' | 'contested' | 'near_stop';
  position_detail: string;
  plays: ChangePlay[];
  cost_of_waiting_eur: { low: number; high: number };
  cost_of_waiting: string;
  rescore_gate: RescoreGate;
  /** Present when the truthful call is Stop rather than Fix. */
  honest_stop?: string;
}

export interface RecommendResult {
  current_classification: Classification;
  target_classification: Classification;
  feasible: boolean;
  recommendations: Recommendation[];
  projected_confidence: number;
  notes: string[];
  /** Absent when the initiative is already Accelerate. */
  change_plan?: ChangePlan;
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
