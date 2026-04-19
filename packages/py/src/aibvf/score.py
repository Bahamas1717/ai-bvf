"""AI BVF v1.0 scoring engine. Deterministic, no dependencies."""
from __future__ import annotations

BASE_RATES = {
    "finance": {"rev": {"lo": 0.010, "hi": 0.030}, "cost": {"lo": 0.030, "hi": 0.060}, "drivers": ["Automated financial close (-40% cycle time)", "AI FP&A & forecasting", "Anomaly detection reducing write-offs"], "source": "McKinsey Global Institute — Finance AI benchmark"},
    "hr":      {"rev": {"lo": 0.005, "hi": 0.015}, "cost": {"lo": 0.020, "hi": 0.040}, "drivers": ["Attrition reduction (-15-25% replacement cost)", "GenAI HR service desk (-30% AHT)", "Skills-based talent deployment"], "source": "Deloitte Future of Work 2024"},
    "sales":   {"rev": {"lo": 0.030, "hi": 0.080}, "cost": {"lo": 0.010, "hi": 0.025}, "drivers": ["Hyper-personalisation at scale", "Predictive lead scoring & pipeline accuracy", "AI deal coaching"], "source": "McKinsey — AI personalisation drives up to 40% revenue uplift"},
    "supply":  {"rev": {"lo": 0.005, "hi": 0.015}, "cost": {"lo": 0.040, "hi": 0.090}, "drivers": ["Predictive maintenance (-10-25% unplanned downtime)", "Inventory optimisation (-15% holding cost)", "Quality defect AI (-20% rework)"], "source": "Gartner Supply Chain AI Benchmark 2024"},
    "cx":      {"rev": {"lo": 0.020, "hi": 0.050}, "cost": {"lo": 0.020, "hi": 0.050}, "drivers": ["GenAI deflection (up to 87% self-service)", "AHT reduction -20-35%", "Retention uplift from personalisation"], "source": "Forrester CX AI Impact 2024"},
    "risk":    {"rev": {"lo": 0.005, "hi": 0.010}, "cost": {"lo": 0.020, "hi": 0.040}, "drivers": ["AML false-positive reduction -30-50%", "Automated CSRD / EU AI Act reporting", "Continuous compliance monitoring"], "source": "Accenture Regulatory AI Report 2024"},
    "it":      {"rev": {"lo": 0.005, "hi": 0.015}, "cost": {"lo": 0.030, "hi": 0.070}, "drivers": ["MTTR reduction -20-40%", "AIOps incident prevention", "GenAI ITSM auto-resolution"], "source": "ServiceNow Platform Value Report 2024"},
    "rd":      {"rev": {"lo": 0.010, "hi": 0.040}, "cost": {"lo": 0.010, "hi": 0.030}, "drivers": ["Compressed time-to-market (-20-35% dev cycle)", "AI-assisted design & simulation", "IP analysis"], "source": "BCG — AI in R&D: The Next Frontier 2024"},
}

IND_MULT = {
    "universal":     {"finance": 1.0, "hr": 1.0, "sales": 1.0, "supply": 1.0, "cx": 1.0, "risk": 1.0, "it": 1.0, "rd": 1.0},
    "creative":      {"finance": 1.0, "hr": 1.0, "sales": 1.3, "supply": 1.0, "cx": 1.3, "risk": 1.0, "it": 1.0, "rd": 1.2},
    "education":     {"finance": 1.0, "hr": 1.2, "sales": 1.0, "supply": 1.0, "cx": 1.0, "risk": 1.0, "it": 1.2, "rd": 1.4},
    "energy":        {"finance": 1.0, "hr": 1.0, "sales": 1.0, "supply": 1.4, "cx": 1.0, "risk": 1.3, "it": 1.3, "rd": 1.0},
    "financial":     {"finance": 1.4, "hr": 1.1, "sales": 1.2, "supply": 0.7, "cx": 1.3, "risk": 1.5, "it": 1.1, "rd": 0.8},
    "healthcare":    {"finance": 1.1, "hr": 1.1, "sales": 1.0, "supply": 0.8, "cx": 1.1, "risk": 1.4, "it": 1.0, "rd": 1.5},
    "logistics":     {"finance": 1.2, "hr": 1.0, "sales": 1.0, "supply": 1.5, "cx": 1.0, "risk": 1.0, "it": 1.3, "rd": 1.0},
    "manufacturing": {"finance": 1.0, "hr": 1.0, "sales": 0.9, "supply": 1.4, "cx": 0.9, "risk": 1.1, "it": 1.3, "rd": 1.1},
    "nonprofit":     {"finance": 1.1, "hr": 1.2, "sales": 1.0, "supply": 1.0, "cx": 1.2, "risk": 1.0, "it": 1.0, "rd": 1.0},
    "professional":  {"finance": 1.0, "hr": 1.2, "sales": 1.4, "supply": 1.0, "cx": 1.3, "risk": 1.0, "it": 1.0, "rd": 1.0},
    "public_sector": {"finance": 1.0, "hr": 1.2, "sales": 1.0, "supply": 1.0, "cx": 1.0, "risk": 1.3, "it": 1.2, "rd": 1.0},
    "real_estate":   {"finance": 1.3, "hr": 1.0, "sales": 1.2, "supply": 1.2, "cx": 1.0, "risk": 1.0, "it": 1.0, "rd": 1.0},
    "retail":        {"finance": 1.0, "hr": 1.0, "sales": 1.4, "supply": 1.2, "cx": 1.4, "risk": 0.9, "it": 1.0, "rd": 0.8},
    "technology":    {"finance": 1.0, "hr": 1.1, "sales": 1.2, "supply": 0.8, "cx": 1.1, "risk": 1.0, "it": 1.4, "rd": 1.4},
}

