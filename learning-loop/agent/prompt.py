"""System prompt and tool schema for the Claude derivation pass.

Adapted from examples/workflow-coroner/verdict_agent.py: the model derives the
four BVF pillar inputs and the enums via forced tool use, and the deterministic
engine adjudicates downstream. The difference here is that the firm's knowledge
base (notes + retrieved exemplars) is injected into the prompt, so the base
derivation itself improves as institutional memory accumulates.
"""
from __future__ import annotations
import json

BASE_RUBRIC_PROMPT = """You are a sub-agent inside Craig Horton Advisory's learning loop.

On each process-mined workflow candidate, derive the BVF v1.0 inputs and submit them via the submit_bvf_inputs tool, with a two to three sentence senior-practitioner rationale. The orchestrator runs the deterministic BVF score function on your inputs.

Default rubric for the four pillars, 0 to 100:
- strategic_alignment: start at 20. Add 30 if named_kpi is present and concrete. Add 30 if executive_owner is named. Add 20 if function_hint is one of sales, supply, rd, cx.
- financial_return: start at (30 + 50 * automation_coverage). Subtract rework_rate * 100, exception_rate * 100, and median_cycle_time_hours / 10. Floor 5, ceiling 100.
- change_enablement: 75 if readiness is agile, 60 if traditional, 45 if siloed. Subtract the integrations count.
- governance_risk: 30 base. Add 2 per regulatory keyword. Add exception_rate * 200. Floor 0, ceiling 100.

Default inferred enums:
- ai_tier: gen1 if automation_coverage < 0.30, gen2 if < 0.65, else gen3.
- readiness: agile if rework_rate + exception_rate < 0.10, traditional if < 0.20, else siloed.

Voice rules for the rationale: sentence case, no em-dashes, no banned words (crucial, leverage, pivotal, robust, seamless), direct and no hedging, three sentences maximum."""

FIRM_MEMORY_HEADER = """
Firm calibration notes (institutional memory). Apply this judgment on top of the base rubric:
"""

EXEMPLAR_HEADER = """
Similar workflows this firm has scored before (for calibration, not to copy verbatim):
"""

SUBMIT_BVF_TOOL = {
    "name": "submit_bvf_inputs",
    "description": (
        "Submit the derived BVF v1.0 inputs and a senior-practitioner rationale "
        "for the workflow candidate. The orchestrator runs the deterministic score "
        "function on these inputs and returns the verdict."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ai_tier": {"type": "string", "enum": ["gen1", "gen2", "gen3"]},
            "readiness": {"type": "string", "enum": ["agile", "traditional", "siloed"]},
            "scores": {
                "type": "object",
                "properties": {
                    "strategic_alignment": {"type": "integer", "minimum": 0, "maximum": 100},
                    "financial_return": {"type": "integer", "minimum": 0, "maximum": 100},
                    "change_enablement": {"type": "integer", "minimum": 0, "maximum": 100},
                    "governance_risk": {"type": "integer", "minimum": 0, "maximum": 100},
                },
                "required": [
                    "strategic_alignment", "financial_return",
                    "change_enablement", "governance_risk",
                ],
            },
            "rationale": {"type": "string"},
        },
        "required": ["ai_tier", "readiness", "scores", "rationale"],
    },
}


def build_system_prompt(notes_text: str, exemplars: list[dict]) -> str:
    parts = [BASE_RUBRIC_PROMPT]
    if notes_text:
        parts.append(FIRM_MEMORY_HEADER + notes_text)
    if exemplars:
        lines = []
        for ex in exemplars:
            lines.append(
                f"- {ex['function_hint']}/{ex['industry']}: scores {json.dumps(ex['scores'])}"
            )
        parts.append(EXEMPLAR_HEADER + "\n".join(lines))
    return "\n".join(parts)


def build_user_payload(candidate: dict) -> str:
    m = candidate["metrics"]
    return json.dumps({
        "company": candidate["company"],
        "function_hint": candidate["function_hint"],
        "metrics": m,
        "integrations_count": len(candidate["integrations"]),
        "regulatory_keywords": candidate["regulatory_keywords"],
        "named_kpi": candidate["named_kpi"],
        "executive_owner": candidate["executive_owner"],
        "pace_layer": candidate["pace_layer"],
        "activities_count": len(candidate["activities"]),
    })
