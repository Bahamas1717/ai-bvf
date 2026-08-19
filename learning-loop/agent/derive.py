"""The agentic derivation step.

derive_pillars(candidate, model, kb) -> a base derivation {scores, ai_tier,
readiness, rationale}. Two backends behind one interface:

  live    -- a Claude call (forced tool use), with the firm knowledge base
             injected into the prompt. Default model claude-opus-4-8.
  offline -- a deterministic pseudo-model: the published rubric plus a per-model
             perturbation, so the full loop, evals, and demos run with no API key
             and no spend. Weaker offline models carry more perturbation.

The firm's learned calibration policy is applied AFTER this step (see
loop/run_loop.py and sovereignty/*). Keeping derivation and calibration separate
is what lets the same artifact lift any base model.
"""
from __future__ import annotations
import hashlib

from config import OFFLINE_MODELS, is_offline_model
from domain.cases import base_rubric, PILLARS
from kb.store import KnowledgeBase
from agent.prompt import (
    SUBMIT_BVF_TOOL, build_system_prompt, build_user_payload,
)

_CLIENT = None


def _client():
    global _CLIENT
    if _CLIENT is None:
        from anthropic import Anthropic  # imported lazily; only needed live
        _CLIENT = Anthropic()
    return _CLIENT


def _signed(seed: str, scale: float) -> float:
    h = hashlib.sha256(seed.encode()).hexdigest()
    return (int(h[:6], 16) % 2001 - 1000) / 1000.0 * scale  # +/- scale


def _perturb(value: float, model: str, case_key: str, pillar: str, profile: dict) -> int:
    # A base model has a consistent per-pillar tendency (systematic bias) plus a
    # small per-case jitter. The systematic part dominates, so the firm's learned
    # correction transfers across models rather than fighting random noise.
    systematic = _signed(f"{model}:{pillar}", profile["bias"])
    jitter = _signed(f"{model}:{case_key}:{pillar}", profile["noise"])
    return int(round(max(0.0, min(100.0, value + systematic + jitter))))


def _offline_derive(candidate: dict, model: str) -> dict:
    base = base_rubric(candidate)
    profile = OFFLINE_MODELS[model]
    case_key = candidate["company"]["name"]
    scores = {
        p: _perturb(base["scores"][p], model, case_key, p, profile) for p in PILLARS
    }
    return {
        "scores": scores,
        "ai_tier": base["ai_tier"],
        "readiness": base["readiness"],
        "rationale": f"Offline rubric derivation ({model}).",
    }


def _live_derive(candidate: dict, model: str, kb: KnowledgeBase) -> dict:
    exemplars = kb.retrieve(candidate)
    system = build_system_prompt(kb.notes_text(), exemplars)
    resp = _create_with_retry(model, system, build_user_payload(candidate))
    if getattr(resp, "stop_reason", None) == "refusal":
        raise RuntimeError(
            f"derivation refused by safety classifier on {model} (stop_reason=refusal)"
        )
    tool_use = next((b for b in resp.content if b.type == "tool_use"), None)
    if tool_use is None:
        raise RuntimeError(f"derivation returned no tool_use block (stop_reason={resp.stop_reason})")
    args = tool_use.input
    return {
        "scores": {p: int(args["scores"][p]) for p in PILLARS},
        "ai_tier": args["ai_tier"],
        "readiness": args["readiness"],
        "rationale": args.get("rationale", ""),
    }


def _create_with_retry(model: str, system: str, user_payload: str, attempts: int = 4):
    """Forced-tool-use call with backoff on transient (rate-limit/overload) errors."""
    import time
    from anthropic import RateLimitError, InternalServerError, APIStatusError

    last = None
    for i in range(attempts):
        try:
            return _client().messages.create(
                model=model,
                max_tokens=1024,
                system=[{"type": "text", "text": system,
                         "cache_control": {"type": "ephemeral"}}],
                tools=[SUBMIT_BVF_TOOL],
                tool_choice={"type": "tool", "name": "submit_bvf_inputs"},
                messages=[{"role": "user", "content": user_payload}],
            )
        except (RateLimitError, InternalServerError) as e:
            last = e
            time.sleep(2 ** i)
        except APIStatusError as e:
            if getattr(e, "status_code", None) == 529:  # overloaded
                last = e
                time.sleep(2 ** i)
            else:
                raise
    raise RuntimeError(f"derivation failed after {attempts} attempts: {last}")


def derive_pillars(candidate: dict, model: str, kb: KnowledgeBase) -> dict:
    if is_offline_model(model):
        return _offline_derive(candidate, model)
    return _live_derive(candidate, model, kb)
