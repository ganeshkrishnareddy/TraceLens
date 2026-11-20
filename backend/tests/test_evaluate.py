"""Tests for evaluation metric correctness on known inputs."""
import numpy as np

import evaluate as ev


def test_metrics_known_confusion_matrix():
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    y_pred = np.array([0, 0, 0, 1, 1, 1, 0, 1])
    m = ev.evaluate(y_true, y_pred)

    assert m.n_samples == 8
    assert m.n_true_anomaly == 4
    assert m.n_pred_anomaly == 4
    assert (m.true_negative, m.false_positive, m.false_negative, m.true_positive) == (3, 1, 1, 3)
    assert np.isclose(m.accuracy, 0.75)
    assert np.isclose(m.precision, 0.75)
    assert np.isclose(m.recall, 0.75)
    assert np.isclose(m.f1, 0.75)
    assert np.isclose(m.false_positive_rate, 0.25)
    assert m.roc_auc is None


def test_metrics_perfect_predictions():
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 0, 1, 1])
    m = ev.evaluate(y_true, y_pred, scores=np.array([0.1, 0.2, 0.8, 0.9]))
    assert m.accuracy == 1.0
    assert m.precision == 1.0
    assert m.recall == 1.0
    assert m.f1 == 1.0
    assert m.false_positive_rate == 0.0
    assert np.isclose(m.roc_auc, 1.0)


def test_zero_division_handled():
    y_true = np.array([0, 0, 0])
    y_pred = np.array([0, 0, 0])
    m = ev.evaluate(y_true, y_pred)
    assert m.precision == 0.0
    assert m.recall == 0.0
    assert m.f1 == 0.0
    assert m.false_positive_rate == 0.0
    assert m.true_positive == 0


def test_confusion_matrix_dict():
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 1, 1, 1])
    assert ev.confusion_matrix_dict(y_true, y_pred) == {"tn": 1, "fp": 1, "fn": 0, "tp": 2}
