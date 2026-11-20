# TraceLens — Database Schema

> **Status note.** The **current** schema below is verified from
> `backend/app/services/store.py` (`init_db()`) and the live `tracelens.db`. The
> **target** extensions come from `TRANSFORMATION_CONTRACT.md` §6 and §Database.
> Migrations must **extend** `tracelens.db` via `scripts/migrate_*.py` and must
> never silently reset or delete existing data.

## Storage model

- Primary store: SQLite at `D:\PROVISION_TRACELENS\tracelens.db`.
- Registry tables hold metadata; large payloads live as files under `datasets/`,
  `models/`, `experiments/` and `reports/`; paths are stored in the tables.
- Models are additionally cached in memory (`_MODELS` dict) and reloaded from the
  pickled file on cache miss.
- IDs are generated with `uuid4().hex[:12]` plus a prefix.

## Current tables (verified)

### `datasets`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `ds-<hex>` |
| `name` | TEXT | File name |
| `path` | TEXT | CSV path |
| `n_rows` | INTEGER | Row count |
| `created_at` | TEXT | UTC ISO timestamp |
| `kind` | TEXT | `synthetic` / `train` / `test` / `uploaded` |

### `models`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `mdl-<hex>` |
| `dataset_id` | TEXT | Source dataset |
| `method` | TEXT | `isolation_forest` / `statistical_mad` |
| `threshold` | REAL | Flag threshold used at training |
| `created_at` | TEXT | UTC ISO timestamp |
| `path` | TEXT | Pickle path (updated after training) |

### `detections`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `det-<hex>` |
| `dataset_id` | TEXT | Scored dataset |
| `model_id` | TEXT | Model used |
| `method` | TEXT | Detector method |
| `threshold` | REAL | Threshold used |
| `n_flagged` | INTEGER | Number of flagged rows |
| `created_at` | TEXT | UTC ISO timestamp |
| `result_path` | TEXT | Full result JSON path |

### `incidents`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `inc-<hex>` |
| `detection_id` | TEXT | Parent detection |
| `record_id` | TEXT | `REC-000000` window |
| `score` | REAL | Anomaly score `[0,1]` |
| `severity` | TEXT | low / medium / high / critical |
| `status` | TEXT | Current status (default `open` today) |
| `notes` | TEXT | Analyst notes |
| `created_at` | TEXT | UTC ISO timestamp |

### `experiments`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `exp-<hex>` |
| `name` | TEXT | Experiment name |
| `created_at` | TEXT | UTC ISO timestamp |
| `result_path` | TEXT | `experiment.json` path |

### `reports`

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `rep-<hex>` |
| `kind` | TEXT | Report kind |
| `created_at` | TEXT | UTC ISO timestamp |
| `path` | TEXT | Generated report file path |

## Target tables (contract §6)

The transformation extends the store with:

| Table | Purpose |
|---|---|
| `users` | Local demo accounts (hashed passwords) for auth |
| `sessions` | Opaque Bearer tokens, owner and expiry |
| `datasets` | extended (existing) |
| `models` | extended (existing) |
| `detections` | extended (existing) |
| `detection_results` | per-record scored rows persisted relationally |
| `incidents` | extended with lifecycle fields (status state machine, severity, priority, owner) |
| `escalations` | escalation payloads from `ESCALATION_WORKFLOW.md` |
| `investigation_notes` | timestamped notes per incident |
| `incident_activity` | ordered audit trail of every state change |
| `experiments` | extended (existing) |
| `reports` | extended (existing) with report type / format metadata |

## Migration policy

- Provide `scripts/migrate_*.py`; use `CREATE TABLE IF NOT EXISTS` and
  `ALTER TABLE … ADD COLUMN` style changes that are idempotent.
- Preserve every existing row in `datasets`, `models`, `detections`, `incidents`,
  `experiments` and `reports`.
- Backfill new columns with safe defaults (e.g. current incident `open` → `detected`
  mapping decided by the backend agent) rather than dropping data.
- `GET /api/stats/overview` must derive all counts from these tables — no hardcoded
  numbers (contract §6).

## Relationship sketch

```
datasets ─< models ─< detections ─< incidents ─< investigation_notes
                          │              ├──────< escalations
                          └── detection_results   └──────< incident_activity
users ─< sessions        experiments        reports
```

All data in the demo comes from visibly labelled **synthetic** telemetry; the
database does not contain real customer or production records.
