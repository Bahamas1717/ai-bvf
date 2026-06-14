"""The Veteran Capital artifact: the firm's sovereignty object.

One portable, model-agnostic file (validated against
spec/veteran-capital.schema.json) bundling:
  - institutional_memory (the knowledge base),
  - calibration_policy (the learned, model-external adjustment layer),
  - eval_suite (the private evals: reward spec + holdout ids),
  - provenance (the compounding record: reward per iteration).

apply() lifts ANY base model's derivation by adding the learned calibration on
top. Hand this file to a different base model and the firm-veteran expertise
comes with it. That is the Veteran Test made literal.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

from capital.policy import CalibrationPolicy
from kb.store import KnowledgeBase
from domain.cases import featurize, PILLARS
from config import (
    REWARD_RULING_WEIGHT, REWARD_PILLAR_WEIGHT, REWARD_CONFIDENCE_WEIGHT,
)

PROTOCOL_VERSION = "0.1"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_PATH = REPO_ROOT / "spec" / "veteran-capital.schema.json"


class VeteranCapital:
    def __init__(
        self,
        firm: dict,
        policy: CalibrationPolicy,
        kb: KnowledgeBase,
        holdout_case_ids: list[str],
        reward_history: list[float] | None = None,
        train_case_count: int = 0,
        created_at: str | None = None,
    ):
        self.firm = firm
        self.policy = policy
        self.kb = kb
        self.holdout_case_ids = holdout_case_ids
        self.reward_history = reward_history or []
        self.train_case_count = train_case_count
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()

    # -- applying the veteran on top of any base model --------------------
    def apply(self, candidate: dict, base_derived: dict) -> dict:
        adjusted = self.policy.apply(base_derived["scores"], featurize(candidate))
        return {
            "scores": adjusted,
            "ai_tier": base_derived["ai_tier"],
            "readiness": base_derived["readiness"],
            "rationale": base_derived.get("rationale", ""),
        }

    # -- serialisation ----------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "protocol_version": PROTOCOL_VERSION,
            "firm": self.firm,
            "institutional_memory": self.kb.to_dict(),
            "calibration_policy": self.policy.to_dict(),
            "eval_suite": {
                "reward_spec": {
                    "ruling_match_weight": REWARD_RULING_WEIGHT,
                    "pillar_proximity_weight": REWARD_PILLAR_WEIGHT,
                    "confidence_proximity_weight": REWARD_CONFIDENCE_WEIGHT,
                },
                "holdout_case_ids": self.holdout_case_ids,
            },
            "provenance": {
                "created_at": self.created_at,
                "iterations": len(self.reward_history),
                "train_case_count": self.train_case_count,
                "reward_history": [round(r, 4) for r in self.reward_history],
            },
        }

    def save(self, path: str | Path) -> Path:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2))
        return path

    @classmethod
    def from_dict(cls, d: dict) -> "VeteranCapital":
        return cls(
            firm=d["firm"],
            policy=CalibrationPolicy.from_dict(d["calibration_policy"]),
            kb=KnowledgeBase.from_dict(d.get("institutional_memory", {})),
            holdout_case_ids=d["eval_suite"]["holdout_case_ids"],
            reward_history=d["provenance"].get("reward_history", []),
            train_case_count=d["provenance"].get("train_case_count", 0),
            created_at=d["provenance"].get("created_at"),
        )

    @classmethod
    def load(cls, path: str | Path) -> "VeteranCapital":
        return cls.from_dict(json.loads(Path(path).read_text()))

    def validate(self) -> bool:
        """Validate against the protocol schema if jsonschema is installed;
        otherwise run a minimal structural check. Returns True or raises."""
        d = self.to_dict()
        try:
            import jsonschema  # optional
            schema = json.loads(SCHEMA_PATH.read_text())
            jsonschema.validate(d, schema)
            return True
        except ImportError:
            required = ["protocol_version", "firm", "calibration_policy", "eval_suite", "provenance"]
            missing = [k for k in required if k not in d]
            if missing:
                raise ValueError(f"artifact missing required keys: {missing}")
            if set(d["calibration_policy"]["weights"]) != set(PILLARS):
                raise ValueError("calibration_policy weights must cover all pillars")
            return True
