"""Money demo #2: the moat / commoditisation test.

Proves the economic thesis, not just the mechanic. One Veteran Capital artifact is
applied across a ladder of increasingly capable base models. The essay's claim --
value accrues to firms that own the loop, not to whoever has the best model --
holds only if the firm's advantage does NOT collapse as base models improve. If
better generalist models simply ride on top of the veteran layer rather than
erasing it, the firm's edge is a durable moat.

Usage:
    python -m sovereignty.moat_demo
"""
from __future__ import annotations

from config import resolve_models
from domain.cases import load_dataset
from kb.store import KnowledgeBase
from evals.harness import evaluate_set
from sovereignty._fit import fit_artifact
from viz.hill_climb import render_bars


def main():
    models = resolve_models()
    ladder = models["ladder"]
    train_pool, holdout = load_dataset()

    # One owned artifact, fit once on the strongest rung, applied across all rungs.
    artifact = fit_artifact(train_pool, holdout, ladder[-1])
    kb = KnowledgeBase.seeded()

    cold_vals, lifted_vals, advantages = [], [], []
    print(f"\nThe moat test  (mode={models['mode']})")
    print("base model capability increases left to right; one fixed firm artifact\n")
    for model in ladder:
        cold = evaluate_set(holdout, model, kb, artifact=None)["mean_reward"]
        lifted = evaluate_set(holdout, model, kb, artifact=artifact)["mean_reward"]
        cold_vals.append(cold)
        lifted_vals.append(lifted)
        advantages.append(lifted - cold)
        print(f"  {model:>18}  cold {cold:.4f}  ->  lifted {lifted:.4f}   advantage {lifted-cold:+.4f}")

    render_bars(
        "The moat: firm advantage persists as base models commoditise",
        ladder, cold_vals, lifted_vals, "moat.svg",
    )

    persists = all(a > 0 for a in advantages)
    # "Does not collapse": the advantage at the strongest rung is still a
    # meaningful fraction of the advantage at the weakest.
    not_collapsed = advantages[-1] >= 0.4 * max(advantages)
    print(f"\nAdvantage at weakest base: {advantages[0]:+.4f}")
    print(f"Advantage at strongest base: {advantages[-1]:+.4f}")
    print(f"Moat test: {'PASS' if (persists and not_collapsed) else 'REVIEW'} "
          f"(advantage stays positive across the ladder: {persists}; "
          f"does not collapse at the strong end: {not_collapsed})")
    if not (persists and not_collapsed):
        print("NOTE: advantage collapsed as base models improved. A real, reportable result.")


if __name__ == "__main__":
    main()
