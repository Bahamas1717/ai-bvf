"""Hand-rolled validator for AI BVF v1.0 portfolios. Zero dependencies."""
from __future__ import annotations
import re
from typing import Any

from .taxonomy import INDUSTRIES, FUNCTIONS, AI_TIERS

_PILLARS = ("strategic_alignment", "financial_return", "change_enablement", "governance_risk")
_BUCKETS = ("Agent-Proof", "Agent-Augmented", "Agent-Replaceable")
_CLASSIFICATIONS = ("Accelerate", "Fix", "Stop")
_COMPLIANCE = ("eu_ai_act", "dora", "csrd", "gdpr_ai")
_ID_RE = re.compile(r"^[a-z0-9-]{1,64}$")


def validate(doc: Any) -> dict:
    """Validate a portfolio document against AI BVF v1.0.

    Returns { "valid": bool, "errors": [{"path": str, "msg": str}, ...] }.
    """
    errors: list[dict] = []

    def push(path: str, msg: str) -> None:
        errors.append({"path": path, "msg": msg})

    if not isinstance(doc, dict):
        return {"valid": False, "errors": [{"path": "", "msg": "Document must be a JSON object."}]}

    if doc.get("bvf_version") != "1.0":
        push("bvf_version", 'Required. Must be the string "1.0".')

    org = doc.get("organization")
    if not isinstance(org, dict):
        push("organization", "Required object.")
    else:
        if not isinstance(org.get("name"), str) or not org["name"]:
            push("organization.name", "Required string.")
        if org.get("industry") not in INDUSTRIES:
            push("organization.industry", f"Must be one of: {', '.join(INDUSTRIES)}.")
        if "revenue_eur" in org and (not isinstance(org["revenue_eur"], (int, float)) or org["revenue_eur"] < 0):
            push("organization.revenue_eur", "Must be a non-negative number.")

    inits = doc.get("initiatives")
    if not isinstance(inits, list) or not inits:
        push("initiatives", "Required. Must be a non-empty array.")
    else:
        for i, init in enumerate(inits):
            base = f"initiatives[{i}]"
            if not isinstance(init, dict):
                push(base, "Must be an object.")
                continue
            iid = init.get("id")
            if not isinstance(iid, str) or not _ID_RE.match(iid):
                push(f"{base}.id", "Required. Lowercase letters, digits, hyphens only (max 64).")
            name = init.get("name")
            if not isinstance(name, str) or not name:
                push(f"{base}.name", "Required string.")
            elif len(name) > 240:
                push(f"{base}.name", "Exceeds 240 characters.")
            if init.get("function") not in FUNCTIONS:
                push(f"{base}.function", f"Must be one of: {', '.join(FUNCTIONS)}.")
            if init.get("ai_tier") not in AI_TIERS:
                push(f"{base}.ai_tier", f"Must be one of: {', '.join(AI_TIERS)}.")
            if "bucket" in init and init["bucket"] not in _BUCKETS:
                push(f"{base}.bucket", f"Must be one of: {', '.join(_BUCKETS)}.")

            scores = init.get("scores")
            if not isinstance(scores, dict):
                push(f"{base}.scores", "Required object with all four pillar scores.")
            else:
                for p in _PILLARS:
                    ps = scores.get(p)
                    if not isinstance(ps, dict):
                        push(f"{base}.scores.{p}", "Required pillar score object.")
                        continue
                    v = ps.get("value")
                    if not isinstance(v, (int, float)) or v < 0 or v > 100:
                        push(f"{base}.scores.{p}.value", "Required. Number in [0, 100].")
                    if "confidence" in ps:
                        c = ps["confidence"]
                        if not isinstance(c, (int, float)) or c < 0 or c > 100:
                            push(f"{base}.scores.{p}.confidence", "Optional. Number in [0, 100].")

            if "classification" in init and init["classification"] not in _CLASSIFICATIONS:
                push(f"{base}.classification", f"Must be one of: {', '.join(_CLASSIFICATIONS)}.")
            if "decision_confidence" in init:
                v = init["decision_confidence"]
                if not isinstance(v, (int, float)) or v < 0 or v > 100:
                    push(f"{base}.decision_confidence", "Must be a number in [0, 100].")
            if "compliance" in init:
                if not isinstance(init["compliance"], list):
                    push(f"{base}.compliance", "Must be an array.")
                else:
                    for j, c in enumerate(init["compliance"]):
                        if c not in _COMPLIANCE:
                            push(f"{base}.compliance[{j}]", f"Must be one of: {', '.join(_COMPLIANCE)}.")

    return {"valid": not errors, "errors": errors}