TIER_ADJ = {"gen1": 0.55, "gen2": 1.00, "gen3": 1.35}

READINESS_CAPTURE = {
    "agile":       {"low": 0.85, "high": 1.00, "label": "Agile & Collaborative"},
    "traditional": {"low": 0.50, "high": 0.70, "label": "Traditional Hierarchy"},
    "siloed":      {"low": 0.25, "high": 0.40, "label": "Siloed & Bureaucratic"},
}


def _classify(sa: float, fr: float, ce: float, gr: float) -> dict:
    if gr >= 70 or fr <= 20:
        return {"label": "Stop", "reason": "Governance risk above the safe threshold." if gr >= 70 else "Financial return too thin to justify scope."}
    if sa >= 60 and fr >= 60 and ce >= 60 and gr <= 40:
        return {"label": "Accelerate", "reason": "All four pillars clear, governance contained. Fund it."}
    gaps = []
    if sa < 60: gaps.append("strategic alignment is weak")
    if fr < 60: gaps.append("financial return is thin")
    if ce < 60: gaps.append("change enablement is a risk")
    if gr > 40: gaps.append("governance exposure is real")
    return {"label": "Fix", "reason": f"Workable, but {'; '.join(gaps)}. Close the gap before scaling."}


def score(*, industry: str, revenue_eur: float, function: str, ai_tier: str, readiness: str, scores: dict) -> dict:
    """Score an initiative according to AI BVF v1.0. Deterministic."""
    base = BASE_RATES.get(function)
    if base is None:
        raise ValueError(f"Unknown function: {function}")
    mult = IND_MULT.get(industry, IND_MULT["universal"]).get(function, 1.0)
    t_adj = TIER_ADJ.get(ai_tier)
    if t_adj is None:
        raise ValueError(f"Unknown ai_tier: {ai_tier}")
    cap = READINESS_CAPTURE.get(readiness)
    if cap is None:
        raise ValueError(f"Unknown readiness: {readiness}")

    sa = scores["strategic_alignment"]
    fr = scores["financial_return"]
    ce = scores["change_enablement"]
    gr = scores["governance_risk"]

    gross_lo = revenue_eur * (base["rev"]["lo"] + base["cost"]["lo"]) * mult * t_adj
    gross_hi = revenue_eur * (base["rev"]["hi"] + base["cost"]["hi"]) * mult * t_adj
    net_lo = gross_lo * cap["low"]
    net_hi = gross_hi * cap["high"]

    cls = _classify(sa, fr, ce, gr)
    confidence = round((sa + fr + ce + (100 - gr)) / 4)

    return {
        "classification": cls["label"],
        "reason": cls["reason"],
        "gross_low_eur": gross_lo,
        "gross_high_eur": gross_hi,
        "net_low_eur": net_lo,
        "net_high_eur": net_hi,
        "confidence": confidence,
        "multipliers": {"industry": mult, "tier": t_adj, "capture_low": cap["low"], "capture_high": cap["high"]},
        "drivers": base["drivers"],
        "source": base["source"],
    }
