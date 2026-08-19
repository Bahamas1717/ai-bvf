"""One-call live smoke test.

Derives a single holdout case through the Claude API and prints the result, so you
can validate the live path cheaply (one request) before running the full loop or
demos against a real model. Requires ANTHROPIC_API_KEY and the `anthropic` SDK
(`pip install -e '.[agent]'`).

    python -m sovereignty.live_smoke
"""
from __future__ import annotations

from config import resolve_models, offline_mode
from domain.cases import load_dataset
from kb.store import KnowledgeBase
from agent.derive import derive_pillars
from loop.reward import evaluate


def main():
    if offline_mode():
        print("Offline: set ANTHROPIC_API_KEY (and unset AIBVF_LL_OFFLINE) to run the live smoke test.")
        return
    model = resolve_models()["primary"]
    _, holdout = load_dataset()
    case = holdout[0]
    kb = KnowledgeBase.seeded()

    print(f"Deriving {case.id} via {model} (forced tool use)...")
    derived = derive_pillars(case.candidate, model, kb)
    res = evaluate(case.candidate, derived, case)

    print(f"  derived scores: {derived['scores']}")
    print(f"  enums:          ai_tier={derived['ai_tier']} readiness={derived['readiness']}")
    print(f"  rationale:      {derived.get('rationale', '')[:200]}")
    print(f"  ruling:         {res['pred_ruling']}  (gold {res['gold_ruling']})")
    print(f"  reward:         {res['reward']:.3f}")
    print("Live path OK." if derived["scores"] else "Live path returned empty scores.")


if __name__ == "__main__":
    main()
