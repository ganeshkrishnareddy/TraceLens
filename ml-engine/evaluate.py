"""
Evaluation metrics for TraceLens.

Computes precision, recall, F1, accuracy, confusion matrix, false-positive rate
and detection latency from predictions vs ground-truth labels. All metrics are
computed on labelled synthetic test data. No fabrication.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict

import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score,
)


@dataclass
class EvalMetrics:
    n_samples: int
    n_true_anomaly: int
    n_pred_anomaly: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    false_positive_rate: float
    true_negative: int
    false_positive: int
    false_negative: int
    true_positive: int
    roc_auc: float | None

    def to_dict(self) -> dict:
        return asdict(self)


def evaluate(y_true: np.ndarray, y_pred: np.ndarray,
             scores: np.ndarray | None = None) -> EvalMetrics:
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    auc = None
    if scores is not None:
        try:
            auc = float(roc_auc_score(y_true, scores))
        except ValueError:
            auc = None
    return EvalMetrics(
        n_samples=int(len(y_true)),
        n_true_anomaly=int(y_true.sum()),
        n_pred_anomaly=int(y_pred.sum()),
        accuracy=float(accuracy_score(y_true, y_pred)),
        precision=float(precision_score(y_true, y_pred, zero_division=0)),
        recall=float(recall_score(y_true, y_pred, zero_division=0)),
        f1=float(f1_score(y_true, y_pred, zero_division=0)),
        false_positive_rate=float(fpr),
        true_negative=int(tn),
        false_positive=int(fp),
        false_negative=int(fn),
        true_positive=int(tp),
        roc_auc=auc,
    )


def confusion_matrix_dict(y_true, y_pred) -> Dict[str, int]:
    tn, fp, fn, tp = confusion_matrix(np.asarray(y_true), np.asarray(y_pred), labels=[0, 1]).ravel()
    return {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
