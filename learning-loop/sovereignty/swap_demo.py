"""Money demo #1: the Veteran Test.

Fit the Veteran Capital artifact on base model A. Then evaluate the private evals
four ways: model A cold, model A + artifact, model B cold, model B + the SAME
artifact (held byte-for-byte fixed, and round-tripped through disk to prove it is
a portable file). If the lift survives the swap to a model the policy was never
fit on, the veteran expertise lives in the firm's artifact, not in the model. That
is firm AI sovereignty, made executable.

Usage:
    python -m sovereignty.swap_demo
"""
from __future__ import annotations
import tempfile
from pathlib import Path

from config import resolve_models
from domain.cases import load_dataset
from kb.store import KnowledgeBase
from evals.harness import evaluate_set
from capital.artifact import VeteranCapital
from sovereignty._fit import fit_artifact
from viz.hill_climb import render_bars


def main():
    models = resolve_models()
    model_a, model_b = models["primary"], models["swap"]
    train_pool, holdout = load_dataset()

    artifact = fit_artifact(train_pool, holdout, model_a)

    # Round-trip the artifact through disk: the firm layer is a portable file.
    tmp = Path(tempfile.gettempdir()) / "veteran-capital-roundtrip.json"
    artifact.save(tmp)
    artifact.validate()
    portable = VeteranCapital.load(tmp)

    # Identical, exemplar-free KB for all four runs, so the measured lift is the
    # model-external calibration policy alone, not anything model-specific.
    kb = KnowledgeBase.seeded()
    base_a = evaluate_set(holdout, model_a, kb, artifact=None)
    lift_a = evaluate_set(holdout, model_a, kb, artifact=portable)
    base_b = evaluate_set(holdout, model_b, kb, artifact=None)
    lift_b = evaluate_set(holdout, model_b, kb, artifact=portable)

    print(f"\nThe Veteran Test  (mode={models['mode']})")
    print(f"Artifact fit on:  {model_a}")
    print(f"Swapped to:       {model_b}  (policy never fit on this model)\n")
    print(f"  {model_a:>18}  cold {base_a['mean_reward']:.4f}  ->  lifted {lift_a['mean_reward']:.4f}   ({lift_a['mean_reward']-base_a['mean_reward']:+.4f})")
    print(f"  {model_b:>18}  cold {base_b['mean_reward']:.4f}  ->  lifted {lift_b['mean_reward']:.4f}   ({lift_b['mean_reward']-base_b['mean_reward']:+.4f})")

    render_bars(
        "The Veteran Test: one owned artifact lifts a model it was never fit on",
        [model_a, model_b],
        [base_a["mean_reward"], base_b["mean_reward"]],
        [lift_a["mean_reward"], lift_b["mean_reward"]],
        "veteran_test.svg",
    )

    lift_a_delta = lift_a["mean_reward"] - base_a["mean_reward"]
    lift_b_delta = lift_b["mean_reward"] - base_b["mean_reward"]
    passed = lift_a_delta > 0 and lift_b_delta > 0
    print(f"\nVeteran Test: {'PASS' if passed else 'FAIL'} "
          f"(lift survives the model swap: {lift_b_delta:+.4f} on {model_b})")
    if not passed:
        print("NOTE: lift did not survive the swap. A real, reportable result.")


if __name__ == "__main__":
    main()
