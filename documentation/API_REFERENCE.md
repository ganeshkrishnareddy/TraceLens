# TraceLens — API Reference

> **Status note.** Two groups of endpoints are documented. **Current build**
> endpoints are verified against `backend/app/routes/` and were exercised by the
> 40-test suite on 2026-11-20. **Target** endpoints are defined in
> `TRANSFORMATION_CONTRACT.md` §6 and are being implemented by the backend agent.
> The base URL for local development is `http://localhost:8000`; interactive docs
> are at `/docs`.

## Conventions

- JSON request/response bodies unless noted.
- IDs are prefixed short hex strings: `ds-`, `mdl-`, `det-`, `inc-`, `exp-`, `rep-`.
- Errors are returned as real HTTP statuses: `400` for bad input / not found in
  service calls, `404` for unknown resources, `413` for oversized upload, `500`
  for unexpected failures.
- CORS permits the Vite dev origins with credentials (`backend/app/main.py`).
- Auth target: send `Authorization: Bearer <token>` on protected routes
  (`AUTHENTICATION.md`).

---

## Current build — verified endpoints

### Health & root

| Method | Path | Response |
|---|---|---|
| GET | `/` | `{"service":"TraceLens","docs":"/docs","health":"/api/health"}` |
| GET | `/api/health` | `{"status":"healthy","service":"TraceLens","version":"1.0.0"}` |

### Datasets — prefix `/api/datasets`

| Method | Path | Body / params | Response |
|---|---|---|---|
| GET | `""` | — | list of registered datasets |
| POST | `/generate` | `{n_normal:1200, n_anomaly:240, seed:20261120}` | `{dataset_id, n_rows, n_normal, n_anomaly, path, train_path, test_path}` |
| POST | `/upload` | multipart `file` (.csv, ≤25 MB) | `{dataset_id, name, n_rows}` |
| GET | `/{dataset_id}` | — | dataset record |
| GET | `/{dataset_id}/preview` | `?limit=50` | `{columns, n_rows, preview, stats}` |

Uploads are saved collision-safely under `datasets/raw/`; invalid CSVs are removed
and return 400; files over 25 MB return 413.

### Models — prefix `/api/models`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `""` | — | model registry |
| POST | `/train` | `{dataset_id, method, threshold, contamination, z_threshold}` | `{model_id, method, threshold, n_train}` |
| GET | `/status` | — | `{"models":[…],"count":n}` |

`method` is `isolation_forest` or `statistical_mad`. The model bundle
(`scaler`, `detector`, `method`, `threshold`, `feature_names`) is pickled to
`models/<model_id>.pkl` and cached in memory.

### Detection — prefix `/api/detection`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/run` | `{dataset_id, model_id, threshold?}` | `{detection_id, n_rows, n_flagged, threshold, method, metrics, rows, result_path}` |
| GET | `/results` | — | detection list |
| GET | `/results/{detection_id}` | — | full result JSON |
| POST | `/evaluate` | same as `/run` | re-runs detection and returns metrics |

Each row contains `record_id`, `score`, `flag`, `severity`, `affected_features`,
`explanation`, `deviations`, `true_label`. Metrics (when labels exist) include
accuracy, precision, recall, F1, FPR, confusion counts and ROC AUC. Flagged rows
create incidents automatically.

### Incidents — prefix `/api/incidents`

| Method | Path | Body / params | Response |
|---|---|---|---|
| GET | `""` | `?status=` | incident list |
| GET | `/{incident_id}` | — | incident record |
| POST | `/{incident_id}` | `{status?, notes?}` | `{"ok":true}` |

Current status is a free string (default `open`); the enforced lifecycle is target.

### Experiments — prefix `/api/experiments`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/run` | `{train_dataset_id, test_dataset_id, methods, thresholds}` | report with per-method metrics + `experiment_id` |
| GET | `""` | — | experiment registry |

Defaults: methods `["isolation_forest","statistical_mad"]`, thresholds
`{"isolation_forest":0.5,"statistical_mad":0.3}`.

### Reports — prefix `/api/reports`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `""` | — | report registry |
| POST | `""` | `{detection_id, kind}` | `{report_id, id, path, kind}` |
| GET | `/{report_id}/download` | — | file response (current Markdown report) |

### Canonical aliases (current)

| Method | Path | Equivalent |
|---|---|---|
| POST | `/api/train` | `POST /api/models/train` |
| POST | `/api/detect` | `POST /api/detection/run` |

---

## Target endpoints (contract §6)

### Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{email,password,name}` | `{user,token}` |
| POST | `/api/auth/login` | `{email,password}` | `{user,token}` |
| POST | `/api/auth/logout` | — | `{ok:true}` |
| GET | `/api/auth/me` | — | `{user}` |

### Incidents (extended)

| Method | Path | Body / params | Purpose |
|---|---|---|---|
| GET | `/api/incidents?status=&severity=` | query | add severity filter |
| POST | `/api/incidents/{id}/notes` | `{note}` | append note |
| POST | `/api/incidents/{id}/escalate` | `{reason,severity,priority,assigned_owner,investigation_summary,evidence_refs,recommended_action}` | escalate + audit entry |
| POST | `/api/incidents/{id}/resolve` | `{summary}` | resolve incident |
| GET | `/api/incidents/{id}/activity` | — | ordered audit trail |

Illegal lifecycle transitions and escalation of a missing incident are rejected.

### Demo & stats

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/api/demo/scenarios` | — | the six scenarios in `DEMO_GUIDE.md` |
| POST | `/api/demo/load` | `{scenario}` | labelled synthetic preview; never overwrites real datasets |
| POST | `/api/demo/reset` | — | restore initial demo state |
| GET | `/api/stats/overview` | — | counts derived from the DB only (no hardcoded numbers) |

### Reports (extended)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/reports/{id}/download?format=pdf\|csv\|json` | real file response for the requested format |

Report types: anomaly detection, incident investigation, escalation history,
experiment evaluation, dataset quality. Each includes generation time, dataset
info, method, findings and limitations; verified data only.

---

## Request models (`backend/app/schemas.py`, current)

`DatasetGenerateRequest` (n_normal, n_anomaly, seed) · `TrainRequest` (dataset_id,
method, threshold, contamination, z_threshold) · `DetectRequest` (dataset_id,
model_id, threshold) · `ExperimentRequest` (train_dataset_id, test_dataset_id,
methods, thresholds) · `IncidentUpdate` (status, notes) · `ReportRequest`
(detection_id, kind).

Target auth/escalation/notes/resolve models are added by the backend agent per the
contract payloads above.
