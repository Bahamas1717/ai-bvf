"""Wire, the actuator. Mocks MuleSoft Anypoint API actions and computes annual saving."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any


LOADED_COST_EUR_PER_MIN = 1.50  # 90 EUR/hour fully loaded
INTEGRATION_MAINTENANCE_EUR_PER_YEAR = 50_000
ANNUALISATION_FACTOR = 12  # observation window assumed to be 30 days


def _decommission_calls(plan: dict, activities: list[dict]) -> list[dict]:
    by_system = {}
    for a in activities:
        if a["name"] in plan.get("decorative_steps_removed", []):
            by_system.setdefault(a["system"], []).append(a)
    calls = []
    for system, acts in by_system.items():
        for a in acts:
            calls.append({
                "verb": "DELETE",
                "system": system,
                "endpoint": a["api_path"],
                "result": "ok",
                "rollback_window_days": 30,
            })
    return calls


def _patch_calls(plan: dict) -> list[dict]:
    return [
        {"verb": "PATCH", "system": "Anypoint", "endpoint": "/policies/approval-threshold", "result": "ok",
         "payload_summary": "delegated-approval rule under 50k EUR"},
    ]


def _accelerate_calls(plan: dict, candidate: dict) -> list[dict]:
    name = candidate["name"]
    return [
        {"verb": "POST", "system": "Anypoint", "endpoint": f"/agents/{name}", "result": "ok",
         "payload_summary": f"deploy {plan.get('ai_pattern', 'agentic')} in shadow mode"},
        {"verb": "POST", "system": "Anypoint", "endpoint": f"/observability/divergence-{name}", "result": "ok",
         "payload_summary": "30-day daily divergence reports against current path"},
        {"verb": "POST", "system": "Anypoint", "endpoint": f"/cm/owner-{candidate['function_hint']}", "result": "ok",
         "payload_summary": "named product owner at 0.6 FTE, change budget reserved at 20 percent of build spend"},
    ]


def _saving_for_stop(candidate: dict, plan: dict) -> dict[str, float]:
    activities = candidate["activities"]
    cases_observed = candidate["metrics"]["cases_observed"]
    annual_cases = cases_observed * ANNUALISATION_FACTOR

    decorative_names = set(plan["decorative_steps_removed"])
    decorative_minutes_per_case = sum(
        a["avg_duration_min"] * (a["frequency"] / cases_observed)
        for a in activities if a["name"] in decorative_names
    )
    labour_eur = decorative_minutes_per_case * annual_cases * LOADED_COST_EUR_PER_MIN
    integration_eur = len(plan["integrations_to_retire"]) * INTEGRATION_MAINTENANCE_EUR_PER_YEAR

    return {
        "labour_eur_per_year": round(labour_eur),
        "integration_eur_per_year": round(integration_eur),
        "total_eur_per_year": round(labour_eur + integration_eur),
        "decorative_minutes_per_case": round(decorative_minutes_per_case),
        "annualised_cases": annual_cases,
    }


def _saving_for_fix(candidate: dict) -> dict[str, float]:
    return {"note": "Fix plan saving depends on which pillars are raised, computed per recommendation."}


def _opportunity_for_accelerate(candidate: dict, verdict: dict) -> dict[str, float]:
    bvf = verdict["bvf_result"]
    return {
        "net_low_eur_per_year": round(bvf["net_low_eur"]),
        "net_high_eur_per_year": round(bvf["net_high_eur"]),
        "shadow_window_days": 30,
        "note": "Net of capture, gated by 30-day shadow-mode validation before full cutover.",
    }


def execute(candidate: dict, verdict: dict, plan: dict, output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rollback_until = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")

    calls: list[dict] = []
    saving: dict[str, Any] = {}

    if plan["kind"] == "elimination_plan":
        calls = _decommission_calls(plan, candidate["activities"])
        saving = _saving_for_stop(candidate, plan)
    elif plan["kind"] == "improvement_plan":
        calls = _patch_calls(plan)
        saving = _saving_for_fix(candidate)
    elif plan["kind"] == "agentic_deployment":
        calls = _accelerate_calls(plan, candidate)
        saving = _opportunity_for_accelerate(candidate, verdict)

    log = {
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        "workflow": candidate["name"],
        "ruling": verdict["ruling"],
        "plan_kind": plan["kind"],
        "anypoint_calls": calls,
        "rollback_held_until": rollback_until,
        "saving": saving,
    }

    log_path = output_dir / f"wire-{candidate['name']}-{today}.json"
    log_path.write_text(json.dumps(log, indent=2), encoding="utf-8")

    if plan["kind"] == "elimination_plan":
        cm_path = output_dir / f"cm-plan-{candidate['name']}.md"
        cm_path.write_text(_render_cm_plan(candidate, plan), encoding="utf-8")
        log["cm_plan_path"] = str(cm_path)

    log["log_path"] = str(log_path)
    return log


def _render_cm_plan(candidate: dict, plan: dict) -> str:
    cohorts = ", ".join(plan["affected_cohorts"]) or "none"
    return (
        f"# Change-management plan, {candidate['name']}\n\n"
        f"## Redesign rule\n{plan['redesign_rule']}\n\n"
        f"## Affected cohorts\n{cohorts}\n\n"
        f"## Treatment\n{plan['cm_treatment']}\n\n"
        f"## Steps retained\n" + "\n".join(f"- {s}" for s in plan["mandatory_steps_retained"]) + "\n\n"
        f"## Steps removed\n" + "\n".join(f"- {s}" for s in plan["decorative_steps_removed"]) + "\n\n"
        f"## Integrations retired\n" + "\n".join(f"- {i}" for i in plan["integrations_to_retire"]) + "\n"
    )
