"""Determinism guarantees for the TraceLens ML pipeline.

These tests prove that a fixed seed yields identical generated data, identical
trained models and identical detection output — the reproducibility criterion
in the AEGYTHON 2026 judging rubric.
"""
import joblib
import numpy as np
import pandas as pd

import data_generator as dg
import detect as dt
import generate_data as gd
import train as tr


def test_generator_is_deterministic(tmp_path):
    a = gd.generate(seed=123, n_normal=60, n_anomaly=12, out_dir=tmp_path / "a")
    b = gd.generate(seed=123, n_normal=60, n_anomaly=12, out_dir=tmp_path / "b")
    for key in ("dataset", "train", "test"):
        assert a[key].name == b[key].name
        assert a[key].read_bytes() == b[key].read_bytes(), key

    other = gd.generate(seed=124, n_normal=60, n_anomaly=12, out_dir=tmp_path / "c")
    assert other["dataset"].read_bytes() != a["dataset"].read_bytes()


def test_training_and_scoring_are_deterministic():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=120, n_anomaly=30, seed=77))
    train_df, test_df = dg.make_train_test_split(df, test_size=0.3, seed=77)
    first = tr.train_bundle(train_df, seed=77, n_estimators=50)
    second = tr.train_bundle(train_df, seed=77, n_estimators=50)

    for method in ("isolation_forest", "statistical_mad"):
        scores_a, flags_a, thr_a = dt.score_dataframe(test_df, first, method)
        scores_b, flags_b, thr_b = dt.score_dataframe(test_df, second, method)
        np.testing.assert_allclose(scores_a, scores_b, rtol=0, atol=0)
        np.testing.assert_array_equal(flags_a, flags_b)
        assert thr_a == thr_b


def test_scores_are_batch_independent():
    """Scoring one window must give the same result as scoring it in a batch."""
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=80, n_anomaly=20, seed=9))
    artifact = tr.train_bundle(df, seed=9, n_estimators=40)
    for method in ("isolation_forest", "statistical_mad"):
        batch, _, _ = dt.score_dataframe(df, artifact, method)
        single, _, _ = dt.score_dataframe(df.iloc[[7]], artifact, method)
        assert float(single[0]) == float(batch[7])


def test_cli_pipeline_reproduces_identical_outputs(tmp_path):
    data_dir = tmp_path / "data"
    gd.generate(seed=5, n_normal=80, n_anomaly=20, out_dir=data_dir)
    model = tmp_path / "models" / "model.joblib"
    report = tmp_path / "reports" / "train.json"
    train_args = [
        "--train-csv", str(data_dir / "train.csv"),
        "--test-csv", str(data_dir / "test.csv"),
        "--model-out", str(model),
        "--report-out", str(report),
        "--seed", "5", "--n-estimators", "40",
    ]
    assert tr.main(train_args) == 0
    model_bytes = model.read_bytes()
    report_bytes = report.read_bytes()
    assert tr.main(train_args) == 0
    assert model.read_bytes() == model_bytes
    assert report.read_bytes() == report_bytes

    artifacts = []
    for run in ("run1", "run2"):
        csv_path = tmp_path / run / "detections.csv"
        json_path = tmp_path / run / "detections.json"
        assert dt.main([
            "--model", str(model),
            "--input", str(data_dir / "test.csv"),
            "--out-csv", str(csv_path),
            "--out-json", str(json_path),
        ]) == 0
        artifacts.append((csv_path.read_bytes(), json_path.read_bytes()))
    assert artifacts[0] == artifacts[1]


def test_explanations_name_a_deviating_feature(tmp_path):
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=150, n_anomaly=40, seed=11))
    train_df, test_df = dg.make_train_test_split(df, test_size=0.3, seed=11)
    artifact = tr.train_bundle(train_df, seed=11, n_estimators=40)
    scores, flags, thr = dt.score_dataframe(test_df, artifact, "isolation_forest")
    assert ((scores >= thr).astype(int) == flags).all()
    report = dt.run_detection(test_df, artifact, methods=["isolation_forest"])
    flagged = [r for r in report["rows"] if r["flag"] == 1]
    assert flagged, "expected at least one flagged window"
    for row in flagged:
        assert row["affected_features"], row["record_id"]
        assert row["explanation"]["narrative"]
