"""Central configuration for the learning loop.

Model ids are bare aliases (no date suffixes). The Anthropic Claude API is the
model provider; the default is claude-opus-4-8 with adaptive thinking. A second,
cheaper tier serves as the model-swap counterpart in the sovereignty demo, and a
capability ladder drives the moat demo.

Everything runs with ANTHROPIC_API_KEY unset: the loop falls back to deterministic
offline pseudo-models, so the full hill-climb, evals, and demos are reproducible
in CI and reviewable without spend. Set AIBVF_LL_OFFLINE=1 to force offline even
when a key is present.
"""
from __future__ import annotations
import os
from pathlib import Path

# --- paths ---------------------------------------------------------------
PKG_ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = PKG_ROOT / "artifacts"
KB_SEED_PATH = PKG_ROOT / "kb" / "institutional_memory.jsonl"

# --- models --------------------------------------------------------------
# Live Claude models (bare aliases). The model id is a single config constant;
# do not hard-code it in call sites.
PRIMARY_MODEL = "claude-opus-4-8"
SWAP_MODEL = "claude-haiku-4-5"            # different base model for the Veteran Test
MOAT_LADDER = ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8"]

# Offline pseudo-models: deterministic stand-ins so every demo runs with no key.
# Each carries a (bias, noise) profile applied to the base-rubric derivation,
# simulating base models of increasing fidelity. The firm's veteran residual is
# deliberately larger than any per-model bias, so the learned layer lifts all of
# them (and the lift survives the swap).
OFFLINE_MODELS = {
    "offline-weak": {"bias": 3.0, "noise": 2.0},
    "offline-mid": {"bias": 1.5, "noise": 1.5},
    "offline-strong": {"bias": 0.5, "noise": 0.5},
}
OFFLINE_PRIMARY = "offline-strong"
OFFLINE_SWAP = "offline-weak"
OFFLINE_LADDER = ["offline-weak", "offline-mid", "offline-strong"]


def offline_mode() -> bool:
    """True when there is no API key or offline is forced."""
    if os.environ.get("AIBVF_LL_OFFLINE") == "1":
        return True
    return not os.environ.get("ANTHROPIC_API_KEY")


def resolve_models() -> dict:
    """Return the model ids to use for this run, live or offline."""
    if offline_mode():
        return {
            "primary": OFFLINE_PRIMARY,
            "swap": OFFLINE_SWAP,
            "ladder": OFFLINE_LADDER,
            "mode": "offline",
        }
    return {
        "primary": PRIMARY_MODEL,
        "swap": SWAP_MODEL,
        "ladder": MOAT_LADDER,
        "mode": "live",
    }


def is_offline_model(model: str) -> bool:
    return model in OFFLINE_MODELS


# --- dataset -------------------------------------------------------------
DATASET_SEED = 20260614
N_CASES = 96                # total synthetic firm cases
HOLDOUT_FRACTION = 0.30     # reserved for private evals, never fit on

# --- loop ----------------------------------------------------------------
N_ITERATIONS = 8            # loop iterations; training pool grows each step
N_SEEDS = 5                 # repeats for noise-robust mean curves
EXEMPLAR_REWARD_THRESHOLD = 0.85   # promote traces above this into the KB
TOP_K_EXEMPLARS = 4
RIDGE_LAMBDA = 2.0          # L2 regularisation for the calibration policy

# --- reward (business outcomes, not a public benchmark) ------------------
REWARD_RULING_WEIGHT = 0.5
REWARD_PILLAR_WEIGHT = 0.45
REWARD_CONFIDENCE_WEIGHT = 0.05

# --- brand (Craig Horton Advisory house style) ---------------------------
NAVY = "#1B3A5C"
BURNT_ORANGE = "#C47A2B"
