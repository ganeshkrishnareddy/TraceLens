# TraceLens — Known Limitations

> Honest scope boundaries, grounded in `documentation/LIMITATIONS.md`,
> `documentation/SECURITY_REVIEW.md`, the source code and the transformation
> contract. Nothing here claims certification, production deployment, customers
> or unsupported accuracy.

## Data

- The default dataset is **synthetic** and visibly labelled. Patterns are clean
  and scenario-based; real telemetry is noisier, correlated and non-stationary.
- `missing_measurement` introduces NaNs simply; real missingness can be structural,
  bursty or informative.
- Timestamps are synthetic one-minute increments; the diurnal behaviour is a small
  sine term, not real seasonality.
- Demo scenario `latency_error_surge` is a combined demo label, not a distinct
  generator class (`DEMO_GUIDE.md`).

## Models

- API Isolation Forest scores are min-max normalised over the batch being scored:
  a threshold is comparable only within a single run. The CLI/artefact path uses a
  different, batch-independent formula — do not mix the two (`ML_METHODOLOGY.md`).
- The MAD detector assumes features are roughly independent for its
  fraction-of-extreme-features score; correlated metrics can double-count.
- Both detectors are unsupervised/semi-supervised baselines. They are not deep
  learning models and do not model temporal sequence structure.
- No retraining, drift detection or online learning is implemented.

## Explainability

- Explanations describe **observed deviations** and model decisions; they do not
  establish causal root cause. The `unknowns` section says so explicitly.
- Affected features are chosen by robust deviation, not by a model attribution
  method such as SHAP.
- In a detection run the baseline is computed from the dataset being scored, which
  suits exploration but should be replaced by a training-period baseline in a live
  system.

## Platform & security

- SQLite plus in-memory caching is intended for single-process local use — not a
  multi-user or distributed store.
- Current build has **no authentication, authorisation or rate limiting**; auth is
  a transformation target (`AUTHENTICATION.md`).
- CORS is development-permissive, fixed to the Vite dev origins.
- Pickled model bundles assume a trusted local filesystem.
- The frontend has no automated browser unit tests in the current suite.

## Evaluation

- Metrics are computed only when the scored dataset contains a `label` column.
- Reference results are for one seeded 432-window split (72 anomalies); zero false
  positives there is not a general performance claim. The two measured runs use
  different scoring paths and report different flag counts (`ML_METHODOLOGY.md`).

## Transformation gaps (in progress at this review)

- The public site, `/app/*` route structure and legacy redirects are target work;
  the current dashboard still uses the 8 legacy analyst pages.
- Incident lifecycle state machine, escalation, notes and audit trail are target
  endpoints; today only free-form status + notes updates exist.
- Scenario catalogue, Judge Mode and demo reset are target endpoints.
- Typed PDF/CSV/JSON report downloads are target; current reports are Markdown.
- `users`, `sessions`, `detection_results`, `escalations`, `investigation_notes` and
  `incident_activity` tables are target additions to `tracelens.db`.
- No acceptance journey has been executed end-to-end in a browser by this
  documentation owner; the ten journeys in `USER_JOURNEYS.md` are verified at
  code level only.

## Process

- No publication, deployment or GitHub push has been performed. Everything sits
  under `D:\PROVISION_TRACELENS` and stops for the person's review.
- Exact competition portal fields (deadline time, team-name field, submission
  format) are not locally verifiable; they remain open in `COMPETITION_CHECKLIST.md`.
