"""Tests for IsolationForest and robust statistical detectors."""
import numpy as np

import data_generator as dg
import detect as dt
import features as fe


def _matrix():
    df = dg.generate_dataset(dg.GeneratorConfig(n_normal=100, n_anomaly=20, seed=21))
    bundle, _ = fe.prepare_features(df, fit=True)
    return bundle.X


def test_isolation_forest_detect_shapes_and_scores():
    X = _matrix()
    det = dt.IsolationForestDetector(contamination=0.1).fit(X)
    res = det.detect(X, threshold=0.5)
    assert res.method == "isolation_forest"
    assert res.scores.shape == (len(X),)
    assert res.flags.shape == (len(X),)
    assert set(np.unique(res.flags)) <= {0, 1}
    assert res.scores.min() >= 0.0 and res.scores.max() <= 1.0
    assert res.params["n_estimators"] == 200


def test_statistical_detector_detect_shapes_and_scores():
    X = _matrix()
    det = dt.StatisticalDetector(z_threshold=3.5).fit(X)
    res = det.detect(X, threshold=0.3)
    assert res.method == "statistical_mad"
    assert res.scores.shape == (len(X),)
    assert res.flags.shape == (len(X),)
    assert res.scores.min() >= 0.0 and res.scores.max() <= 1.0
    assert res.params["z_threshold"] == 3.5


def test_threshold_effect_isolation_forest():
    X = _matrix()
    det = dt.IsolationForestDetector(contamination=0.1).fit(X)
    low = det.detect(X, threshold=0.1)
    high = det.detect(X, threshold=0.9)
    assert low.flags.sum() >= high.flags.sum()
    assert high.flags.sum() < len(X)


def test_threshold_effect_statistical():
    X = _matrix()
    det = dt.StatisticalDetector(z_threshold=3.5).fit(X)
    low = det.detect(X, threshold=0.1)
    high = det.detect(X, threshold=0.9)
    assert low.flags.sum() >= high.flags.sum()


def test_detector_must_be_fitted():
    import pytest
    det = dt.StatisticalDetector()
    with pytest.raises(RuntimeError):
        det.score(np.zeros((2, len(fe.FEATURES))))


def test_get_detector_registry():
    assert isinstance(dt.get_detector("isolation_forest"), dt.IsolationForestDetector)
    assert isinstance(dt.get_detector("statistical_mad"), dt.StatisticalDetector)
    try:
        dt.get_detector("not_a_detector")
    except ValueError as exc:
        assert "Unknown detector" in str(exc)
    else:
        raise AssertionError("expected ValueError for unknown detector")
