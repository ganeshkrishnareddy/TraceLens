# Limitations

## Data

- The default dataset is **synthetic**. Patterns are deliberately clean and
  scenario-based; real telemetry is noisier, correlated and non-stationary.
- `missing_measurement` creates NaNs in a simple way; real missingness can be
  structural, bursty or informative.
- Timestamps are synthetic one-minute increments, so diurnal behaviour is a
  small sine term rather than real seasonal traffic.

## Models

- Isolation Forest scores are min-max normalised over the batch being scored;
  a threshold is comparable only within one run, not across different batches.
- The MAD detector assumes features are roughly independent for its
  fraction-of-extreme-features score. Correlated metrics can double-count.
- Both detectors are unsupervised/semi-supervised baselines. They are not deep
  learning models and do not model temporal sequence structure.
- No model retraining, drift detection or online learning is implemented.

## Explainability

- Explanations describe **observed deviations** and model decisions. They do
  **not** establish causal root cause; the `unknowns` section says so explicitly.
- Affected features are chosen by robust deviation, not by a model attribution
  method such as SHAP.
- Baselines in a detection run are computed from the dataset being scored,
  which is appropriate for exploration but should be replaced by a production
  training-period baseline in a live system.

## Platform

- SQLite plus in-memory caching is intended for single-process local use; it is
  not a multi-user or distributed store.
- No authentication, authorisation or rate limiting (see `SECURITY_REVIEW.md`).
- CORS is development-permissive.
- Pickled model bundles assume a trusted local filesystem.
- Frontend has no automated browser tests in this suite.

## Evaluation

- Metrics are computed only when the scored dataset contains a `label` column.
- The reference results in `EXPERIMENT_RESULTS.md` are for one seeded split;
  zero false positives there is not a general performance claim.
