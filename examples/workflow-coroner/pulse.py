"""Pulse, the discovery agent. Reads a Celonis-shaped log summary and emits a workflow candidate."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any


def _classify_pace_layer(activities: list[dict]) -> str:
    """Pace-layer classification from activity mix (framing per Jeroen Tas)."""
    if not activities:
        return "unknown"
    types = [a.get("step_type", "") for a in activities]
    governance_signals = sum(1 for t in types if t in {"approval", "review"})
    transactional_signals = sum(1 for t in types if t == "transactional")
    if governance_signals / len(types) >= 0.5:
        return "governance"
    if transactional_signals / len(types) >= 0.5:
        return "commerce"
    return "infrastructure"


def _readiness_from_signals(rework_rate: float, exception_rate: float) -> str:
    """Heuristic, calibrated to BVF readiness enum."""
    drift = rework_rate + exception_rate
    if drift >= 0.20:
        return "siloed"
    if drift >= 0.10:
        return "traditional"
    return "agile"


def _ai_tier_from_coverage(automation_coverage: float) -> str:
    """Gen1 if barely automated, gen2 once GenAI is reasonable to layer in, gen3 only if ambition is agentic."""
    if automation_coverage < 0.30:
        return "gen1"
    if automation_coverage < 0.65:
        return "gen2"
    return "gen3"


def scan(log_path: str | Path) -> dict[str, Any]:
    """Parse a Celonis log summary, return a workflow candidate."""
    data = json.loads(Path(log_path).read_text(encoding="utf-8"))
    summary = data["log_summary"]
    metrics = summary["metrics"]
    activities = summary["activities"]
    integrations = summary["integrations"]

    pace_layer = _classify_pace_layer(activities)
    readiness = _readiness_from_signals(metrics["rework_rate"], metrics["exception_rate"])
    ai_tier = _ai_tier_from_coverage(metrics["automation_coverage"])

    return {
        "name": summary["name"],
        "company": summary["company"],
        "metrics": metrics,
        "activities": activities,
        "integrations": integrations,
        "regulatory_keywords": summary.get("regulatory_keywords", []),
        "named_kpi": summary.get("named_kpi"),
        "executive_owner": summary.get("executive_owner"),
        "function_hint": summary.get("function_hint", "supply"),
        "pace_layer": pace_layer,
        "inferred_readiness": readiness,
        "inferred_ai_tier": ai_tier,
    }
