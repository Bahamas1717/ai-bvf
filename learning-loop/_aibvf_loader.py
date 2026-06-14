"""Loads the canonical aibvf scoring engine directly from the repo source.

Mirrors examples/workflow-coroner/_aibvf_loader.py: loading score.py by file
path uses the canonical source in this repo and avoids depending on a possibly
stale installed package. The learning loop treats this engine as a read-only,
deterministic judge. It never imports it as a dependency, which keeps the BVF
package's "no LLM, no ML in the scoring path" boundary intact.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCORE_PATH = REPO_ROOT / "packages" / "py" / "src" / "aibvf" / "score.py"

if not SCORE_PATH.exists():
    raise ImportError(f"aibvf source not found at {SCORE_PATH}")

_spec = importlib.util.spec_from_file_location("_aibvf_score_local", SCORE_PATH)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

score = _module.score
recommend_improvements = _module.recommend_improvements
calculate_pace_layer_drag = _module.calculate_pace_layer_drag
