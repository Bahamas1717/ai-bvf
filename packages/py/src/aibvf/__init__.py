"""AI BVF v1.0 — open protocol for scoring AI investments."""

from .validate import validate
from .score import score, BASE_RATES, IND_MULT, TIER_ADJ, READINESS_CAPTURE
from .taxonomy import INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS
from .schema import load_schema

BVF_VERSION = "1.0"

__all__ = [
    "validate",
    "score",
    "BASE_RATES",
    "IND_MULT",
    "TIER_ADJ",
    "READINESS_CAPTURE",
    "INDUSTRIES",
    "FUNCTIONS",
    "AI_TIERS",
    "READINESS",
    "load_schema",
    "BVF_VERSION",
]
