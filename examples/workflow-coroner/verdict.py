"""Verdict, the BVF adjudicator. Wraps aibvf.score and calculate_pace_layer_drag."""
from __future__ import annotations
from typing import Any

from aibvf import score, calculate_pace_layer_drag


def _strategic_alignment(candidate: dict) -> int:
    sa = 20
    if candidate.get("named_kpi"):
        sa += 30
    if candidate.get("executive_owner"):
        sa += 30
    if candidate["function_hint"] in {"sales", "supply", "rd", "cx"}:
        sa += 20
    return min(100, sa)


def _financial_return(candidate: dict) -> int:
    metrics = candidate["metrics"]
    rework = metrics["rework_rate"] * 100
    exception = metrics["exception_rate"] * 100
    cycle_penalty = metrics["median_cycle_time_hours"] / 10
    base = 30 + 50 * metrics["automation_coverage"]
    fr = base - rework - exception - cycle_penalty
    return max(5, min(100, round(fr)))


def _change_enablement(candidate: dict) -> int:
    base = {"agile": 75, "traditional": 60, "siloed": 45}[candidate["inferred_readiness"]]
    integration_drag = len(candidate["integrations"])
    return max(5, min(100, base - integration_drag))


def _governance_risk(candidate: dict) -> int:
    base = 30
    keyword_drag = 2 * len(candidate.get("regulatory_keywords", []))
    exception_drag = candidate["metrics"]["exception_rate"] * 200
    return max(0, min(100, round(base + keyword_drag + exception_drag)))


def adjudicate(candidate: dict) -> dict[str, Any]:
    """Run BVF scoring, attach pace-layer drag, return a ruling envelope."""
    sa = _strategic_alignment(candidate)
    fr = _financial_return(candidate)
    ce = _change_enablement(candidate)
    gr = _governance_risk(candidate)

    bvf_inputs = {
        "industry": candidate["company"]["industry"],
        "revenue_eur": candidate["company"]["annual_revenue_eur"],
        "function": candidate["function_hint"],
        "ai_tier": candidate["inferred_ai_tier"],
        "readiness": candidate["inferred_readiness"],
        "scores": {
            "strategic_alignment": sa,
            "financial_return": fr,
            "change_enablement": ce,
            "governance_risk": gr,
        },
    }

    bvf_result = score(**bvf_inputs)
    drag = calculate_pace_layer_drag(
        revenue_eur=candidate["company"]["annual_revenue_eur"],
        ai_tier=candidate["inferred_ai_tier"],
        readiness=candidate["inferred_readiness"],
        industry=candidate["company"]["industry"],
    )

    return {
        "bvf_inputs": bvf_inputs,
        "bvf_result": bvf_result,
        "pace_drag": drag,
        "ruling": bvf_result["classification"],
        "reason": bvf_result["reason"],
        "bvf_health_score": bvf_result["confidence"],
    }
