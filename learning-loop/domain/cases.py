"""Domain: BVF pillar-derivation cases, the firm's gold judgment, and features.

The task (reused from the Workflow Coroner): given a process-mined workflow
candidate, derive the four BVF pillar inputs and the ai_tier/readiness enums that
a Craig-Horton-calibrated senior practitioner would assign. The deterministic
aibvf.score() engine then turns those inputs into an Accelerate/Fix/Stop ruling
and a decision confidence. That ruling is the business outcome the private evals
score against.

Two derivations live here:

  base_rubric()   -- the published BVF v1.0 rubric (what a competent generalist,
                     or a cold base model, produces from the candidate signals).
  veteran_label() -- the firm's GOLD judgment: the base rubric PLUS the systematic
                     senior-practitioner adjustments that are the firm's tacit
                     knowledge (its human capital). These adjustments are
                     feature-driven, so a calibration policy can learn them from
                     real traces. This is exactly the gap the learning loop closes.

In a real deployment the gold comes from human practitioners reviewing real
workflows. Here it is generated deterministically from a documented veteran
function so the dataset is internally self-consistent and the hill-climb is
reproducible. A flat curve would be a real, publishable negative result.
"""
from __future__ import annotations
import hashlib
import random
from dataclasses import dataclass, field

from config import DATASET_SEED, N_CASES, HOLDOUT_FRACTION

FUNCTIONS = ["finance", "hr", "sales", "supply", "cx", "risk", "it", "rd"]
INDUSTRIES = [
    "universal", "creative", "education", "energy", "financial", "healthcare",
    "logistics", "manufacturing", "nonprofit", "professional", "public_sector",
    "real_estate", "retail", "technology",
]
VALUE_FUNCTIONS = {"sales", "supply", "rd", "cx"}
REGULATED_FUNCTIONS = {"risk", "finance"}
REGULATED_INDUSTRIES = {"financial", "healthcare", "public_sector", "energy"}
REG_KEYWORD_POOL = ["sla", "gdpr", "eu_ai_act", "dora", "csrd", "hipaa", "audit_trail"]

FEATURE_NAMES = [
    "bias",
    "automation_coverage",
    "rework_rate",
    "exception_rate",
    "cycle_scaled",
    "integrations_count",
    "regulatory_count",
    "has_concrete_kpi",
    "has_owner",
    "is_value_function",
    "is_regulated_function",
    "is_regulated_industry",
    "reg_ceremonial",
    "brittle_automation",
]

PILLARS = ["strategic_alignment", "financial_return", "change_enablement", "governance_risk"]


@dataclass
class Case:
    id: str
    candidate: dict
    gold_scores: dict
    gold_ai_tier: str
    gold_readiness: str


# --------------------------------------------------------------------------
# Feature extraction (reproducible from a candidate, per the protocol)
# --------------------------------------------------------------------------
def _has_concrete_kpi(candidate: dict) -> bool:
    kpi = candidate.get("named_kpi") or ""
    return bool(kpi) and any(ch.isdigit() for ch in kpi)


def featurize(candidate: dict) -> list[float]:
    """Map a candidate to the firm feature vector aligned to FEATURE_NAMES."""
    m = candidate["metrics"]
    fn = candidate["function_hint"]
    industry = candidate["company"]["industry"]
    reg_count = len(candidate["regulatory_keywords"])
    integrations = len(candidate["integrations"])
    reg_ceremonial = 1.0 if (reg_count > 0 and m["exception_rate"] < 0.05) else 0.0
    brittle = 1.0 if (m["automation_coverage"] > 0.70 and m["rework_rate"] > 0.05) else 0.0
    return [
        1.0,
        m["automation_coverage"],
        m["rework_rate"],
        m["exception_rate"],
        m["median_cycle_time_hours"] / 10.0,
        float(integrations),
        float(reg_count),
        1.0 if _has_concrete_kpi(candidate) else 0.0,
        1.0 if candidate.get("executive_owner") else 0.0,
        1.0 if fn in VALUE_FUNCTIONS else 0.0,
        1.0 if fn in REGULATED_FUNCTIONS else 0.0,
        1.0 if industry in REGULATED_INDUSTRIES else 0.0,
        reg_ceremonial,
        brittle,
    ]


def _clip(x: float) -> int:
    return int(round(max(0.0, min(100.0, x))))


# --------------------------------------------------------------------------
# Base BVF v1.0 rubric (the generalist / cold-model derivation)
# --------------------------------------------------------------------------
def base_rubric(candidate: dict) -> dict:
    """The published BVF rubric, exactly as the Coroner's offline agent applies it."""
    m = candidate["metrics"]
    fn = candidate["function_hint"]
    integrations = len(candidate["integrations"])
    reg_count = len(candidate["regulatory_keywords"])

    cov = m["automation_coverage"]
    ai_tier = "gen1" if cov < 0.30 else ("gen2" if cov < 0.65 else "gen3")
    churn = m["rework_rate"] + m["exception_rate"]
    readiness = "agile" if churn < 0.10 else ("traditional" if churn < 0.20 else "siloed")

    sa = 20.0
    if _has_concrete_kpi(candidate):
        sa += 30.0
    if candidate.get("executive_owner"):
        sa += 30.0
    if fn in VALUE_FUNCTIONS:
        sa += 20.0

    fr = 30.0 + 50.0 * cov
    fr -= m["rework_rate"] * 100.0
    fr -= m["exception_rate"] * 100.0
    fr -= m["median_cycle_time_hours"] / 10.0

    ce = {"agile": 75.0, "traditional": 60.0, "siloed": 45.0}[readiness] - integrations

    gr = 30.0 + 2.0 * reg_count + m["exception_rate"] * 200.0

    return {
        "scores": {
            "strategic_alignment": _clip(sa),
            "financial_return": _clip(fr),
            "change_enablement": _clip(ce),
            "governance_risk": _clip(gr),
        },
        "ai_tier": ai_tier,
        "readiness": readiness,
    }


