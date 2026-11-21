# Testing Report

## Command

From the repository root (`D:\PROVISION_TRACELENS`):

```bat
python -m pytest backend/tests tests -q
```

## Summary (verified 2026-11-20, re-confirmed 2026-11-21)

| Metric | Result |
|---|---|
| Tests collected | 66 |
| Passed | 66 |
| Failed | 0 |
| Errors | 0 |
| Skipped | 0 |
| Runtime | 9.84 s (latest run); 19.50 s on the 2026-11-20 run |

Output: `66 passed, 2 warnings in 9.84s` (latest run).

Two third-party deprecation warnings were emitted and do not affect results:
- anyio `CallSpec2` renamed in pytest 10 (`anyio/pytest_plugin.py`).
- Starlette test-client `httpx` deprecation (`fastapi/testclient.py`).

> **Reviewer notes.**
> - Older documents in this repository state **35 passed** (before the determinism
>   tests in `tests/test_determinism.py`) or **40 passed** (an intermediate run).
>   The authoritative clean run on 2026-11-20 at reviewed commit `59bd8ed` recorded
>   **66 passed**, matching `README.md` and the transformation contract.
> - An earlier collection-time `NameError` in `backend/app/services/store.py::init_db()`
>   during parallel backend work was resolved before that commit; the 66-test run
>   imports the full suite successfully.

## Test inventory

### `backend/tests/test_api.py` — 7 tests

Root and `GET /api/health`; dataset generation, metadata and preview; model
training and registry; detection run, result JSON and listing; incident creation,
fetch, update and status filtering; experiment endpoint with both methods and
metrics; report creation and listing. Uses FastAPI `TestClient` against the real app
with module-scoped fixtures.

### `backend/tests/test_data_generator.py` — 6 tests

Same seed → identical DataFrame, different seeds → different data; row and label
counts; scenario presence and label/scenario consistency; required feature, ID and
timestamp columns; stratified 70/30 split sizes and disjoint record IDs.

### `backend/tests/test_features.py` — 8 tests

Missing-column validation; empty-dataset validation; valid-dataset validation;
prepared feature-matrix shape and names; median imputation of injected NaNs;
missing columns raise `ValueError`; scaler reuse without refit; `dataset_stats` counts.

### `backend/tests/test_detectors.py` — 6 tests

Isolation Forest score/flag shapes, range and params; statistical MAD score/flag
shapes, range and params; threshold effect (lower ⇒ at least as many flags) for
both detectors; unfitted detector raises `RuntimeError`; detector registry lookup
and unknown-detector error.

### `backend/tests/test_evaluate.py` — 4 tests

Metrics on a hand-computed confusion matrix (TN=3, FP=1, FN=1, TP=3); perfect
predictions with ROC AUC = 1; zero-division safety when nothing is flagged;
`confusion_matrix_dict` mapping.

### `tests/test_explain.py` — 4 tests

Explanation structure keys, severity and non-empty sections; severity boundaries
(low / medium / high / critical); anomalous `cpu_spike` row produces non-empty
affected features and evidence; missing measurement marked `status="missing"`.

### `tests/test_determinism.py` — 5 tests (reproducibility criterion)

- `test_generator_is_deterministic` — byte-identical CSVs for a fixed seed; different seed differs.
- `test_training_and_scoring_are_deterministic` — identical scores/flags for two trainings.
- `test_scores_are_batch_independent` — a single window equals its value in a batch.
- `test_cli_pipeline_reproduces_identical_outputs` — byte-identical model, report and detection outputs across two runs.
- `test_explanations_name_a_deviating_feature` — every flagged window names a deviating feature.

## Fixes made during earlier verification

- Installed `python-multipart` (listed in `backend/requirements.txt` but initially
  missing), required for the CSV upload route.
- Corrected ml-engine imports from a non-existent `ml_engine.*` package to the flat
  module names exposed by `sys.path`.
- Fixed the health route prefix so `GET /api/health` resolves.

## Not covered

Frontend unit tests, browser E2E tests, load testing and real production telemetry
are outside this suite. The ten acceptance journeys in `USER_JOURNEYS.md` are a
code-level map, not a claim of a completed browser click-through; final execution
is the orchestrator's review gate. See `KNOWN_LIMITATIONS.md`.
