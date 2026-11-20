"""
TraceLens · reproducible model training (CLI entry point).

Trains two independent anomaly detectors on the training split only:

  1. Isolation Forest (scikit-learn) on RobustScaler-normalised features.
  2. A robust MAD/IQR statistical baseline computed on the same normalised
     training features.

Everything needed to score new windows — imputation medians, scaler, fitted
model, baseline statistics and explanation baselines — is saved as one joblib
bundle. No wall-clock timestamps are written, so identical inputs and seeds
produce byte-identical artifacts and reports.

Run from anywhere:

    python ml-engine/train.py
    python ml-engine/train.py --seed 20261120 --n-estimators 200

Outputs (default):
    models/tracelens_model.joblib     model bundle consumed by detect.py
    experiments/train_report.json     configuration + measured test metrics
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

from detect import prepare_matrix, score_matrix
from evaluate import evaluate
from features import FEATURES

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TRAIN = ROOT / "datasets" / "synthetic" / "train.csv"
DEFAULT_TEST = ROOT / "datasets" / "synthetic" / "test.csv"
DEFAULT_MODEL = ROOT / "models" / "tracelens_model.joblib"
DEFAULT_REPORT = ROOT / "experiments" / "train_report.json"


def _numeric(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce feature columns to numeric, keeping NaNs for median imputation."""
    return df[FEATURES].apply(pd.to_numeric, errors="coerce")


def _stats_matrix(x: np.ndarray) -> dict[str, dict[str, float]]:
    """Per-feature median, MAD, quartiles and std of a matrix (columns = features)."""
    med = np.median(x, axis=0)
    mad = 1.4826 * np.median(np.abs(x - med), axis=0)
    mad = np.maximum(mad, 1e-9)
    q1 = np.percentile(x, 25, axis=0)
    q3 = np.percentile(x, 75, axis=0)
    std = np.maximum(x.std(axis=0, ddof=1), 1e-9)
    return {
        "median": {f: float(med[i]) for i, f in enumerate(FEATURES)},
        "mad": {f: float(mad[i]) for i, f in enumerate(FEATURES)},
        "q1": {f: float(q1[i]) for i, f in enumerate(FEATURES)},
        "q3": {f: float(q3[i]) for i, f in enumerate(FEATURES)},
        "std": {f: float(std[i]) for i, f in enumerate(FEATURES)},
    }


def train_bundle(
    train_df: pd.DataFrame,
    seed: int = 20261120,
    n_estimators: int = 200,
    contamination: float = 0.1,
    z_threshold: float = 3.5,
    iqr_multiplier: float = 1.5,
    threshold_if: float = 0.5,
    threshold_stat: float = 0.3,
) -> dict:
    """Fit all transforms and detectors on train_df; return the model bundle."""
    numeric = _numeric(train_df)
    impute_values = {
        f: (float(numeric[f].median()) if numeric[f].notna().any() else 0.0)
        for f in FEATURES
    }
    x_raw = numeric.fillna(pd.Series(impute_values)).to_numpy(dtype=float)

    scaler = RobustScaler().fit(x_raw)
    x_scaled = scaler.transform(x_raw)

    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=seed,
        n_jobs=1,
    ).fit(x_scaled)

    statistical = _stats_matrix(x_scaled)
    statistical.update({
        "z_threshold": float(z_threshold),
        "iqr_multiplier": float(iqr_multiplier),
        "threshold": float(threshold_stat),
    })

    # Raw-space median/std drive the human-readable feature-deviation narratives.
    baseline = {
        f: {
            "median": float(np.median(x_raw[:, i])),
            "std": float(max(x_raw[:, i].std(ddof=1), 1e-9)),
        }
        for i, f in enumerate(FEATURES)
    }

    return {
        "artifact_version": "1.0",
        "seed": int(seed),
        "feature_names": list(FEATURES),
        "n_train": int(len(train_df)),
        "impute_values": impute_values,
        "scaler": scaler,
        "isolation_forest": {
            "model": model,
            "n_estimators": int(n_estimators),
            "contamination": float(contamination),
            "threshold": float(threshold_if),
        },
        "statistical": statistical,
        "baseline": baseline,
    }


def evaluate_bundle(artifact: dict, test_df: pd.DataFrame) -> dict | None:
    """Measure both detectors against ground truth when labels are present."""
    if "label" not in test_df.columns:
        return None
    _, x_scaled = prepare_matrix(test_df, artifact)
    y_true = pd.to_numeric(test_df["label"], errors="coerce").fillna(0).to_numpy(dtype=int)
    metrics = {}
    for method in ("isolation_forest", "statistical_mad"):
        scores = score_matrix(x_scaled, artifact, method)
        thr = (artifact["isolation_forest"]["threshold"] if method == "isolation_forest"
               else artifact["statistical"]["threshold"])
        flags = (scores >= thr).astype(int)
        metrics[method] = {
            "threshold": float(thr),
            "metrics": evaluate(y_true, flags, scores).to_dict(),
        }
    return metrics


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the TraceLens anomaly detectors")
    parser.add_argument("--train-csv", type=Path, default=DEFAULT_TRAIN)
    parser.add_argument("--test-csv", type=Path, default=DEFAULT_TEST)
    parser.add_argument("--model-out", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--report-out", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--seed", type=int, default=20261120)
    parser.add_argument("--n-estimators", type=int, default=200)
    parser.add_argument("--contamination", type=float, default=0.1)
    parser.add_argument("--z-threshold", type=float, default=3.5)
    parser.add_argument("--iqr-multiplier", type=float, default=1.5)
    parser.add_argument("--threshold-if", type=float, default=0.5)
    parser.add_argument("--threshold-stat", type=float, default=0.3)
    args = parser.parse_args(argv)

    for path in (args.train_csv, args.test_csv):
        if not path.exists():
            raise SystemExit(f"Dataset not found: {path}\nRun: python ml-engine/generate_data.py")

    train_df = pd.read_csv(args.train_csv)
    test_df = pd.read_csv(args.test_csv)
    artifact = train_bundle(
        train_df,
        seed=args.seed,
        n_estimators=args.n_estimators,
        contamination=args.contamination,
        z_threshold=args.z_threshold,
        iqr_multiplier=args.iqr_multiplier,
        threshold_if=args.threshold_if,
        threshold_stat=args.threshold_stat,
    )

    args.model_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.model_out)

    report = {
        "seed": args.seed,
        "n_train": int(len(train_df)),
        "n_test": int(len(test_df)),
        "features": list(FEATURES),
        "config": {
            "n_estimators": args.n_estimators,
            "contamination": args.contamination,
            "z_threshold": args.z_threshold,
            "iqr_multiplier": args.iqr_multiplier,
            "threshold_if": args.threshold_if,
            "threshold_stat": args.threshold_stat,
        },
        "scoring": {
            "isolation_forest": "clip(0.5 - decision_function, 0, 1)",
            "statistical_mad": "0.5*frac(MAD z>=z_threshold) + 0.25*clip(max_z/(2*z_threshold),0,1) + 0.25*frac(outside IQR fences)",
        },
        "test_metrics": evaluate_bundle(artifact, test_df),
        "model_path": str(args.model_out),
    }
    args.report_out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print(f"Trained on {len(train_df)} rows (seed={args.seed}); saved {args.model_out}")
    if report["test_metrics"]:
        for method, payload in report["test_metrics"].items():
            m = payload["metrics"]
            print(f"  {method}: precision={m['precision']:.3f} recall={m['recall']:.3f} "
                  f"f1={m['f1']:.3f} roc_auc={m['roc_auc']}")
    print(f"  report: {args.report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
