"""Private eval harness.

Runs the agent over a set of cases and scores each derivation against the firm's
gold judgment. Pass an artifact to apply the firm's Veteran Capital layer on top
of the base derivation; pass None for the cold baseline. The holdout set is never
used to fit the policy, so a rising score across iterations cannot be the curve
cheating.
"""
from __future__ import annotations

from agent.derive import derive_pillars
from loop.reward import evaluate as reward_evaluate
from kb.store import KnowledgeBase
from domain.cases import Case


def evaluate_set(cases: list[Case], model: str, kb: KnowledgeBase, artifact=None) -> dict:
    rewards, ruling_hits, pillar_maes = [], 0, []
    for case in cases:
        base = derive_pillars(case.candidate, model, kb)
        derived = artifact.apply(case.candidate, base) if artifact is not None else base
        res = reward_evaluate(case.candidate, derived, case)
        rewards.append(res["reward"])
        ruling_hits += int(res["ruling_match"])
        pillar_maes.append(res["pillar_mae"])
    n = len(cases)
    return {
        "mean_reward": sum(rewards) / n,
        "ruling_accuracy": ruling_hits / n,
        "mean_pillar_mae": sum(pillar_maes) / n,
        "n": n,
    }
