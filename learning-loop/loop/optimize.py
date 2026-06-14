"""The improvement step: fit the calibration policy and promote exemplars.

Genuine learning: the policy is a ridge-linear fit predicting the firm residual
(gold minus base) from features, refit as more real traces accumulate. Memory:
high-reward traces are promoted into the knowledge base for retrieval. Both are
real loop mechanics. Gradient SFT/RL on the base model is the documented v1.
"""
from __future__ import annotations

from capital.policy import CalibrationPolicy
from kb.store import KnowledgeBase
from domain.cases import PILLARS
from config import RIDGE_LAMBDA, EXEMPLAR_REWARD_THRESHOLD
from loop.trace import Trace


def fit_policy(traces: list[Trace]) -> CalibrationPolicy:
    if not traces:
        return CalibrationPolicy(ridge_lambda=RIDGE_LAMBDA)
    features = [t.features for t in traces]
    residuals = {
        p: [t.gold_scores[p] - t.base_scores[p] for t in traces] for p in PILLARS
    }
    return CalibrationPolicy.fit(features, residuals, RIDGE_LAMBDA)


def promote_exemplars(kb: KnowledgeBase, traces: list[Trace], candidates_by_id: dict) -> int:
    """Add high-reward traces to the knowledge base. Returns count promoted."""
    promoted = 0
    seen = {(ex.get("function_hint"), ex.get("industry"), tuple(sorted(ex["scores"].items())))
            for ex in kb.exemplars}
    for t in traces:
        if t.reward >= EXEMPLAR_REWARD_THRESHOLD:
            cand = candidates_by_id[t.case_id]
            key = (cand["function_hint"], cand["company"]["industry"],
                   tuple(sorted(t.derived_inputs["scores"].items())))
            if key not in seen:
                kb.add_exemplar(cand, t.derived_inputs["scores"], t.reward,
                                t.derived_inputs.get("rationale", ""))
                seen.add(key)
                promoted += 1
    return promoted
