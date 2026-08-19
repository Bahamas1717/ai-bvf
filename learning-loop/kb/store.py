"""Knowledge base: the firm's institutional memory, made queryable.

Two record kinds:
  notes     -- durable firm rules, human-authored or distilled. Seeded from the
               existing BVF rubric's senior-practitioner guidance.
  exemplars -- high-reward past traces promoted by the learning loop. Retrieved
               as in-context guidance for similar new cases.

Retrieval is explicit feature similarity over candidate signals (top-K). This is
real loop mechanics: the KB is read on every derivation and written to after every
scored iteration. Embedding/vector retrieval is the documented swap-in behind this
same interface (see README "real vs stubbed").
"""
from __future__ import annotations
import json
from pathlib import Path

from config import KB_SEED_PATH, TOP_K_EXEMPLARS
from domain.cases import featurize

# Feature dimensions used for similarity (skip the bias term at index 0).
_SIM_WEIGHTS = [0.0, 2.0, 3.0, 3.0, 1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0]


class KnowledgeBase:
    def __init__(self, notes: list[dict] | None = None, exemplars: list[dict] | None = None):
        self.notes = notes or []
        self.exemplars = exemplars or []

    @classmethod
    def seeded(cls) -> "KnowledgeBase":
        notes = []
        path = Path(KB_SEED_PATH)
        if path.exists():
            for line in path.read_text().splitlines():
                line = line.strip()
                if line:
                    notes.append(json.loads(line))
        return cls(notes=notes, exemplars=[])

    def add_exemplar(self, candidate: dict, derived_scores: dict, reward: float, rationale: str = "") -> None:
        self.exemplars.append({
            "features": featurize(candidate),
            "function_hint": candidate["function_hint"],
            "industry": candidate["company"]["industry"],
            "scores": derived_scores,
            "reward": round(reward, 4),
            "rationale": rationale,
        })

    def retrieve(self, candidate: dict, k: int = TOP_K_EXEMPLARS) -> list[dict]:
        """Top-K exemplars by weighted feature distance to the candidate."""
        if not self.exemplars:
            return []
        target = featurize(candidate)

        def dist(ex: dict) -> float:
            return sum(
                w * (a - b) ** 2
                for w, a, b in zip(_SIM_WEIGHTS, target, ex["features"])
            )

        return sorted(self.exemplars, key=dist)[:k]

    def notes_text(self) -> str:
        return "\n".join(f"- {n['text']}" for n in self.notes)

    def to_dict(self) -> dict:
        return {"notes": self.notes, "exemplars": self.exemplars}

    @classmethod
    def from_dict(cls, d: dict) -> "KnowledgeBase":
        return cls(notes=d.get("notes", []), exemplars=d.get("exemplars", []))
