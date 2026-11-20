"""Six labelled synthetic demo scenarios.

Scenarios are generated into ``datasets/demo/`` with a ``data_origin=synthetic``
column and ``SYN-`` record ids. They are registered with kind ``demo_synthetic``
so reset can remove them without ever touching a real dataset.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.config import DATASETS_DIR, ML_ENGINE
from app.services import store
from app.services.ml_service import preview_dataset

if str(ML_ENGINE) not in sys.path:
    sys.path.insert(0, str(ML_ENGINE))

import data_generator as dg  # noqa: E402

SCENARIOS: List[Dict[str, Any]] = [
    {
        "key": "normal",
        "title": "Stable baseline",
        "description": "Healthy telemetry with normal diurnal variation and no injected fault.",
        "expected_signal": "No anomalous records; establishes the baseline for comparison.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
    {
        "key": "cpu_spike",
        "title": "CPU spike",
        "description": "Abrupt CPU utilisation jumps toward saturation on a subset of records.",
        "expected_signal": "cpu_utilization deviates far above the baseline median.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
    {
        "key": "memory_leak",
        "title": "Memory leak",
        "description": "Memory utilisation climbs steadily and remains elevated.",
        "expected_signal": "memory_utilization is the dominant deviating feature.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
    {
        "key": "network_surge",
        "title": "Network surge",
        "description": "Network throughput and connection count surge together.",
        "expected_signal": "network_mbps and connection_count rise together.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
    {
        "key": "latency_error_surge",
        "title": "Latency and error surge",
        "description": "Response latency and error rate rise together while request rate dips.",
        "expected_signal": "response_latency_ms and error_rate deviate alongside a request-rate drop.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
    {
        "key": "combined_anomaly",
        "title": "Combined anomaly",
        "description": "CPU, memory and error rate shift simultaneously in a single record window.",
        "expected_signal": "Multiple features deviate at once, producing the highest composite score.",
        "methods": ["isolation_forest", "statistical_mad"],
    },
]

SCENARIO_BY_KEY = {s["key"]: s for s in SCENARIOS}


def list_scenarios() -> List[Dict[str, Any]]:
    return [
        {**s, "synthetic": True, "record_label": "all records are labelled synthetic fixtures"}
        for s in SCENARIOS
    ]


def scenario_meta(key: str) -> Dict[str, Any]:
    return SCENARIO_BY_KEY.get(key, {})


def _inject(df: pd.DataFrame, key: str, rng: np.random.Generator) -> None:
    """Apply the scenario's fault pattern in place to selected anomalous rows."""
    if key == "normal":
        return
    idx = df.index
    if key == "cpu_spike":
        df.loc[idx, "cpu_utilization"] = np.clip(93 + 4 * rng.normal(size=len(idx)), 85, 100)
    elif key == "memory_leak":
        df.loc[idx, "memory_utilization"] = np.clip(89 + 3 * rng.normal(size=len(idx)), 80, 99)
        df.loc[idx, "cpu_utilization"] = np.clip(df.loc[idx, "cpu_utilization"] + 8, 0, 100)
    elif key == "network_surge":
        df.loc[idx, "network_mbps"] = np.clip(265 + 30 * rng.normal(size=len(idx)), 200, 400)
        df.loc[idx, "connection_count"] = np.clip(
            df.loc[idx, "connection_count"] * 2.5, 0, 2000)
    elif key == "latency_error_surge":
        df.loc[idx, "response_latency_ms"] = np.clip(
            680 + 80 * rng.normal(size=len(idx)), 500, 1200)
        df.loc[idx, "error_rate"] = np.clip(9 + 2 * rng.normal(size=len(idx)), 5, 25)
        df.loc[idx, "request_rate"] = np.clip(df.loc[idx, "request_rate"] * 0.6, 0, 2000)
    elif key == "combined_anomaly":
        df.loc[idx, "cpu_utilization"] = np.clip(91 + 3 * rng.normal(size=len(idx)), 80, 100)
        df.loc[idx, "memory_utilization"] = np.clip(87 + 3 * rng.normal(size=len(idx)), 78, 99)
        df.loc[idx, "error_rate"] = np.clip(7 + 1.5 * rng.normal(size=len(idx)), 4, 20)