# --------------------------------------------------------------------------
# The firm's veteran adjustments (its tacit knowledge / human capital)
# --------------------------------------------------------------------------
def _veteran_noise(case_id: str, pillar: str) -> float:
    h = hashlib.sha256(f"{case_id}:{pillar}".encode()).hexdigest()
    return (int(h[:4], 16) % 401 - 200) / 100.0  # deterministic +/- 2.0


def veteran_label(candidate: dict, case_id: str) -> dict:
    """Gold judgment = base rubric + systematic senior-practitioner adjustments.

    Each adjustment encodes a real piece of firm judgment and is a function of
    candidate features, so the calibration policy can recover it from traces.
    """
    base = base_rubric(candidate)
    s = dict(base["scores"])
    feats = dict(zip(FEATURE_NAMES, featurize(candidate)))

    # Ceremonial regulatory keywords should not inflate governance_risk.
    if feats["reg_ceremonial"]:
        s["governance_risk"] -= 28
    # Genuine regulated exposure deserves more governance weight.
    elif feats["is_regulated_industry"]:
        s["governance_risk"] += 14
    # High automation with concentrated rework signals brittle automation.
    if feats["brittle_automation"]:
        s["financial_return"] -= 20
    # Regulated function in a regulated industry is more strategic than the rubric allows.
    if feats["is_regulated_function"] and feats["is_regulated_industry"]:
        s["strategic_alignment"] += 18
    # Concrete KPI + named owner + a value function is a stronger signal than the rubric scores.
    if feats["has_concrete_kpi"] and feats["has_owner"] and feats["is_value_function"]:
        s["strategic_alignment"] += 14
    # The rubric over-penalises integrations; much of it is orchestration plumbing, not coupling.
    s["change_enablement"] += 2.5 * min(feats["integrations_count"], 6)

    for p in PILLARS:
        s[p] = _clip(s[p] + _veteran_noise(case_id, p))

    return {"scores": s, "ai_tier": base["ai_tier"], "readiness": base["readiness"]}


# --------------------------------------------------------------------------
# Synthetic firm dataset
# --------------------------------------------------------------------------
def _make_candidate(rng: random.Random, idx: int) -> dict:
    industry = rng.choice(INDUSTRIES)
    fn = rng.choice(FUNCTIONS)
    cov = round(rng.uniform(0.05, 0.95), 2)
    rework = round(rng.uniform(0.0, 0.18), 3)
    exception = round(rng.uniform(0.0, 0.16), 3)
    cycle = rng.choice([2, 3, 4, 6, 9, 14, 22, 40])
    n_integrations = rng.randint(1, 8)
    n_reg = rng.randint(0, 3)
    has_kpi = rng.random() < 0.6
    has_owner = rng.random() < 0.6
    revenue = rng.choice([8e7, 2e8, 5e8, 8e8, 1.5e9, 4e9])

    kpi = ""
    if has_kpi:
        kpi = rng.choice([
            f"Cut cycle time {rng.randint(10, 40)}% within {rng.randint(6, 18)} months",
            f"Lift NPS by {rng.randint(5, 20)} points",
            f"Reduce cost-to-serve {rng.randint(8, 30)}%",
        ]) if rng.random() < 0.8 else "Improve operational excellence"  # sometimes vague

    return {
        "company": {
            "name": f"Firm-{idx:03d}",
            "industry": industry,
            "annual_revenue_eur": revenue,
        },
        "function_hint": fn,
        "metrics": {
            "cases_observed": rng.randint(2000, 40000),
            "median_cycle_time_hours": cycle,
            "rework_rate": rework,
            "exception_rate": exception,
            "automation_coverage": cov,
        },
        "integrations": [f"sys{j}" for j in range(n_integrations)],
        "regulatory_keywords": rng.sample(REG_KEYWORD_POOL, n_reg),
        "named_kpi": kpi,
        "executive_owner": "Named executive sponsor" if has_owner else "",
        "pace_layer": rng.choice(["system_of_record", "system_of_differentiation", "system_of_innovation"]),
        "activities": [f"step{j}" for j in range(rng.randint(5, 12))],
    }


def load_dataset() -> tuple[list[Case], list[Case]]:
    """Return (train_pool, holdout). The split is fixed; holdout is never fit on."""
    rng = random.Random(DATASET_SEED)
    cases: list[Case] = []
    for i in range(N_CASES):
        cand = _make_candidate(rng, i)
        cid = f"case-{i:03d}"
        gold = veteran_label(cand, cid)
        cases.append(Case(cid, cand, gold["scores"], gold["ai_tier"], gold["readiness"]))

    n_holdout = int(round(N_CASES * HOLDOUT_FRACTION))
    # Deterministic shuffle for the split, independent of the generation RNG.
    split_rng = random.Random(DATASET_SEED + 1)
    order = list(range(N_CASES))
    split_rng.shuffle(order)
    holdout_ids = {f"case-{i:03d}" for i in order[:n_holdout]}

    train = [c for c in cases if c.id not in holdout_ids]
    holdout = [c for c in cases if c.id in holdout_ids]
    return train, holdout
