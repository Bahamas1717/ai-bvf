"""Shared helper: fit a Veteran Capital artifact on one base model's traces."""
from __future__ import annotations

from domain.cases import featurize
from kb.store import KnowledgeBase
from agent.derive import derive_pillars
from loop.reward import evaluate as reward_evaluate
from loop.trace import Trace
from loop.optimize import fit_policy, promote_exemplars
from capital.artifact import VeteranCapital


def fit_artifact(train_pool, holdout, model: str) -> VeteranCapital:
    """Derive every training case once with `model`, fit the calibration policy on
    the firm residual, promote exemplars, and return the portable artifact."""
    kb = KnowledgeBase.seeded()
    candidates_by_id = {c.id: c.candidate for c in train_pool}
    traces = []
    for case in train_pool:
        base = derive_pillars(case.candidate, model, kb)
        res = reward_evaluate(case.candidate, base, case)
        traces.append(Trace(
            case_id=case.id, model=model, features=featurize(case.candidate),
            base_scores=base["scores"], gold_scores=case.gold_scores,
            derived_inputs=base, reward=res["reward"],
            kb_context_ids=[n["id"] for n in kb.notes],
        ))
    policy = fit_policy(traces)
    promote_exemplars(kb, traces, candidates_by_id)
    return VeteranCapital(
        firm={"name": "Craig Horton Advisory (demo)",
              "domain": "bvf-pillar-derivation", "base_model_fit_on": model},
        policy=policy, kb=kb, holdout_case_ids=[c.id for c in holdout],
        reward_history=[], train_case_count=len(train_pool),
    )
