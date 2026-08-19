"""Trace capture in a fine-tune-ready schema.

Every derivation in the loop produces a Trace: the messages that would train a
model, the derived inputs, the reward, the base model used, and the knowledge-base
context ids that informed it. v0's improvement step is the learned calibration
policy (capital/policy.py); this schema is shaped so a real SFT/RL step can consume
the same traces unchanged. That is the documented v1 boundary.
"""
from __future__ import annotations
import json
from dataclasses import dataclass, asdict, field

from agent.prompt import build_user_payload


@dataclass
class Trace:
    case_id: str
    model: str
    features: list  # firm feature vector, aligned to FEATURE_NAMES
    base_scores: dict
    gold_scores: dict
    derived_inputs: dict  # {scores, ai_tier, readiness, rationale}
    reward: float
    kb_context_ids: list = field(default_factory=list)

    def to_finetune_record(self, candidate: dict) -> dict:
        """A messages-shaped record a future SFT/RL step can consume directly."""
        return {
            "messages": [
                {"role": "user", "content": build_user_payload(candidate)},
                {"role": "assistant", "content": json.dumps(self.derived_inputs)},
            ],
            "derived_inputs": self.derived_inputs,
            "reward": round(self.reward, 4),
            "model": self.model,
            "kb_context_ids": self.kb_context_ids,
        }

    def to_dict(self) -> dict:
        return asdict(self)
