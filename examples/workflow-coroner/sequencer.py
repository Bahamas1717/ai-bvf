"""Sequencer, the fifth agent.

Takes a portfolio of (candidate, verdict, plan, log) tuples from prior runs
of Pulse / Verdict / Architect / Wire, returns a 90-day rollout plan with
three waves and named gates between them.

Wave logic:
- Wave 1, days 1 to 30, all Stop verdicts. Free budget, signal seriousness, retire decorative work.
- Wave 2, days 31 to 60, quick Accelerates (lower complexity half). Bank early wins, de-risk the sponsor.
- Wave 3, days 61 to 90, complex Accelerates plus all Fixes. Need the trust the first two waves bought.

Keep verdicts are omitted from the plan, those workflows continue as is.
"""
from __future__ import annotations
from typing import Any


_TIER_COMPLEXITY = {"gen1": 1, "gen2": 2, "gen3": 3}
_READINESS_COMPLEXITY = {"agile": 1, "traditional": 2, "siloed": 3}


def _complexity(item: dict) -> int:
    """Heuristic, lower means quicker to ship. Drives wave-2 vs wave-3 ordering."""
    candidate = item["candidate"]
    integrations = len(candidate["integrations"])
    tier = _TIER_COMPLEXITY[candidate["inferred_ai_tier"]]
    readiness = _READINESS_COMPLEXITY[candidate["inferred_readiness"]]
    return integrations + tier + readiness


def _headline_eur(item: dict) -> float:
    saving = item.get("log", {}).get("saving", {})
    if "total_eur_per_year" in saving:
        return saving["total_eur_per_year"]
    if "net_low_eur_per_year" in saving:
        return saving["net_low_eur_per_year"]
    return 0.0


def _shape_item(item: dict) -> dict:
    candidate = item["candidate"]
    return {
        "workflow": candidate["name"],
        "company": candidate["company"]["name"],
        "ruling": item["verdict"]["ruling"],
        "headline_eur_per_year": _headline_eur(item),
        "complexity_score": _complexity(item),
    }


def _shape_wave(items: list[dict], window: str, kind: str, rationale: str, gate: str | None) -> dict:
    return {
        "window": window,
        "kind": kind,
        "rationale": rationale,
        "items": [_shape_item(it) for it in items],
        "gate_to_next_wave": gate,
    }


def sequence(portfolio: list[dict]) -> dict[str, Any]:
    """Return a three-wave 90-day plan from a portfolio of run results."""
    stops = [it for it in portfolio if it["verdict"]["ruling"] == "Stop"]
    accelerates = sorted(
        [it for it in portfolio if it["verdict"]["ruling"] == "Accelerate"],
        key=_complexity,
    )
    fixes = sorted(
        [it for it in portfolio if it["verdict"]["ruling"] == "Fix"],
        key=_complexity,
    )
    keeps = [it for it in portfolio if it["verdict"]["ruling"] == "Keep"]

    quick_count = max(1, len(accelerates) // 2) if accelerates else 0
    wave_2_items = accelerates[:quick_count]
    wave_3_items = accelerates[quick_count:] + fixes

    wave_1_saving = sum(
        it.get("log", {}).get("saving", {}).get("total_eur_per_year", 0)
        for it in stops
    )
    wave_2_3_low = sum(
        it.get("log", {}).get("saving", {}).get("net_low_eur_per_year", 0)
        for it in wave_2_items + wave_3_items
        if it["verdict"]["ruling"] == "Accelerate"
    )
    wave_2_3_high = sum(
        it.get("log", {}).get("saving", {}).get("net_high_eur_per_year", 0)
        for it in wave_2_items + wave_3_items
        if it["verdict"]["ruling"] == "Accelerate"
    )

    return {
        "wave_1": _shape_wave(
            stops,
            "days 1 to 30",
            "Stop, retire decorative work",
            "Free budget by stopping work that should not exist before any AI is bolted to it.",
            "Wave 1 Stops in production, decommissioned APIs verified, saving realised in next quarter's budget.",
        ),
        "wave_2": _shape_wave(
            wave_2_items,
            "days 31 to 60",
            "Accelerate, quick wins",
            "Bank early wins to de-risk the executive sponsor and earn the trust required for wave 3.",
            "Wave 2 Accelerates passing 30-day shadow-mode divergence checks, sponsor signs off on cutover.",
        ),
        "wave_3": _shape_wave(
            wave_3_items,
            "days 61 to 90",
            "Accelerate, complex, plus Fix",
            "Resolve dependencies after waves 1 and 2 build the operational trust to commit deeper change.",
            None,
        ),
        "summary": {
            "stops": len(stops),
            "accelerates": len(accelerates),
            "fixes": len(fixes),
            "keeps": len(keeps),
            "wave_1_saving_eur_per_year": round(wave_1_saving),
            "wave_2_3_opportunity_eur_per_year": {
                "low": round(wave_2_3_low),
                "high": round(wave_2_3_high),
            },
        },
    }
