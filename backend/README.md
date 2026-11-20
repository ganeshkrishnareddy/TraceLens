# TraceLens backend

FastAPI service that exposes the ML engine over HTTP and stores runs in a local SQLite database.

## Run locally

From `D:\PROVISION_TRACELENS\backend`:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/docs> for interactive API documentation.

Install dependencies first if needed:

```powershell
python -m pip install -r requirements.txt
```

## Run tests

From the project root (`D:\PROVISION_TRACELENS`):

```powershell
python -m pytest backend/tests -q
```

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness and service metadata |
| `GET /api/datasets` | List registered datasets |
| `POST /api/datasets/generate` | Generate a seeded synthetic telemetry dataset |
| `POST /api/datasets/upload` | Upload a telemetry CSV |
| `GET /api/datasets/{id}` | Dataset metadata |
| `GET /api/datasets/{id}/preview` | Column stats and first rows |
| `POST /api/train` | Train a detector (alias of `/api/models/train`) |
| `POST /api/detect` | Run detection (alias of `/api/detection/run`) |
| `GET /api/detection/results` | List detection runs |
| `GET /api/detection/results/{id}` | Full per-record detection result |
| `GET /api/incidents` | List incidents, optionally `?status=open` |
| `POST /api/incidents/{id}` | Update incident status and notes |
| `POST /api/experiments/run` | Compare methods and thresholds |
| `GET /api/experiments` | Experiment history |
| `POST /api/reports` | Generate a Markdown investigation report |
| `GET /api/reports` | Report history |
| `GET /api/reports/{id}/download` | Download a generated report |

## TraceLens 2.0 API additions

### Authentication (local prototype)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | `{email,password,name}` → `{user, token}` |
| `POST /api/auth/login` | `{email,password}` → `{user, token}` |
| `POST /api/auth/logout` | Revoke the bearer session → `{ok:true}` |
| `GET /api/auth/me` | Current user (requires `Authorization: Bearer <token>`) |

Demo account (seeded automatically, local prototype only):

```
email:    demo@tracelens.local
password: TraceLens2026!
```

Passwords are bcrypt-hashed over a SHA-256 digest; bearer tokens are opaque and
only their SHA-256 digest is stored in `sessions`. Existing data endpoints stay
open so the original integrations and 40-test baseline keep working; the app
layer gates authenticated views.

### Incidents and lifecycle

| Endpoint | Purpose |
| --- | --- |
| `GET /api/incidents?status=&severity=` | Filter incidents by status and/or severity |
| `POST /api/incidents/{id}/notes` | `{note}` → investigation note + audit entry |
| `POST /api/incidents/{id}/escalate` | Full escalation payload → `{escalation, incident}` + audit entry |
| `POST /api/incidents/{id}/resolve` | `{summary}` → `{incident}` + audit entry |
| `GET /api/incidents/{id}/activity` | Ordered audit trail (previous/new status, reason, timestamp) |

Lifecycle: `detected → triaged → investigating → escalated → mitigating → resolved → closed`.
Legacy `open` incidents are treated as `detected`. Backward/repeat transitions
return HTTP 409; escalating a missing incident returns HTTP 404.

### Demo, stats and reports

| Endpoint | Purpose |
| --- | --- |
| `GET /api/demo/scenarios` | The six exact scenario keys and their descriptions |
| `POST /api/demo/load` | `{scenario,n_rows?,seed?}` → labelled synthetic dataset preview |
| `POST /api/demo/reset` | Remove demo fixtures only; real datasets are never deleted |
| `GET /api/stats/overview` | Counts computed live from SQLite (no hardcoded numbers) |
| `GET /api/reports/{id}/download?format=pdf\|csv\|json` | Real file download |

Report kinds: `anomaly_detection`, `incident_investigation`, `escalation_history`,
`experiment_evaluation`, `dataset_quality` (legacy `investigation` still accepted).
Every report records generation time, dataset info, method, findings and
limitations derived from verified local data.

### Migration

```powershell
python D:\PROVISION_TRACELENS\scripts\migrate_v2.py
```

Additive only: creates missing tables/columns/indexes and seeds the demo account.
It prints before/after row counts and never resets or deletes data.

## Storage

- Datasets: `D:\PROVISION_TRACELENS\datasets`
- Models: `D:\PROVISION_TRACELENS\models`
- Detection results and reports: `D:\PROVISION_TRACELENS\reports`
- SQLite database: `D:\PROVISION_TRACELENS\tracelens.db`

The API allows requests from the Vite dev server on ports 5173 and 4173.
