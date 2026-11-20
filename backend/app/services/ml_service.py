"""
ML service layer: wraps ml-engine modules for use by FastAPI routes.
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.config import DATASETS_DIR, MODELS_DIR, EXPERIMENTS_DIR, REPORTS_DIR
from app.services import store

# ensure ml-engine importable
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "ml-engine"))

import data_generator as dg
import features as fe
import detect as dt
import evaluate as ev
import explain as ex
import experiment as exp


def _save_dataset(df: pd.DataFrame, path: Path, seed: int) -> None:
    """Write a dataset and metadata without depending on the generator's save helper."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    meta = {
        "n_rows": len(df),
        "n_normal": int((df["label"] == 0).sum()),
        "n_anomaly": int((df["label"] == 1).sum()),
        "features": list(dg.FEATURES),
        "seed": seed,
        "scenarios": sorted(df["scenario"].unique().tolist()),
    }
    path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))


def generate_synthetic(n_normal: int = 1200, n_anomaly: int = 240, seed: int = 20261120) -> Dict[str, Any]:
    cfg = dg.GeneratorConfig(n_normal=n_normal, n_anomaly=n_anomaly, seed=seed)
    df = dg.generate_dataset(cfg)
    path = DATASETS_DIR / "synthetic" / f"synthetic_{seed}.csv"
    _save_dataset(df, path, seed)
    did = store.register_dataset(path.name, path, len(df), "synthetic")
    tr, te = dg.make_train_test_split(df)
    tr_path = DATASETS_DIR / "synthetic" / f"train_{seed}.csv"
    te_path = DATASETS_DIR / "synthetic" / f"test_{seed}.csv"
    _save_dataset(tr, tr_path, seed)
    _save_dataset(te, te_path, seed)
    store.register_dataset(tr_path.name, tr_path, len(tr), "train")
    store.register_dataset(te_path.name, te_path, len(te), "test")
    return {"dataset_id": did, "n_rows": len(df), "n_normal": int((df.label == 0).sum()),
            "n_anomaly": int((df.label == 1).sum()), "path": str(path),
            "train_path": str(tr_path), "test_path": str(te_path)}


def preview_dataset(path: str, limit: int = 50) -> Dict[str, Any]:
    df = pd.read_csv(path)
    stats = fe.dataset_stats(df)
    rows = df.head(limit).fillna("").to_dict(orient="records")
    return {"columns": list(df.columns), "n_rows": len(df), "preview": rows, "stats": stats}


def train_model(dataset_id: str, method: str, threshold: float,
               contamination: float = 0.1, z_threshold: float = 3.5) -> Dict[str, Any]:
    ds = store.get_dataset(dataset_id)
    if not ds:
        raise ValueError("dataset not found")
    df = pd.read_csv(ds["path"])
    bundle, scaler = fe.prepare_features(df, fit=True)
    if method == "isolation_forest":
        detector = dt.IsolationForestDetector(contamination=contamination)
    elif method == "statistical_mad":
        detector = dt.StatisticalDetector(z_threshold=z_threshold)
    else:
        raise ValueError(f"unknown method {method}")
    detector.fit(bundle.X)
    mid = store.register_model(dataset_id, method, threshold, dataset_name=ds.get("name"))
    # persist model
    model_path = MODELS_DIR / f"{mid}.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({"scaler": scaler, "detector": detector, "method": method,
                     "threshold": threshold, "feature_names": bundle.feature_names}, f)
    store.cache_model(mid, {"scaler": scaler, "detector": detector, "method": method,
                           "threshold": threshold, "feature_names": bundle.feature_names})
    # update db path
    import sqlite3
    c = sqlite3.connect(str(store.DB_PATH))
    c.execute("UPDATE models SET path=? WHERE id=?", (str(model_path), mid))
    c.commit(); c.close()
    return {"model_id": mid, "method": method, "threshold": threshold,
            "n_train": len(df)}


def load_model(model_id: str) -> Optional[Dict[str, Any]]:
    cached = store.get_model(model_id)
    if cached:
        return cached
    # load from disk
    import sqlite3
    c = sqlite3.connect(str(store.DB_PATH))
    c.row_factory = sqlite3.Row
    r = c.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
    c.close()
    if not r or not r["path"]:
        return None
    path = Path(r["path"])
    if not path.exists():
        return None
    with open(path, "rb") as f:
        payload = pickle.load(f)
    payload["threshold"] = r["threshold"]
    store.cache_model(model_id, payload)
    return payload


