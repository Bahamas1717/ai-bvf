"""Architect, the target-state designer. Branches on ruling.

Stop, draft an elimination plan, retire decorative steps and integrations.
Fix, call aibvf.recommend_improvements, propose pillar raises.
Accelerate, design the agentic deployment.
Keep, no action.
"""
from __future__ import annotations
from typing import Any

from aibvf import recommend_improvements


def _design_stop(candidate: dict) -> dict[str, Any]:
    activities = candidate["activities"]
    mandatory = [a for a in activities if a.get("mandatory_under_redesign")]
    decorative = [a for a in activities if not a.get("mandatory_under_redesign")]

    integrations_used_by_mandatory = {a["system"] for a in mandatory}
    integrations_used_by_decorative = {a["system"] for a in decorative}
    integrations_to_retire = sorted(integrations_used_by_decorative - integrations_used_by_mandatory)

    affected_cohorts = sorted({a["step_type"] for a in decorative})

    return {
        "kind": "elimination_plan",
        "redesign_rule": "Single delegated approval for purchases under 50k EUR, audit-on-sample at 1 in 200.",
        "mandatory_steps_retained": [a["name"] for a in mandatory],
        "decorative_steps_removed": [a["name"] for a in decorative],
        "integrations_to_retire": integrations_to_retire,
        "affected_cohorts": affected_cohorts,
        "cm_treatment": "Prosci ADKAR light, 4-week change cycle, embedded change agent in procurement, no formal training programme.",
    }


def _design_fix(candidate: dict, bvf_inputs: dict) -> dict[str, Any]:
    rec = recommend_improvements(**bvf_inputs)
    return {
        "kind": "improvement_plan",
        "current_classification": rec["current_classification"],
        "target_classification": rec["target_classification"],
        "feasible": rec["feasible"],
        "recommendations": rec["recommendations"],
        "projected_health_score": rec["projected_confidence"],
        "notes": rec["notes"],
    }


def _design_accelerate(candidate: dict) -> dict[str, Any]:
    fn = candidate["function_hint"]
    systems = sorted({a["system"] for a in candidate["activities"]})
    primary_systems = ", ".join(systems[:3]) if systems else "native systems of record"
    return {
        "kind": "agentic_deployment",
        "ai_pattern": f"{candidate['inferred_ai_tier']} on the {fn} function with retrieval over {primary_systems}",
        "topology": "Anypoint event mesh with agentic endpoints replacing batch jobs along the critical path.",
        "cm_treatment": "Prosci ADKAR full, named product owner at 0.6 FTE, change budget at 20 percent of build spend.",
        "validation_gate": "shadow mode for 30 days against current path, divergence reports daily.",
    }


def design(candidate: dict, verdict: dict) -> dict[str, Any]:
    ruling = verdict["ruling"]
    if ruling == "Stop":
        return _design_stop(candidate)
    if ruling == "Fix":
        return _design_fix(candidate, verdict["bvf_inputs"])
    if ruling == "Accelerate":
        return _design_accelerate(candidate)
    return {"kind": "noop", "note": "Workflow holds, no redesign required."}
