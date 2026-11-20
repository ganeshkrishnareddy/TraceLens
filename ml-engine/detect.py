"""
Anomaly detectors for TraceLens.

Two independent approaches:
1. IsolationForest (scikit-learn) - tree-based isolation.
2. Robust statistical baseline using Median Absolute Deviation (MAD).

Both return anomaly scores in [0,1] (higher = more anomalous) and binary flags
based on a configurable threshold.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

import explain as ex
from features import FEATURES


@dataclass
class DetectionResult:
    method: str
    scores: np.ndarray          # anomaly score 0..1 (higher = more anomalous)
    flags: np.ndarray          # 0 normal, 1 anomaly
    threshold: float
    params: dict = field(default_factory=dict)


class IsolationForestDetector:
    def __init__(self, contamination: float = 0.1, n_estimators: int = 200,
                 random_state: int = 20261120):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None

    def fit(self, X: np.ndarray) -> "IsolationForestDetector":
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=1,
        )
        self.model.fit(X)
        return self

    def score(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        # decision_function: higher = more normal; convert to 0..1 anomaly score
        raw = -self.model.decision_function(X)  # higher = more anomalous
        # min-max normalize to [0,1]
        mn, mx = raw.min(), raw.max()
        if mx - mn < 1e-12:
            return np.zeros_like(raw)
        return (raw - mn) / (mx - mn)

    def detect(self, X: np.ndarray, threshold: float = 0.5) -> DetectionResult:
        sc = self.score(X)
        flags = (sc >= threshold).astype(int)
        return DetectionResult(
            method="isolation_forest",
            scores=sc,
            flags=flags,
            threshold=threshold,
            params={"contamination": self.contamination,
                    "n_estimators": self.n_estimators},
        )


class StatisticalDetector:
    """Robust baseline using per-feature median + MAD.

    A point is anomalous if, across features, enough features exceed
    `z_threshold` robust z-scores (MAD-based). Score = fraction of features
    that are extreme, blended with max robust z.
    """
    def __init__(self, z_threshold: float = 3.5):
        self.z_threshold = z_threshold
        self.medians_: Optional[np.ndarray] = None
        self.mads_: Optional[np.ndarray] = None

    def fit(self, X: np.ndarray) -> "StatisticalDetector":
        self.medians_ = np.median(X, axis=0)
        mad = np.median(np.abs(X - self.medians_), axis=0)
        # 1.4826 consistency constant for normal
        self.mads_ = 1.4826 * mad
        self.mads_[self.mads_ < 1e-9] = 1e-9
        return self

    def robust_z(self, X: np.ndarray) -> np.ndarray:
        if self.medians_ is None or self.mads_ is None:
            raise RuntimeError("Detector not fitted.")
        return np.abs(X - self.medians_) / self.mads_

    def score(self, X: np.ndarray) -> np.ndarray:
        rz = self.robust_z(X)
        # fraction of features exceeding threshold, plus magnitude blend
        extreme = (rz >= self.z_threshold).astype(float)
        frac = extreme.mean(axis=1)
        maxz = rz.max(axis=1)
        # normalize maxz contribution
        mz_norm = np.clip(maxz / (self.z_threshold * 2), 0, 1)
        sc = 0.6 * frac + 0.4 * mz_norm
        return np.clip(sc, 0, 1)

    def detect(self, X: np.ndarray, threshold: float = 0.3) -> DetectionResult:
        sc = self.score(X)
        flags = (sc >= threshold).astype(int)
        return DetectionResult(
            method="statistical_mad",
            scores=sc,
            flags=flags,
            threshold=threshold,
            params={"z_threshold": self.z_threshold},
        )


DETECTORS = {
    "isolation_forest": IsolationForestDetector,
    "statistical_mad": StatisticalDetector,
}


def get_detector(name: str, **kwargs):
    if name not in DETECTORS:
        raise ValueError(f"Unknown detector: {name}. Available: {list(DETECTORS)}")
    return DETECTORS[name](**kwargs)


# ---------------------------------------------------------------------------
# Reproducible pipeline: saved model bundle -> scores, flags, explanations
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = ROOT / "models" / "tracelens_model.joblib"
DEFAULT_INPUT = ROOT / "datasets" / "synthetic" / "test.csv"
DEFAULT_OUT_CSV = ROOT / "datasets" / "processed" / "detections.csv"
DEFAULT_OUT_JSON = ROOT / "datasets" / "processed" / "detections.json"


def prepare_matrix(df: pd.DataFrame, artifact: dict) -> tuple[np.ndarray, np.ndarray]:
    """Impute with training medians, scale with the training-fitted scaler.

    Returns (raw_imputed_matrix, scaled_matrix). All transforms come from the
    saved artifact, so scoring a new window never refits on that window.
    """
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    numeric = df[FEATURES].apply(pd.to_numeric, errors="coerce")
    numeric = numeric.fillna(pd.Series(artifact["impute_values"]))
    x_raw = numeric.to_numpy(dtype=float)
    x_scaled = artifact["scaler"].transform(x_raw)
    return x_raw, x_scaled


def score_matrix(x_scaled: np.ndarray, artifact: dict, method: str) -> np.ndarray:
    """Batch-independent anomaly score in [0, 1]; higher means more anomalous.

    Isolation Forest:  clip(0.5 - decision_function, 0, 1).
    Statistical MAD/IQR: blend of MAD robust-z extremes, max-z magnitude and
    the fraction of feature values outside the IQR fences.
    """
    x_scaled = np.asarray(x_scaled, dtype=float)
    if method == "isolation_forest":
        model = artifact["isolation_forest"]["model"]
        decision = np.asarray(model.decision_function(x_scaled), dtype=float)
        return np.clip(0.5 - decision, 0.0, 1.0)

    if method in {"statistical_mad", "statistical_iqr", "statistical"}:
        stats = artifact["statistical"]
        med = np.array([stats["median"][f] for f in FEATURES], dtype=float)
        mad = np.array([stats["mad"][f] for f in FEATURES], dtype=float)
        q1 = np.array([stats["q1"][f] for f in FEATURES], dtype=float)
        q3 = np.array([stats["q3"][f] for f in FEATURES], dtype=float)
        z = np.abs(x_scaled - med) / mad
        iqr = q3 - q1
        k = float(stats["iqr_multiplier"])
        outside = (x_scaled < q1 - k * iqr) | (x_scaled > q3 + k * iqr)
        z_thr = float(stats["z_threshold"])
        frac_z = (z >= z_thr).mean(axis=1)
        max_z = np.clip(z.max(axis=1) / (2 * z_thr), 0.0, 1.0)
        frac_iqr = outside.mean(axis=1)
        return np.clip(0.5 * frac_z + 0.25 * max_z + 0.25 * frac_iqr, 0.0, 1.0)

    raise ValueError(f"Unknown scoring method: {method}")


def default_threshold(artifact: dict, method: str) -> float:
    if method == "isolation_forest":
        return float(artifact["isolation_forest"]["threshold"])
    return float(artifact["statistical"]["threshold"])


def score_dataframe(df: pd.DataFrame, artifact: dict, method: str,
                    threshold: float | None = None) -> tuple[np.ndarray, np.ndarray, float]:
    """Score and flag every row of a telemetry window with one method."""
    _, x_scaled = prepare_matrix(df, artifact)
    scores = score_matrix(x_scaled, artifact, method)
    thr = default_threshold(artifact, method) if threshold is None else float(threshold)
    flags = (scores >= thr).astype(int)
    return scores, flags, thr


def run_detection(df: pd.DataFrame, artifact: dict,
                  methods: list[str] | None = None,
                  thresholds: dict[str, float] | None = None) -> dict:
    """Score, flag and explain a window; return a JSON-serialisable report."""
    methods = methods or ["isolation_forest", "statistical_mad"]
    thresholds = thresholds or {}
    _, x_scaled = prepare_matrix(df, artifact)
    baseline = artifact["baseline"]

    per_method: dict[str, dict] = {}
    for method in methods:
        scores = score_matrix(x_scaled, artifact, method)
        thr = thresholds.get(method, default_threshold(artifact, method))
        flags = (scores >= thr).astype(int)
        per_method[method] = {
            "threshold": float(thr),
            "scores": [float(s) for s in scores],
            "flags": [int(f) for f in flags],
            "n_flagged": int(flags.sum()),
        }

    primary = methods[0]
    p = per_method[primary]
    record_ids = (
        df["record_id"].astype(str).tolist()
        if "record_id" in df.columns else [str(i) for i in range(len(df))]
    )
    labels = df["label"].tolist() if "label" in df.columns else [None] * len(df)

    rows = []
    for i, record_id in enumerate(record_ids):
        record = df.iloc[i]
        score = p["scores"][i]
        flag = p["flags"][i]
        affected: list[str] = []
        deviations: list[dict] = []
        explanation = None
        if flag == 1:
            deviations = ex.feature_deviation(record, baseline)
            affected = ex.identify_affected_features(deviations)
            explanation = ex.build_explanation(
                record.to_dict(), score, primary, p["threshold"], baseline, affected
            )
        row = {
            "record_id": record_id,
            "score": score,
            "flag": flag,
            "true_label": int(labels[i]) if labels[i] is not None and pd.notna(labels[i]) else None,
            "affected_features": affected,
        }
        for method in methods[1:]:
            row[f"score_{method}"] = per_method[method]["scores"][i]
            row[f"flag_{method}"] = per_method[method]["flags"][i]
        if explanation is not None:
            row["severity"] = explanation["severity"]
            row["narrative"] = explanation["narrative"]
            row["explanation"] = explanation
            row["deviations"] = deviations
        rows.append(row)

    return {
        "model": str(artifact.get("model_path", "")),
        "seed": artifact.get("seed"),
        "n_rows": len(df),
        "methods": methods,
        "per_method": per_method,
        "n_flagged": p["n_flagged"],
        "rows": rows,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score telemetry with a saved TraceLens model")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--out-csv", type=Path, default=DEFAULT_OUT_CSV)
    parser.add_argument("--out-json", type=Path, default=DEFAULT_OUT_JSON)
    parser.add_argument("--method", choices=["both", "isolation_forest", "statistical_mad"],
                        default="both")
    parser.add_argument("--threshold-if", type=float, default=None)
    parser.add_argument("--threshold-stat", type=float, default=None)
    args = parser.parse_args(argv)

    if not args.model.exists():
        raise SystemExit(f"Model not found: {args.model}\nRun: python ml-engine/train.py")
    if not args.input.exists():
        raise SystemExit(f"Input dataset not found: {args.input}\nRun: python ml-engine/generate_data.py")

    artifact = joblib.load(args.model)
    artifact["model_path"] = str(args.model)
    df = pd.read_csv(args.input)
    methods = (["isolation_forest", "statistical_mad"]
               if args.method == "both" else [args.method])
    thresholds: dict[str, float] = {}
    if args.threshold_if is not None:
        thresholds["isolation_forest"] = args.threshold_if
    if args.threshold_stat is not None:
        thresholds["statistical_mad"] = args.threshold_stat

    report = run_detection(df, artifact, methods=methods, thresholds=thresholds)

    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    flat = []
    for row in report["rows"]:
        flat.append({
            "record_id": row["record_id"],
            "score": row["score"],
            "flag": row["flag"],
            "severity": row.get("severity", ""),
            "affected_features": ", ".join(row["affected_features"]),
            "narrative": row.get("narrative", ""),
            "true_label": row["true_label"],
        })
        for method in methods[1:]:
            flat[-1][f"score_{method}"] = row[f"score_{method}"]
            flat[-1][f"flag_{method}"] = row[f"flag_{method}"]
    pd.DataFrame(flat).to_csv(args.out_csv, index=False)
    args.out_json.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print(f"Scored {report['n_rows']} windows from {args.input}")
    for method in methods:
        m = report["per_method"][method]
        print(f"  {method}: threshold={m['threshold']:.3f}, flagged={m['n_flagged']}")
    print(f"  CSV:  {args.out_csv}")
    print(f"  JSON: {args.out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
