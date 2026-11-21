# Experiment Results

All numbers below were **measured** by running the repository code on this
machine (Python 3.12.10, scikit-learn 1.9.1, pandas 3.0.5, numpy 2.5.1). They are
not targets or estimates. Results depend on generator seed and thresholds;
rerun the command to reproduce them.

## Reference experiment

Command used from the repository root:

```bat
python -c "import sys, pathlib, json; sys.path.insert(0,'ml-engine'); import data_generator as dg, experiment as ex; df=dg.generate_dataset(); tr,te=dg.make_train_test_split(df); r=ex.run_experiment(tr,te,['isolation_forest','statistical_mad'],{'isolation_forest':0.5,'statistical_mad':0.3},pathlib.Path('experiments/_doc_reference')); print(json.dumps([{'method':x['method'],'n_flagged':x['n_flagged'],'metrics':x['metrics']} for x in r['results']],indent=2))"
```

Configuration:

- Generator: `n_normal=1200`, `n_anomaly=240`, `seed=20261120` → 1440 rows
  (1200 normal / 240 anomalous).
- Split: stratified 70/30 → 1008 training rows, 432 test rows, 72 true anomalies
  in the test set.
- Scaler: `RobustScaler` fit on training data only.
- Thresholds: Isolation Forest 0.5, statistical MAD 0.3.

| Method | Flag threshold | Flagged | TP | FP | FN | TN | Accuracy | Precision | Recall | F1 | FPR | ROC AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| isolation_forest | 0.50 | 41 | 41 | 0 | 31 | 360 | 0.9282 | 1.0000 | 0.5694 | 0.7257 | 0.0000 | 0.8861 |
| statistical_mad | 0.30 | 55 | 55 | 0 | 17 | 360 | 0.9606 | 1.0000 | 0.7639 | 0.8661 | 0.0000 | 0.9011 |

## Reading the results

- Both detectors achieved **zero false positives** on this particular seeded
  test split; this is a property of this synthetic setup, not a guarantee for
  other data.
- The MAD detector recovered more true anomalies (55 vs 41) at the chosen
  thresholds, giving higher recall and F1.
- Isolation Forest still separated anomalies well by ranking (ROC AUC 0.886).
- Because scores are min-max normalised per evaluated batch for Isolation
  Forest, absolute thresholds should be interpreted within a single run.

## Reproducibility artefacts

Each experiment run writes:

- `experiments/<id>/experiment.json` — configuration, metrics, flagged counts.
- `experiments/<id>/<method>_predictions.csv` — record ID, score, flag and
  (when available) true label for every test record.

The reference artefacts from the command above are in
`experiments/_doc_reference/`.

## Test-suite evidence

The automated suite was run with `python -m pytest backend/tests tests -q`:
**66 passed**. See `TESTING_REPORT.md` for the inventory.
