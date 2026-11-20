"""Tests for the reproducible synthetic telemetry generator."""
import pandas as pd

import data_generator as dg


def test_reproducibility_same_seed():
    a = dg.generate_dataset(dg.GeneratorConfig(n_normal=80, n_anomaly=16, seed=123))
    b = dg.generate_dataset(dg.GeneratorConfig(n_normal=80, n_anomaly=16, seed=123))
    pd.testing.assert_frame_equal(a, b)


def test_different_seeds_produce_different_data():
    a = dg.generate_dataset(dg.GeneratorConfig(n_normal=40, n_anomaly=8, seed=1))
    b = dg.generate_dataset(dg.GeneratorConfig(n_normal=40, n_anomaly=8, seed=2))
    assert not a.equals(b)


def test_row_and_label_counts():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=100, n_anomaly=25, seed=7))
    assert len(df) == 125
    assert int((df["label"] == 0).sum()) == 100
    assert int((df["label"] == 1).sum()) == 25
    assert set(df["label"].unique()) == {0, 1}


def test_scenarios_present():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=120, n_anomaly=90, seed=11))
    scenarios = set(df["scenario"].unique())
    assert "normal" in scenarios
    assert scenarios <= set(dg.SCENARIOS)
    # anomaly rows must use one of the documented anomaly scenarios
    assert set(df.loc[df["label"] == 1, "scenario"].unique()) <= set(dg.SCENARIOS) - {"normal"}
    assert set(df.loc[df["label"] == 0, "scenario"].unique()) == {"normal"}


def test_feature_columns_present():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=10, n_anomaly=4, seed=3))
    for col in dg.FEATURES:
        assert col in df.columns
    assert "record_id" in df.columns
    assert "timestamp" in df.columns


def test_train_test_split_stratified_and_no_leakage():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=200, n_anomaly=40, seed=17))
    train, test = dg.make_train_test_split(df, test_size=0.3, seed=17)

    assert len(train) == 168
    assert len(test) == 72
    # disjoint record ids (no record appears in both splits)
    assert set(train["record_id"]).isdisjoint(set(test["record_id"]))
    # stratified: anomaly share close in both splits
    train_rate = (train["label"] == 1).mean()
    test_rate = (test["label"] == 1).mean()
    assert abs(train_rate - test_rate) < 0.01