def run_detection(dataset_id: str, model_id: str, threshold: Optional[float] = None) -> Dict[str, Any]:
    ds = store.get_dataset(dataset_id)
    if not ds:
        raise ValueError("dataset not found")
    model = load_model(model_id)
    if not model:
        raise ValueError("model not found")
    df = pd.read_csv(ds["path"])
    bundle, _ = fe.prepare_features(df, scaler=model["scaler"], fit=False)
    detector = model["detector"]
    thr = threshold if threshold is not None else model["threshold"]
    det = detector.detect(bundle.X, threshold=thr)

    # baseline stats for explainability (from training? use current dataset median as baseline)
    baseline = {}
    for i, f in enumerate(fe.FEATURES):
        col = df[f]
        baseline[f] = {
            "median": float(col.median()) if col.notna().any() else 0.0,
            "std": float(col.std()) if col.notna().any() else 1.0,
        }

    # build results
    rows = []
    y_true = df["label"].values if "label" in df.columns else None
    for idx, rid in enumerate(bundle.row_ids):
        record = df.iloc[idx].to_dict()
        sc = float(det.scores[idx])
        flag = int(det.flags[idx])
        affected = []
        if flag == 1:
            devs = ex.feature_deviation(df.iloc[idx], baseline)
            affected = ex.identify_affected_features(devs)
        expl = ex.build_explanation(record, sc, model["method"], thr, baseline, affected)
        dev_list = ex.feature_deviation(df.iloc[idx], baseline) if flag == 1 else []
        rows.append({
            "record_id": rid,
            "score": sc,
            "flag": flag,
            "severity": expl["severity"],
            "affected_features": affected,
            "explanation": expl,
            "deviations": dev_list,
            "true_label": int(y_true[idx]) if y_true is not None else None,
        })

    # persist result
    result_path = REPORTS_DIR / f"detection_{store.new_id('res')}.json"
    payload = {
        "dataset_id": dataset_id,
        "model_id": model_id,
        "method": model["method"],
        "threshold": thr,
        "n_rows": len(df),
        "n_flagged": int(det.flags.sum()),
        "rows": rows,
    }
    result_path.write_text(json.dumps(payload, indent=2, default=str))
    det_id = store.register_detection(
        dataset_id, model_id, model["method"], thr, int(det.flags.sum()), str(result_path),
        n_rows=len(df), dataset_name=ds.get("name"),
        synthetic=bool(ds.get("synthetic")), demo_run_id=ds.get("demo_run_id"),
    )
    store.persist_detection_results(det_id, rows)

    # create incidents for flagged rows
    for r in rows:
        if r["flag"] == 1:
            store.upsert_incident(det_id, r["record_id"], r["score"], r["severity"],
                                  demo_run_id=ds.get("demo_run_id"))

    # metrics if labels present
    metrics = None
    if y_true is not None:
        metrics = ev.evaluate(y_true, det.flags, det.scores).to_dict()

    return {"detection_id": det_id, "n_rows": len(df), "n_flagged": int(det.flags.sum()),
            "threshold": thr, "method": model["method"], "metrics": metrics,
            "rows": rows, "result_path": str(result_path)}


def get_detection_results(detection_id: str) -> Optional[Dict[str, Any]]:
    d = store.get_detection(detection_id)
    if not d:
        return None
    p = Path(d["result_path"])
    if not p.exists():
        return None
    return json.loads(p.read_text())


def run_experiment_api(train_dataset_id: str, test_dataset_id: str, methods: List[str],
                       thresholds: Dict[str, float]) -> Dict[str, Any]:
    tr_ds = store.get_dataset(train_dataset_id)
    te_ds = store.get_dataset(test_dataset_id)
    if not tr_ds or not te_ds:
        raise ValueError("dataset not found")
    train_df = pd.read_csv(tr_ds["path"])
    test_df = pd.read_csv(te_ds["path"])
    exp_dir = EXPERIMENTS_DIR / store.new_id("exp")
    report = exp.run_experiment(train_df, test_df, methods, thresholds, exp_dir)
    eid = store.register_experiment("comparison", str(exp_dir / "experiment.json"))
    report["experiment_id"] = eid
    return report


def generate_report(detection_id: str, kind: str = "investigation") -> Dict[str, Any]:
    res = get_detection_results(detection_id)
    if not res:
        raise ValueError("detection not found")
    rid = store.new_id("rep")
    path = REPORTS_DIR / f"{rid}.md"
    lines = []
    lines.append(f"# TraceLens {kind.title()} Report")
    lines.append("")
    lines.append(f"- Detection ID: {detection_id}")
    lines.append(f"- Method: {res['method']}")
    lines.append(f"- Threshold: {res['threshold']}")
    lines.append(f"- Rows analysed: {res['n_rows']}")
    lines.append(f"- Anomalies flagged: {res['n_flagged']}")
    lines.append("")
    lines.append("## Flagged incidents")
    lines.append("")
    flagged = [r for r in res["rows"] if r["flag"] == 1]
    for r in flagged[:50]:
        lines.append(f"### {r['record_id']} — {r['severity'].upper()} (score {r['score']:.3f})")
        lines.append(r["explanation"]["narrative"])
        lines.append("")
        lines.append("Affected features: " + ", ".join(r["affected_features"]) if r["affected_features"] else "Affected features: (none dominant)")
        lines.append("")
        lines.append("Recommended investigation:")
        for rec in r["explanation"]["recommended_investigation"]:
            lines.append(f"- {rec}")
        lines.append("")
    path.write_text("\n".join(lines))
    db_id = store.register_report(kind, str(path))
    return {"report_id": db_id, "id": db_id, "path": str(path), "kind": kind}


def overall_stats() -> Dict[str, Any]:
    datasets = store.list_datasets()
    detections = store.list_detections()
    incidents = store.list_incidents()
    open_inc = [i for i in incidents if i["status"] == "open"]
    total_rows = 0
    for d in datasets:
        total_rows += d.get("n_rows") or 0
    return {
        "n_datasets": len(datasets),
        "n_models": len(store.list_models()),
        "n_detections": len(detections),
        "n_incidents": len(incidents),
        "n_open_incidents": len(open_inc),
        "total_rows_processed": total_rows,
        "recent_detections": detections[:5],
    }
