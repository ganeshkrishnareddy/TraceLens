# TraceLens — ML Methodology

> This document is grounded in `ml-engine/*.py`, `experiments/*.json` and the
> dataset `.meta.json` files. Every dataset is **synthetic and labelled**; every
> metric below was computed locally, not estimated. Two scoring paths exist in the
> codebase and are described separately so numbers are never mixed.

## 1. Data generation (`ml-engine/data_generator.py`)

A seeded `numpy.random.Generator` (`RANDOM_SEED = 20261120`) creates normal
telemetry around documented centres:

| Feature | Normal centre (approx.) | Clip range |
|---|---|---|
| cpu_utilization | 42 + small diurnal sine term | 5–95 |
| memory_utilization | 55 | 20–90 |
| disk_io_mbps | 120 | 10–400 |
| network_mbps | 80 | 5–300 |
| request_rate | 450 | 50–1200 |
| response_latency_ms | 120 | 20–400 |
| error_rate | 0.5 | 0–5 |
| connection_count | 180 | 20–600 |

Default config: `n_normal=1200`, `n_anomaly=240`, `seed=20261120` → **1,440 rows**
(1,200 normal / 240 anomalous), one-minute timestamps from `2026-11-01T00:00:00`,
stable `REC-000000` IDs. A `.meta.json` sidecar records counts, features, seed and
scenario list (verified in `datasets/synthetic/telemetry.meta.json`).

Nine anomaly patterns are injected into the anomalous rows:

| Scenario | Injected pattern |
|---|---|
| `cpu_spike` | CPU ≈ 92–100% |
| `memory_leak` | Memory ≈ 88–99%, CPU nudged +8 |
| `network_surge` | Network ≥200 MB/s, connections ×2.5 |
| `latency_spike` | Latency ≥500 ms, request rate ×0.6 |
| `error_surge` | Error rate 5–25%, latency +200 ms |
| `combined_anomaly` | CPU, memory and error rate all high |
| `multi_metric` | Disk, network and connections high |
| `missing_measurement` | CPU and latency set to NaN |
| `noisy` | Large Gaussian noise on CPU and memory |

The six **demo** scenario keys are a separate catalogue (`DEMO_GUIDE.md`);
`latency_error_surge` combines the generator's latency and error patterns.

## 2. Splitting

`make_train_test_split(df, test_size=0.3, seed=...)` uses sklearn with
`stratify=df["label"]`, fixed seed and independent indices. Default: **1,008 train
/ 432 test**, 72 true anomalies in test, disjoint record IDs. The leakage check is
asserted in the tests.

## 3. Feature preparation (`ml-engine/features.py`)

- Validate the 8 required numeric columns; missing columns or empty input raise a
  clear `ValueError`.
- Median-impute missing values; coerce non-numeric with
  `pd.to_numeric(errors="coerce")` then impute again.
- `RobustScaler` (median/IQR) is fit on training data only and reused with
  `fit=False` for test/detection — no scale leakage.

## 4. Detectors

### Isolation Forest

`IsolationForest(n_estimators=200, contamination=0.1, random_state=20261120,
n_jobs=1)`, fit on the scaled training matrix. Two score implementations exist:

- **API path** (`detect.py::IsolationForestDetector.score`): negated
  `decision_function`, min-max normalised over the evaluated batch to `[0,1]`.
  Flag when `score >= threshold`. Because normalisation is per batch, a threshold
  is comparable only within one run.
- **CLI/artefact path** (`detect.py::score_matrix`, used by `train.py`):
  `clip(0.5 − decision_function, 0, 1)` — batch-independent.

### Robust statistical detector (MAD / IQR)

Per feature: median and `1.4826 × MAD` (floored at `1e-9`), plus Q1/Q3 for IQR.

- **API path** (`StatisticalDetector`): robust z = `|x − median| / scaled_MAD`;
  score = `0.6 × fraction(z ≥ z_threshold) + 0.4 × clip(max_z/(2·z_threshold),0,1)`,
  clipped to `[0,1]`; default z-threshold 3.5, flag threshold 0.3.
