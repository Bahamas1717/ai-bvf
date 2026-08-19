"""The hill-climbing machine.

Each iteration the loop experiences more of the firm's work: it derives pillars,
scores them against gold, captures traces, refits the calibration policy, promotes
high-reward exemplars into the knowledge base, then re-runs the PRIVATE evals on a
held-out set. As real traces accumulate, the firm-specific calibration sharpens and
the private-eval score climbs. That rising curve is token capital compounding.

Iteration 0 is the cold baseline (no firm layer). Runs are repeated over several
seeds and averaged so the curve is robust to ordering noise (and, in live mode, to
model sampling). Everything runs offline with no API key.

Usage:
    python -m loop.run_loop          # from the learning-loop/ directory
"""
from __future__ import annotations
import json

from config import (
    N_ITERATIONS, N_SEEDS, ARTIFACTS_DIR, resolve_models,
)
from domain.cases import load_dataset, featurize
from kb.store import KnowledgeBase
from agent.derive import derive_pillars
from loop.reward import evaluate as reward_evaluate
from loop.trace import Trace
from loop.optimize import fit_policy, promote_exemplars
from evals.harness import evaluate_set
from capital.artifact import VeteranCapital
import random


def _derivation_cache(model: str):
    cache: dict = {}

    def derive(case, kb):
        key = (model, case.id)
        if key not in cache:
            cache[key] = derive_pillars(case.candidate, model, kb)
        return cache[key]

    return derive


def run_single(seed: int, train_pool, holdout, model: str):
    rng = random.Random(seed)
    order = train_pool[:]
    rng.shuffle(order)
    candidates_by_id = {c.id: c.candidate for c in train_pool}

    kb = KnowledgeBase.seeded()
    derive = _derivation_cache(model)

    # Iteration 0: cold baseline, no firm layer.
    cold = evaluate_set(holdout, model, kb, artifact=None)
    reward_history = [cold["mean_reward"]]

    chunk = max(1, len(order) // N_ITERATIONS)
    final_artifact = None
    for it in range(1, N_ITERATIONS + 1):
        pool = order[: min(it * chunk, len(order))]
        traces = []
        for case in pool:
            base = derive(case, kb)
            res = reward_evaluate(case.candidate, base, case)
            traces.append(Trace(
                case_id=case.id,
                model=model,
                features=featurize(case.candidate),
                base_scores=base["scores"],
                gold_scores=case.gold_scores,
                derived_inputs=base,
                reward=res["reward"],
                kb_context_ids=[n["id"] for n in kb.notes],
            ))
        policy = fit_policy(traces)
        promote_exemplars(kb, traces, candidates_by_id)
        artifact = VeteranCapital(
            firm={"name": "Craig Horton Advisory (demo)",
                  "domain": "bvf-pillar-derivation",
                  "base_model_fit_on": model},
            policy=policy, kb=kb, holdout_case_ids=[c.id for c in holdout],
            reward_history=reward_history, train_case_count=len(pool),
        )
        lifted = evaluate_set(holdout, model, kb, artifact=artifact)
        reward_history.append(lifted["mean_reward"])
        final_artifact = artifact

    final_artifact.reward_history = reward_history
    return reward_history, final_artifact, traces


def main():
    models = resolve_models()
    model = models["primary"]
    train_pool, holdout = load_dataset()

    curves = []
    last_artifact, last_traces = None, None
    for seed in range(N_SEEDS):
        history, artifact, traces = run_single(seed, train_pool, holdout, model)
        curves.append(history)
        last_artifact, last_traces = artifact, traces

    # Mean curve over seeds.
    n_points = len(curves[0])
    mean_curve = [sum(c[i] for c in curves) / len(curves) for i in range(n_points)]
    last_artifact.reward_history = mean_curve  # persist the averaged hill-climb

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    # 1) the Veteran Capital artifact (the owned, portable file)
    art_path = last_artifact.save(ARTIFACTS_DIR / "veteran-capital.json")
    last_artifact.validate()
    # 2) the hill-climb curve
    (ARTIFACTS_DIR / "hill_climb.json").write_text(json.dumps({
        "mode": models["mode"], "model": model,
        "iterations": list(range(n_points)), "mean_reward": mean_curve,
        "seeds": curves,
    }, indent=2))
    # 3) fine-tune-ready trace export (proves the v1 path is wired)
    candidates_by_id = {c.id: c.candidate for c in train_pool}
    with open(ARTIFACTS_DIR / "traces.finetune.jsonl", "w") as f:
        for t in last_traces:
            f.write(json.dumps(t.to_finetune_record(candidates_by_id[t.case_id])) + "\n")

    # Render the curve.
    from viz.hill_climb import render_hill_climb
    render_hill_climb(mean_curve, models["mode"], model)

    lift = mean_curve[-1] - mean_curve[0]
    print(f"\nMode: {models['mode']}   base model: {model}")
    print(f"Cold private-eval reward:   {mean_curve[0]:.4f}")
    print(f"Lifted private-eval reward: {mean_curve[-1]:.4f}")
    print(f"Hill-climb lift:            {lift:+.4f}  over {N_ITERATIONS} iterations, {N_SEEDS} seeds")
    print(f"Veteran Capital artifact:   {art_path}")
    if lift <= 0:
        print("NOTE: flat or negative curve. That is a real, reportable result, not a bug.")


if __name__ == "__main__":
    main()
