"""
Feature engineering for TraceLens.

Builds the numeric feature matrix from a raw telemetry DataFrame, handles
missing values, and provides robust scaling utilities. All transformations
are fit on training data only to prevent leakage.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler

FEATURES = [
    "cpu_utilization",
    "memory_utilization",
    "disk_io_mbps",
    "network_mbps",
    "request_rate",
    "response_latency_ms",
    "error_rate",
    "connection_count",
]


@dataclass
class FeatureBundle:
    X: np.ndarray
    feature_names: List[str]
    row_ids: List[str]
    raw: pd.DataFrame


def validate_columns(df: pd.DataFrame) -> Tuple[bool, str]:
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        return False, f"Missing required columns: {missing}"
    if len(df) == 0:
        return False, "Dataset is empty."
    return True, "ok"


def prepare_features(df: pd.DataFrame, scaler: RobustScaler | None = None,
                     fit: bool = False) -> Tuple[FeatureBundle, RobustScaler]:
    """Return (X scaled, scaler). Missing values imputed with column median."""
    ok, msg = validate_columns(df)
    if not ok:
        raise ValueError(msg)

    work = df.copy()
    # record ids
    if "record_id" in work.columns:
        row_ids = work["record_id"].astype(str).tolist()
    else:
        row_ids = [str(i) for i in range(len(work))]

    Xraw = work[FEATURES].copy()
    # median imputation
    medians = Xraw.median(numeric_only=True)
    Xraw = Xraw.fillna(medians)
    # non-numeric safety
    for c in FEATURES:
        Xraw[c] = pd.to_numeric(Xraw[c], errors="coerce")
    Xraw = Xraw.fillna(Xraw.median(numeric_only=True))

    if scaler is None:
        scaler = RobustScaler()
    if fit:
        X = scaler.fit_transform(Xraw.values)
    else:
        X = scaler.transform(Xraw.values)

    bundle = FeatureBundle(X=X, feature_names=list(FEATURES), row_ids=row_ids, raw=work)
    return bundle, scaler


def dataset_stats(df: pd.DataFrame) -> dict:
    ok, msg = validate_columns(df)
    if not ok:
        return {"error": msg}
    stats = {
        "n_rows": len(df),
        "n_missing_total": int(df[FEATURES].isna().sum().sum()),
        "missing_by_column": {c: int(df[c].isna().sum()) for c in FEATURES},
        "duplicate_rows": int(df.duplicated().sum()),
        "label_counts": df["label"].value_counts().to_dict() if "label" in df.columns else {},
        "column_stats": {},
    }
    for c in FEATURES:
        s = pd.to_numeric(df[c], errors="coerce")
        stats["column_stats"][c] = {
            "min": float(s.min()) if s.notna().any() else None,
            "max": float(s.max()) if s.notna().any() else None,
            "mean": float(s.mean()) if s.notna().any() else None,
            "median": float(s.median()) if s.notna().any() else None,
            "std": float(s.std()) if s.notna().any() else None,
        }
    return stats
