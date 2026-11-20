"""
Synthetic telemetry generator for TraceLens.

Generates reproducible system telemetry with documented normal and anomalous
records. Used for training, evaluation and demonstration. Every record is
labelled so evaluation metrics are computed on known ground truth.

This module is dependency-light: only numpy + pandas.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

RANDOM_SEED = 20261120

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

# Human-readable scenario names used in the "scenario" column.
SCENARIOS = [
    "normal",
    "cpu_spike",
    "memory_leak",
    "network_surge",
    "latency_spike",
    "error_surge",
    "combined_anomaly",
    "multi_metric",
    "missing_measurement",
    "noisy",
]


@dataclass
class GeneratorConfig:
    n_normal: int = 1200
    n_anomaly: int = 240
    seed: int = RANDOM_SEED
    include_timestamps: bool = True
    start_time: str = "2026-11-01T00:00:00"


def _base_normal(rng: np.random.Generator, n: int) -> pd.DataFrame:
    """Generate n rows of normal system behaviour."""
    t = np.arange(n)
    # gentle diurnal-ish trend
    diurnal = 0.08 * np.sin(2 * np.pi * t / 144.0)
    df = pd.DataFrame({
        "cpu_utilization": np.clip(42 + 6 * rng.normal(size=n) + 100 * diurnal, 5, 95),
        "memory_utilization": np.clip(55 + 4 * rng.normal(size=n), 20, 90),
        "disk_io_mbps": np.clip(120 + 25 * rng.normal(size=n), 10, 400),
        "network_mbps": np.clip(80 + 20 * rng.normal(size=n), 5, 300),
        "request_rate": np.clip(450 + 60 * rng.normal(size=n), 50, 1200),
        "response_latency_ms": np.clip(120 + 25 * rng.normal(size=n), 20, 400),
        "error_rate": np.clip(0.5 + 0.4 * rng.normal(size=n), 0, 5),
        "connection_count": np.clip(180 + 30 * rng.normal(size=n), 20, 600),
    })
    return df


def _inject_anomalies(rng: np.random.Generator, df: pd.DataFrame, kinds: Iterable[str]) -> pd.DataFrame:
    """Inject anomaly patterns into a copy of df rows (already selected)."""
    out = df.copy()
    n = len(out)
    kinds = list(kinds)
    # assign each row a scenario
    scen = rng.choice(kinds, size=n)
    out["scenario"] = scen
    for i in range(n):
        k = scen[i]
        if k == "cpu_spike":
            out.loc[out.index[i], "cpu_utilization"] = np.clip(92 + 4 * rng.normal(), 85, 100)
        elif k == "memory_leak":
            out.loc[out.index[i], "memory_utilization"] = np.clip(88 + 3 * rng.normal(), 80, 99)
            out.loc[out.index[i], "cpu_utilization"] = np.clip(out.loc[out.index[i], "cpu_utilization"] + 8, 0, 100)
        elif k == "network_surge":
            out.loc[out.index[i], "network_mbps"] = np.clip(260 + 30 * rng.normal(), 200, 400)
            out.loc[out.index[i], "connection_count"] = np.clip(out.loc[out.index[i], "connection_count"] * 2.5, 0, 2000)
        elif k == "latency_spike":
            out.loc[out.index[i], "response_latency_ms"] = np.clip(650 + 80 * rng.normal(), 500, 1200)
            out.loc[out.index[i], "request_rate"] = np.clip(out.loc[out.index[i], "request_rate"] * 0.6, 0, 2000)
        elif k == "error_surge":
            out.loc[out.index[i], "error_rate"] = np.clip(8 + 2 * rng.normal(), 5, 25)
            out.loc[out.index[i], "response_latency_ms"] = np.clip(out.loc[out.index[i], "response_latency_ms"] + 200, 0, 2000)
        elif k == "combined_anomaly":
            out.loc[out.index[i], "cpu_utilization"] = np.clip(90 + 3 * rng.normal(), 80, 100)
            out.loc[out.index[i], "memory_utilization"] = np.clip(86 + 3 * rng.normal(), 78, 99)
            out.loc[out.index[i], "error_rate"] = np.clip(6 + 1.5 * rng.normal(), 4, 20)
        elif k == "multi_metric":
            out.loc[out.index[i], "disk_io_mbps"] = np.clip(380 + 40 * rng.normal(), 300, 600)
            out.loc[out.index[i], "network_mbps"] = np.clip(280 + 30 * rng.normal(), 220, 400)
            out.loc[out.index[i], "connection_count"] = np.clip(out.loc[out.index[i], "connection_count"] * 2.0, 0, 2000)
        elif k == "missing_measurement":
            # introduce NaNs in two features
            out.loc[out.index[i], "cpu_utilization"] = np.nan
            out.loc[out.index[i], "response_latency_ms"] = np.nan
        elif k == "noisy":
            out.loc[out.index[i], "cpu_utilization"] = np.clip(out.loc[out.index[i], "cpu_utilization"] + 35 * rng.normal(), 0, 100)
            out.loc[out.index[i], "memory_utilization"] = np.clip(out.loc[out.index[i], "memory_utilization"] + 30 * rng.normal(), 0, 100)
    return out


def generate_dataset(cfg: GeneratorConfig | None = None) -> pd.DataFrame:
    """Generate a labelled dataset. Columns: features + timestamp + label(0/1) + scenario."""
    cfg = cfg or GeneratorConfig()
    rng = np.random.default_rng(cfg.seed)

    normal = _base_normal(rng, cfg.n_normal)
    normal["label"] = 0
    normal["scenario"] = "normal"

    anom = _base_normal(rng, cfg.n_anomaly)
    anom["label"] = 1
    anomaly_kinds = ["cpu_spike", "memory_leak", "network_surge", "latency_spike",
                     "error_surge", "combined_anomaly", "multi_metric",
                     "missing_measurement", "noisy"]
    anom = _inject_anomalies(rng, anom, anomaly_kinds)

    df = pd.concat([normal, anom], ignore_index=True)
    # shuffle
    df = df.sample(frac=1, random_state=cfg.seed).reset_index(drop=True)

    if cfg.include_timestamps:
        start = pd.Timestamp(cfg.start_time)
        # 1-minute cadence
        df.insert(0, "timestamp", [start + pd.Timedelta(minutes=i) for i in range(len(df))])

    # record id
    df.insert(0, "record_id", [f"REC-{i:06d}" for i in range(len(df))])
    return df


def make_train_test_split(df: pd.DataFrame, test_size: float = 0.3, seed: int = RANDOM_SEED):
    """Leakage-safe split: stratified by label, separate indices."""
    from sklearn.model_selection import train_test_split
    train, test = train_test_split(
        df, test_size=test_size, random_state=seed, stratify=df["label"]
    )
    train = train.reset_index(drop=True)
    test = test.reset_index(drop=True)
    return train, test


def save_dataset(df: pd.DataFrame, path: Path, seed: int = RANDOM_SEED) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    # also write metadata
    meta = {
        "n_rows": len(df),
        "n_normal": int((df["label"] == 0).sum()),
        "n_anomaly": int((df["label"] == 1).sum()),
        "features": FEATURES,
        "seed": seed,
        "scenarios": sorted(df["scenario"].unique().tolist()),
    }
    (path.with_suffix(".meta.json")).write_text(json.dumps(meta, indent=2))


def load_dataset(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


if __name__ == "__main__":
    df = generate_dataset()
    out = Path("datasets/synthetic/telemetry.csv")
    save_dataset(df, out)
    tr, te = make_train_test_split(df)
    save_dataset(tr, Path("datasets/synthetic/train.csv"))
    save_dataset(te, Path("datasets/synthetic/test.csv"))
    print("generated", len(df), "rows;", "train", len(tr), "test", len(te))
    print(df["label"].value_counts().to_dict())
    print(df["scenario"].value_counts().to_dict())
