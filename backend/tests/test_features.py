"""Tests for feature validation, preparation and imputation."""
import numpy as np
import pandas as pd

import data_generator as dg
import features as fe


def test_validate_columns_missing():
    df = pd.DataFrame({c: [1.0] for c in fe.FEATURES if c != "cpu_utilization"})
    ok, msg = fe.validate_columns(df)
    assert ok is False
    assert "cpu_utilization" in msg


def test_validate_columns_empty_dataset():
    df = pd.DataFrame({c: pd.Series(dtype=float) for c in fe.FEATURES})
    ok, msg = fe.validate_columns(df)
    assert ok is False
    assert "empty" in msg.lower()


def test_validate_columns_ok():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=5, n_anomaly=1, seed=2))
    ok, msg = fe.validate_columns(df)
    assert ok is True
    assert msg == "ok"


def test_prepare_features_shape():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=20, n_anomaly=4, seed=5))
    bundle, scaler = fe.prepare_features(df, fit=True)
    assert bundle.X.shape == (len(df), len(fe.FEATURES))
    assert bundle.feature_names == fe.FEATURES
    assert len(bundle.row_ids) == len(df)
    assert scaler is not None


def test_prepare_features_imputation():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=30, n_anomaly=6, seed=8))
    df.loc[0, "cpu_utilization"] = np.nan
    df.loc[1, "response_latency_ms"] = np.nan
    bundle, _ = fe.prepare_features(df, fit=True)
    assert not np.isnan(bundle.X).any()


def test_prepare_features_rejects_missing_columns():
    df = pd.DataFrame({"cpu_utilization": [1, 2, 3]})
    try:
        fe.prepare_features(df, fit=True)
    except ValueError as exc:
        assert "Missing required columns" in str(exc)
    else:
        raise AssertionError("expected ValueError for missing columns")


def test_scaler_reuse_without_refit():
    train = dg.generate_dataset(dg.GeneratorConfig(n_normal=30, n_anomaly=6, seed=9))
    test = dg.generate_dataset(dg.GeneratorConfig(n_normal=10, n_anomaly=2, seed=10))
    _, scaler = fe.prepare_features(train, fit=True)
    train_bundle, same_scaler = fe.prepare_features(test, scaler=scaler, fit=False)
    assert same_scaler is scaler
    assert train_bundle.X.shape == (12, len(fe.FEATURES))


def test_dataset_stats():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=20, n_anomaly=4, seed=12))
    stats = fe.dataset_stats(df)
    assert stats["n_rows"] == 24
    assert stats["n_missing_total"] == 0
    assert stats["label_counts"][0] == 20
    assert stats["label_counts"][1] == 4