def generate_scenario_frame(scenario: str, n_rows: int = 80, seed: int | None = None) -> pd.DataFrame:
    """Build a small labelled dataset; roughly 20% anomalous except 'normal'."""
    if scenario not in SCENARIO_BY_KEY:
        raise ValueError(f"unknown scenario '{scenario}'")
    n_rows = max(20, min(int(n_rows), 2000))
    seed = seed if seed is not None else 20261120 + sum(ord(c) for c in scenario)
    rng = np.random.default_rng(seed)

    n_anom = 0 if scenario == "normal" else max(4, round(n_rows * 0.2))
    n_normal = n_rows - n_anom

    normal = dg._base_normal(rng, n_normal)
    normal["label"] = 0
    normal["scenario"] = "normal"

    frames = [normal]
    if n_anom:
        anom = dg._base_normal(rng, n_anom)
        anom["label"] = 1
        anom["scenario"] = scenario
        _inject(anom, scenario, rng)
        frames.append(anom)

    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    start = pd.Timestamp("2026-11-01T00:00:00")
    df.insert(0, "timestamp", [start + pd.Timedelta(minutes=i) for i in range(len(df))])
    df.insert(0, "record_id", [f"SYN-{i:06d}" for i in range(len(df))])
    df.insert(0, "data_origin", "synthetic")
    return df


def load_scenario(scenario: str, n_rows: int = 80, seed: int | None = None,
                  preview_limit: int = 12) -> Dict[str, Any]:
    meta = scenario_meta(scenario)
    if not meta:
        raise ValueError(f"unknown scenario '{scenario}'")

    df = generate_scenario_frame(scenario, n_rows, seed)
    run_id = store.create_demo_run(scenario, note=f"synthetic fixture, {len(df)} rows")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    path = DATASETS_DIR / "demo" / f"demo_{scenario}_{stamp}.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)

    did = store.register_dataset(
        path.name, path, len(df), "demo_synthetic", synthetic=True,
        origin="synthetic", scenario=scenario, demo_run_id=run_id,
    )
    store.update_demo_run(run_id, dataset_id=did)

    preview = preview_dataset(str(path), preview_limit)
    return {
        "scenario": scenario,
        "synthetic": True,
        "demo_run_id": run_id,
        "dataset_id": did,
        "dataset_name": path.name,
        "title": meta["title"],
        "description": meta["description"],
        "expected_signal": meta["expected_signal"],
        "methods": meta["methods"],
        "n_rows": len(df),
        "labels": {
            "data_origin": "synthetic",
            "scenario": scenario,
            "n_normal": int((df["label"] == 0).sum()),
            "n_anomaly": int((df["label"] == 1).sum()),
            "all_records_labelled_synthetic": True,
        },
        "preview": preview,
        "next_steps": [
            "POST /api/models/train with this dataset_id",
            "POST /api/detection/run with the returned model_id",
            "GET /api/demo/scenarios for the full scenario list",
        ],
    }


def reset() -> Dict[str, Any]:
    """Remove demo fixtures only, including their on-disk CSV artefacts."""
    real_before = len(store.list_datasets(include_demo=False))
    result = store.reset_demo_runs()
    demo_dir = DATASETS_DIR / "demo"
    removed_files = 0
    for raw in result.pop("files", []):
        p = Path(raw)
        try:
            resolved = p.resolve()
            guarded = (demo_dir.resolve() in resolved.parents
                       or (DATASETS_DIR.parent / "reports").resolve() in resolved.parents
                       or (DATASETS_DIR.parent / "models").resolve() in resolved.parents)
            if guarded and resolved.exists():
                resolved.unlink()
                removed_files += 1
        except OSError:
            continue
    real_after = len(store.list_datasets(include_demo=False))
    return {**result, "files_removed": removed_files,
            "real_datasets_before": real_before, "real_datasets_after": real_after,
            "real_data_preserved": real_before == real_after,
            "synthetic": True}
