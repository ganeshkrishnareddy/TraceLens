"""Tests for the explainability layer."""
import data_generator as dg
import explain as ex
from features import FEATURES


def _baseline(normal_df):
    baseline = {}
    for f in FEATURES:
        col = normal_df[f]
        baseline[f] = {
            "median": float(col.median()) if col.notna().any() else 0.0,
            "std": float(col.std()) if col.notna().any() else 1.0,
        }
    return baseline


def test_build_explanation_structure():
    record = {"cpu_utilization": 95.0}
    baseline = {"cpu_utilization": {"median": 42.0, "std": 6.0}}
    expl = ex.build_explanation(record, 0.9, "isolation_forest", 0.5,
                                baseline, ["cpu_utilization"])
    expected = {
        "severity", "affected_features", "evidence", "model_interpretation",
        "possible_explanation", "recommended_investigation", "unknowns", "narrative",
    }
    assert expected <= set(expl.keys())
    assert expl["severity"] == "critical"
    assert expl["affected_features"] == ["cpu_utilization"]
    assert isinstance(expl["evidence"], list) and expl["evidence"]
    assert isinstance(expl["recommended_investigation"], list)
    assert isinstance(expl["unknowns"], list)
    assert isinstance(expl["narrative"], str) and expl["narrative"]


def test_severity_levels():
    baseline = {}
    for score, sev in [(0.1, "low"), (0.45, "medium"), (0.7, "high"), (0.9, "critical")]:
        expl = ex.build_explanation({}, score, "statistical_mad", 0.3, baseline, [])
        assert expl["severity"] == sev


def test_affected_features_non_empty_for_anomalous_record():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=200, n_anomaly=180, seed=77))
    normal = df[df["label"] == 0]
    baseline = _baseline(normal)
    anomalous = df[(df["label"] == 1) & (df["scenario"] == "cpu_spike")]
    assert len(anomalous) > 0

    row = anomalous.iloc[0]
    deviations = ex.feature_deviation(row, baseline)
    affected = ex.identify_affected_features(deviations)
    assert "cpu_utilization" in affected
    assert len(affected) > 0

    expl = ex.build_explanation(row.to_dict(), 0.95, "isolation_forest", 0.5,
                                baseline, affected)
    assert expl["affected_features"]
    assert any("cpu" in e.lower() for e in expl["evidence"])


def test_feature_deviation_missing_value():
    import numpy as np
    row_data = {f: 1.0 for f in FEATURES}
    row_data["cpu_utilization"] = np.nan
    import pandas as pd
    row = pd.Series(row_data)
    deviations = ex.feature_deviation(row, {"cpu_utilization": {"median": 1.0, "std": 1.0}})
    missing = [d for d in deviations if d["feature"] == "cpu_utilization"][0]
    assert missing["status"] == "missing"
    assert missing["value"] is None