- **CLI/artefact path** (`score_matrix`):
  `0.5 × frac(MAD z ≥ z_threshold) + 0.25 × clip(max_z/(2·z_threshold),0,1)
   + 0.25 × frac(outside IQR fences)`, with IQR multiplier 1.5.

Both detectors return scores in `[0,1]` (higher = more anomalous) and binary flags.
The StatisticalDetector assumes features are roughly independent for its
fraction-of-extreme-features score; correlated metrics can double-count.

## 5. Evaluation (`ml-engine/evaluate.py`)

`evaluate(y_true, y_pred, scores)` uses scikit-learn for accuracy, precision,
recall, F1, confusion matrix and ROC AUC. FPR = `fp/(fp+tn)` (0 when undefined);
`zero_division=0` keeps metrics defined when nothing is flagged. All values are
cast to plain floats/ints for JSON.

## 6. Explainability (`ml-engine/explain.py`)

For each flagged record:

1. `feature_deviation` compares each raw value to a baseline median/std and marks
   `missing`, `normal`, `elevated` or `extreme`.
2. `identify_affected_features` returns up to three `extreme` features, else the
   three largest absolute deviations.
3. `build_explanation` returns **evidence** (value vs baseline sentences),
   **model_interpretation** (score/threshold/flag), **possible_explanation**
   (explicitly non-causal), **recommended_investigation**, **unknowns** (root cause,
   benign-vs-real and user impact are unknown), **severity** and a **narrative**.
   A missing measurement adds a data-collection check first.

Severity: low `<0.40` · medium `0.40–0.60` · high `0.60–0.80` · critical `≥0.80`.

The system never asserts a causal root cause it did not measure, and does not use
model-attribution methods such as SHAP.

## 7. Experiments & determinism

`experiment.py::run_experiment` fits the scaler and detectors on train, scores test,
writes per-record `<method>_predictions.csv` and a consolidated `experiment.json`.
`train.py::train_bundle` saves one joblib artefact (impute values, scaler, model,
statistical stats, baseline) with no wall-clock timestamps, so identical inputs and
seeds produce byte-identical artefacts and reports — asserted by 5 determinism tests.

## 8. Measured results

### Reference experiment — `experiments/_doc_reference/experiment.json`
Seed 20261120; 1,008 train / 432 test; 72 true anomalies.

| Method | Thresh | TP | FP | FN | TN | Accuracy | Precision | Recall | F1 | FPR | ROC AUC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| isolation_forest | 0.50 | 41 | 0 | 31 | 360 | 0.9282 | 1.0000 | 0.5694 | 0.7257 | 0.0000 | 0.8861 |
| statistical_mad | 0.30 | 55 | 0 | 17 | 360 | 0.9606 | 1.0000 | 0.7639 | 0.8661 | 0.0000 | 0.9011 |

### Independent CLI/artefact run — `experiments/train_report.json`
Same seed and split, different scoring implementation.

| Method | Thresh | TP | FP | FN | TN | Accuracy | Precision | Recall | F1 | FPR | ROC AUC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| isolation_forest | 0.50 | 40 | 0 | 32 | 360 | 0.9259 | 1.0000 | 0.5556 | 0.7143 | 0.0000 | 0.8859 |
| statistical_mad | 0.30 | 45 | 0 | 27 | 360 | 0.9375 | 1.0000 | 0.6250 | 0.7692 | 0.0000 | 0.9013 |

Zero false positives is a property of this synthetic split, **not** a general
performance claim. Absolute Isolation Forest thresholds from the API path are only
meaningful within a single batch.

## 9. Reproduce

```bat
python -c "import sys, pathlib, json; sys.path.insert(0,'ml-engine'); import data_generator as dg, experiment as ex; df=dg.generate_dataset(); tr,te=dg.make_train_test_split(df); r=ex.run_experiment(tr,te,['isolation_forest','statistical_mad'],{'isolation_forest':0.5,'statistical_mad':0.3},pathlib.Path('experiments/_reproduce')); print(json.dumps([{'method':x['method'],'metrics':x['metrics']} for x in r['results']],indent=2))"
python ml-engine/train.py
python ml-engine/detect.py
python -m pytest backend/tests tests -q
```

See `KNOWN_LIMITATIONS.md` for the honest scope boundaries of this methodology.
