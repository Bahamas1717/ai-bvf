"""The learned calibration policy: the model-external core of token capital.

For each business outcome (pillar) it learns a ridge-linear map from firm
features to the RESIDUAL the firm's veterans apply on top of a base model's
derivation (gold minus base). It is fit from real rewarded traces, lives as plain
numbers (not model weights), and is applied to ANY base model's output. That is
what makes the Veteran Test honest: the learned expertise is neither in the model
nor in the prompt, it is in the firm's artifact.

This is genuine learning -- a least-squares fit with L2 regularisation on
standardised features -- not retrieval dressed up as learning. It is deliberately
transparent (you can read the weights). A gradient SFT/RL step on the base model
is the documented v1; the trace schema is already shaped to feed it.

Pure Python so the offline path needs no third-party dependency, matching the
aibvf core's stdlib-only ethos.
"""
from __future__ import annotations

from domain.cases import FEATURE_NAMES, PILLARS


def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    """Solve A x = b via Gaussian elimination with partial pivoting. n is tiny."""
    n = len(rhs)
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-12:
            continue
        a[col], a[pivot] = a[pivot], a[col]
        piv = a[col][col]
        for j in range(col, n + 1):
            a[col][j] /= piv
        for r in range(n):
            if r != col and abs(a[r][col]) > 0:
                factor = a[r][col]
                for j in range(col, n + 1):
                    a[r][j] -= factor * a[col][j]
    return [a[i][n] for i in range(n)]


def _ridge_fit(x_rows: list[list[float]], y: list[float], lam: float) -> list[float]:
    """Ridge weights for one target on already-standardised features.
    (XtX + lam*I) w = Xt y. The bias feature (index 0) is not regularised."""
    n_feat = len(x_rows[0])
    xtx = [[0.0] * n_feat for _ in range(n_feat)]
    xty = [0.0] * n_feat
    for row, target in zip(x_rows, y):
        for i in range(n_feat):
            xty[i] += row[i] * target
            ri = row[i]
            xtx_i = xtx[i]
            for j in range(n_feat):
                xtx_i[j] += ri * row[j]
    for i in range(n_feat):
        if i != 0:
            xtx[i][i] += lam
    return _solve(xtx, xty)


def _standardise_stats(rows: list[list[float]]) -> tuple[list[float], list[float]]:
    """Per-column mean/std. Column 0 (bias) is left as identity (mean 0, std 1)."""
    n_feat = len(rows[0])
    n = len(rows)
    mean = [0.0] * n_feat
    std = [1.0] * n_feat
    for j in range(1, n_feat):
        col = [r[j] for r in rows]
        mu = sum(col) / n
        var = sum((v - mu) ** 2 for v in col) / n
        mean[j] = mu
        std[j] = (var ** 0.5) or 1.0
    return mean, std


def _apply_standardise(vec: list[float], mean: list[float], std: list[float]) -> list[float]:
    return [vec[0]] + [(vec[j] - mean[j]) / std[j] for j in range(1, len(vec))]


class CalibrationPolicy:
    """Per-pillar residual model on standardised features. weights[pillar] and the
    shared (mean, std) align to FEATURE_NAMES."""

    def __init__(self, weights=None, mean=None, std=None, ridge_lambda: float = 5.0):
        n = len(FEATURE_NAMES)
        self.ridge_lambda = ridge_lambda
        self.mean = mean or [0.0] * n
        self.std = std or [1.0] * n
        self.weights: dict[str, list[float]] = weights or {p: [0.0] * n for p in PILLARS}

    @classmethod
    def fit(cls, features: list[list[float]], residuals: dict[str, list[float]], ridge_lambda: float):
        if not features:
            return cls(ridge_lambda=ridge_lambda)
        mean, std = _standardise_stats(features)
        x_std = [_apply_standardise(row, mean, std) for row in features]
        weights = {}
        for p in PILLARS:
            if any(abs(v) > 1e-9 for v in residuals[p]):
                weights[p] = _ridge_fit(x_std, residuals[p], ridge_lambda)
            else:
                weights[p] = [0.0] * len(FEATURE_NAMES)
        return cls(weights=weights, mean=mean, std=std, ridge_lambda=ridge_lambda)

    def predict(self, feature_vec: list[float]) -> dict[str, float]:
        x = _apply_standardise(feature_vec, self.mean, self.std)
        return {p: sum(wi * fi for wi, fi in zip(self.weights[p], x)) for p in PILLARS}

    def apply(self, base_scores: dict, feature_vec: list[float]) -> dict:
        adj = self.predict(feature_vec)
        return {p: int(round(max(0.0, min(100.0, base_scores[p] + adj[p])))) for p in PILLARS}

    def to_dict(self) -> dict:
        return {
            "kind": "ridge_linear",
            "ridge_lambda": self.ridge_lambda,
            "feature_names": FEATURE_NAMES,
            "feature_mean": [round(m, 6) for m in self.mean],
            "feature_std": [round(s, 6) for s in self.std],
            "weights": {p: [round(w, 6) for w in self.weights[p]] for p in PILLARS},
        }

    @classmethod
    def from_dict(cls, d: dict):
        return cls(
            weights={p: list(v) for p, v in d["weights"].items()},
            mean=list(d.get("feature_mean", [])) or None,
            std=list(d.get("feature_std", [])) or None,
            ridge_lambda=d.get("ridge_lambda", 5.0),
        )
