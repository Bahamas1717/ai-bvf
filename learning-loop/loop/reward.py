"""Business-outcome reward.

Scores a derivation against the firm's gold judgment using the deterministic BVF
engine as the spine. The dominant term is whether the final Accelerate/Fix/Stop
ruling matches gold; pillar proximity and decision-confidence proximity refine it.
This is a private eval against outcomes the firm defines, not a public benchmark.
"""
from __future__ import annotations

from _aibvf_loader import score
from config import REWARD_RULING_WEIGHT, REWARD_PILLAR_WEIGHT, REWARD_CONFIDENCE_WEIGHT
from domain.cases import PILLARS, Case


def _ruling(candidate: dict, scores: dict, ai_tier: str, readiness: str) -> dict:
    return score(
        industry=candidate["company"]["industry"],
        revenue_eur=candidate["company"]["annual_revenue_eur"],
        function=candidate["function_hint"],
        ai_tier=ai_tier,
        readiness=readiness,
        scores=scores,
    )


def evaluate(candidate: dict, derived: dict, case: Case) -> dict:
    """Return reward plus its components for one derivation."""
    pred = _ruling(candidate, derived["scores"], derived["ai_tier"], derived["readiness"])
    gold = _ruling(candidate, case.gold_scores, case.gold_ai_tier, case.gold_readiness)

    ruling_match = 1.0 if pred["classification"] == gold["classification"] else 0.0
    pillar_err = sum(abs(derived["scores"][p] - case.gold_scores[p]) for p in PILLARS) / len(PILLARS)
    conf_err = abs(pred["confidence"] - gold["confidence"])

    reward = (
        REWARD_RULING_WEIGHT * ruling_match
        + REWARD_PILLAR_WEIGHT * (1.0 - pillar_err / 100.0)
        + REWARD_CONFIDENCE_WEIGHT * (1.0 - conf_err / 100.0)
    )
    return {
        "reward": reward,
        "ruling_match": ruling_match,
        "pillar_mae": pillar_err,
        "pred_ruling": pred["classification"],
        "gold_ruling": gold["classification"],
    }
