"""
Experiment runner for TraceLens.

Runs reproducible comparisons between detection approaches and threshold
configurations. Persists results (JSON + CSV) to the experiments directory.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd

from detect import get_detector
from evaluate import evaluate
from features import prepare_features


def run_experiment(train_df: pd.DataFrame, test_df: pd.DataFrame,
                   methods: List[str], thresholds: Dict[str, float],
                   out_dir: Path) -> dict:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # fit scaler on train
    from features import prepare_features as pf
    train_bundle, scaler = pf(train_df, fit=True)
    test_bundle, _ = pf(test_df, scaler=scaler, fit=False)

    y_true = test_df["label"].values if "label" in test_df.columns else None

    results = []
    for method in methods:
        thr = thresholds.get(method, 0.5)
        detector = get_detector(method)
        detector.fit(train_bundle.X)
        det = detector.detect(test_bundle.X, threshold=thr)
        metrics = None
        if y_true is not None:
            metrics = evaluate(y_true, det.flags, det.scores).to_dict()
        # per-record predictions
        pred_df = pd.DataFrame({
            "record_id": test_bundle.row_ids,
            "score": det.scores,
            "flag": det.flags,
        })
        if "label" in test_df.columns:
            pred_df["true_label"] = test_df["label"].values
        pred_path = out_dir / f"{method}_predictions.csv"
        pred_df.to_csv(pred_path, index=False)

        results.append({
            "method": method,
            "threshold": thr,
            "params": det.params,
            "metrics": metrics,
            "n_flagged": int(det.flags.sum()),
            "predictions_file": str(pred_path),
        })

    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "n_train": len(train_df),
        "n_test": len(test_df),
        "methods": methods,
        "results": results,
    }
    (out_dir / "experiment.json").write_text(json.dumps(report, indent=2, default=str))
    return report
