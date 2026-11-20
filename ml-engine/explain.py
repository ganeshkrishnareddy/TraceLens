"""
Explainability layer for TraceLens.

Translates model outputs and measurements into human-readable investigation
narratives. All explanations are grounded in actual computed values; no
fabricated root causes. Clearly separates observed evidence, model
interpretation, possible explanation, recommended investigation and unknowns.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd

from features import FEATURES


def feature_deviation(row: pd.Series, baseline: dict) -> List[Dict]:
    """Compute per-feature deviation vs baseline median."""
    out = []
    for f in FEATURES:
        val = row.get(f)
        b = baseline.get(f, {})
        med = b.get("median")
        if val is None or (isinstance(val, float) and np.isnan(val)):
            out.append({"feature": f, "value": None, "baseline_median": med,
                        "deviation": None, "relative_pct": None, "status": "missing"})
            continue
        dev = float(val) - float(med) if med is not None else None
        rel = (dev / med * 100) if (med and med != 0 and dev is not None) else None
        status = "normal"
        if dev is not None and med is not None:
            # rough: > 2 std-ish
            std = b.get("std") or 1.0
            if abs(dev) > 2 * std:
                status = "extreme"
            elif abs(dev) > 1 * std:
                status = "elevated"
        out.append({"feature": f, "value": float(val), "baseline_median": med,
                    "deviation": dev, "relative_pct": rel, "status": status})
    return out


def build_explanation(record: dict, score: float, method: str, threshold: float,
                      baseline: dict, affected: List[str]) -> dict:
    """Build a structured, human-readable explanation."""
    # observed evidence
    evidence = []
    for f in affected:
        val = record.get(f)
        med = baseline.get(f, {}).get("median")
        if val is None or (isinstance(val, float) and (val != val)):
            evidence.append(f"{f.replace('_', ' ')} measurement is missing.")
            continue
        if med is None:
            continue
        direction = "increased" if val > med else "decreased"
        pct = abs((val - med) / med * 100) if med != 0 else 0
        evidence.append(
            f"{f.replace('_', ' ').title()} {direction} from a baseline of "
            f"{med:.1f} to {val:.1f} ({pct:.0f}% change)."
        )

    severity = "low"
    if score >= 0.8:
        severity = "critical"
    elif score >= 0.6:
        severity = "high"
    elif score >= 0.4:
        severity = "medium"

    # model interpretation
    interp = (
        f"The {method.replace('_', ' ')} detector assigned an anomaly score of "
        f"{score:.3f} (threshold {threshold:.2f}). "
    )
    if score >= threshold:
        interp += "This exceeds the configured threshold, so the record is flagged as anomalous."
    else:
        interp += "This is below the configured threshold, so the record is not flagged."

    # possible explanation (careful, non-causal)
    if affected:
        possible = (
            "The deviation is concentrated in: " + ", ".join(a.replace("_", " ") for a in affected) +
            ". This pattern is consistent with a resource or traffic anomaly, but the "
            "detector cannot establish root cause."
        )
    else:
        possible = "No single feature dominated; the combination of measurements was unusual."

    # recommended investigation
    recs = [
        "Review the processes or services active during the flagged window.",
        "Cross-check with adjacent time windows to see if the deviation persists.",
        "Verify whether the measurement source or sensor is healthy (missing/noisy data).",
        "Compare against change-management or deployment events in the same period.",
    ]
    if "missing_measurement" in str(record.get("scenario", "")):
        recs.insert(0, "Confirm whether the missing values are a data-collection issue rather than a real outage.")

    # unknowns
    unknowns = [
        "Root cause is not determined by the detector.",
        "Whether the anomaly represents a real incident or a benign change is unknown.",
        "Impact on end users is not measured by this system.",
    ]

    narrative = (
        f"Anomaly score {score:.2f} ({severity} severity). " +
        (" ".join(evidence) if evidence else "No strong per-feature deviation noted.") +
        " " + interp
    )

    return {
        "severity": severity,
        "affected_features": affected,
        "evidence": evidence,
        "model_interpretation": interp,
        "possible_explanation": possible,
        "recommended_investigation": recs,
        "unknowns": unknowns,
        "narrative": narrative,
    }


def identify_affected_features(deviations: List[Dict], top_k: int = 3) -> List[str]:
    # features with extreme status first, then by abs deviation
    extremes = [d["feature"] for d in deviations if d.get("status") == "extreme"]
    if extremes:
        return extremes[:top_k]
    # fallback: sort by abs deviation
    valid = [d for d in deviations if d.get("deviation") is not None]
    valid.sort(key=lambda d: abs(d["deviation"]), reverse=True)
    return [d["feature"] for d in valid[:top_k]]
