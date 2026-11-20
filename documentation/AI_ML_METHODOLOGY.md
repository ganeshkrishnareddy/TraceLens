# AI/ML Methodology

## 1. Data generation (`data_generator.py`)

A seeded `numpy.random.Generator` produces normal telemetry around documented
centres:

| Feature | Normal centre (approx.) | Clipping |
| --- | --- | --- |
| cpu_utilization | 42 + mild diurnal term | 5–95 |
| memory_utilization | 55 | 20–90 |
| disk_io_mbps | 120 | 10–400 |
| network_mbps | 80 | 5–300 |
| request_rate | 450 | 50–1200 |
| response_latency_ms | 120 | 20–400 |
| error_rate | 0.5 | 0–5 |
| connection_count | 180 | 20–600 |

Nine anomaly scenarios are injected into labelled anomaly rows:
`cpu_spike`, `memory_leak`, `network_surge`, `latency_spike`, `error_surge`,
`combined_anomaly`, `multi_metric`, `missing_measurement`, `noisy`.
`missing_measurement` deliberately introduces NaNs so imputation is exercised.

Rows are shuffled with the same seed, timestamped at one-minute cadence and
assigned stable `REC-000000` style record IDs. Fixed seed + config yields a
byte-identical DataFrame (asserted in the tests).

## 2. Splitting

`make_train_test_split` uses `sklearn.model_selection.train_test_split` with
`stratify=df["label"]`, a fixed seed, and a default 70/30 split. The resulting
DataFrames are reset to independent indices and have disjoint record IDs, so a
record cannot appear in both train and test (leakage check in the tests).

## 3. Feature preparation (`features.py`)

- Required numeric columns are validated; missing columns or an empty dataset
  raise a clear message.
- Missing values are imputed with the column median computed from the frames
  supplied to the call.
- Non-numeric values are coerced with `pd.to_numeric(errors="coerce")` and then
  median-imputed again.
- `RobustScaler` (median / IQR) is fit on training data only and reused for test
  or detection data with `fit=False`, avoiding scale leakage.

## 4. Detectors (`detect.py`)

### Isolation Forest

`IsolationForest(n_estimators=200, contamination=0.1, random_state=20261120,
n_jobs=1)` is fit on the scaled training matrix. Anomaly score is the negated
`decision_function`, min-max normalised to `[0, 1]` for the evaluated batch.
A record is flagged when `score >= threshold`.

### Robust statistical detector (MAD baseline)

For each feature the detector stores `median` and `1.4826 × MAD` (floored at
`1e-9`). Robust z-scores are `|x − median| / scaled_MAD`. The score blends the
fraction of features exceeding `z_threshold` (weight 0.6) with a clipped
normalised maximum z-score (weight 0.4), then is clipped to `[0, 1]`. Default
flag threshold is 0.3.

Both detectors return a `DetectionResult` with method name, score array, binary
flag array, threshold and parameters.

## 5. Evaluation (`evaluate.py`)

`evaluate(y_true, y_pred, scores)` uses scikit-learn for accuracy, precision,
recall, F1, confusion matrix and ROC AUC. False-positive rate is
`fp / (fp + tn)` (0 when the denominator is 0). `zero_division=0` keeps metrics
well-defined when no anomalies are predicted. All values are cast to plain
floats/ints for JSON serialisation.

## 6. Explainability (`explain.py`)

For each flagged record:

1. `feature_deviation` compares each raw feature value to a baseline median
   and standard deviation, marking `missing`, `normal`, `elevated` or `extreme`.
2. `identify_affected_features` returns up to three `extreme` features, or, when
   none are extreme, the three largest absolute deviations.
3. `build_explanation` returns:
   - `evidence` — sentences grounded in actual value vs baseline;
   - `model_interpretation` — score, threshold and flag decision;
   - `possible_explanation` — explicitly non-causal pattern description;
   - `recommended_investigation` — concrete checks, with a data-collection hint
     for missing measurements;
   - `unknowns` — root cause, benign-vs-real and user impact are unknown;
   - `severity` — low (<0.4), medium (0.4–0.6), high (0.6–0.8), critical (≥0.8);
   - `narrative` — a single readable summary.

The system never asserts a causal root cause it did not measure.

## 7. Experiments (`experiment.py`)

`run_experiment` fits the scaler and each detector on the training frame, scores
the test frame, computes metrics when test labels exist, writes per-record
prediction CSVs and a consolidated `experiment.json`. The runner is seeded by
the data generator and stores its own UTC `created_at`, so comparisons can be
reproduced and audited.
