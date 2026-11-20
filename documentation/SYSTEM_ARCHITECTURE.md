# System Architecture

## Overview

TraceLens is a three-layer application:

```
React dashboard (Vite, port 5173)
        │  HTTP/JSON  (/api/*)
        ▼
FastAPI backend (uvicorn, port 8000)
        │  Python calls
        ▼
ml-engine (generator → features → detector → evaluate / explain / experiment)
        │
        ▼
Files (CSV / JSON / pickle / Markdown) + SQLite (tracelens.db)
```

## Components

### Frontend (`frontend/`)

- React 19, React Router 7, Vite 6, TailwindCSS 3, Recharts, lucide-react.
- Light theme with a fixed dark sidebar navigation.
- Pages: Overview, Data Lab, Anomaly Detection, Investigation, Explainability,
  Experiment Lab, Reports, About & Methodology.
- All server interaction is centralised in `src/api.ts`; the API base is `/api`.

### Backend (`backend/app/`)

- `main.py` creates the FastAPI app, adds permissive development CORS, includes
  all routers and exposes `/` plus `/api/health`.
- `config.py` resolves repository paths and makes `ml-engine` importable by
  inserting it into `sys.path` (the folder name contains a hyphen).
- `routes/` holds seven routers:

  | Router | Prefix | Key endpoints |
  | --- | --- | --- |
  | health | `/api` | `GET /health` |
  | datasets | `/api/datasets` | `GET ''`, `POST /generate`, `POST /upload`, `GET /{id}`, `GET /{id}/preview` |
  | models | `/api/models` | `GET ''`, `POST /train`, `GET /status` |
  | detection | `/api/detection` | `POST /run`, `GET /results`, `GET /results/{id}`, `POST /evaluate` |
  | incidents | `/api/incidents` | `GET ''`, `GET /{id}`, `POST /{id}` |
  | experiments | `/api/experiments` | `POST /run`, `GET ''` |
  | reports | `/api/reports` | `GET ''`, `POST ''`, `GET /{id}/download` |

- `services/ml_service.py` wraps ml-engine: generate, preview, train, persist,
  detect, explain, evaluate, experiment and report generation.
- `services/store.py` is a small SQLite-backed registry plus an in-memory model
  cache. Tables: `datasets`, `models`, `detections`, `incidents`, `experiments`,
  `reports`.

### ml-engine (`ml-engine/`)

Dependency-light modules with flat imports once the folder is on `sys.path`:

1. `data_generator.py` — reproducible normal/anomalous telemetry.
2. `features.py` — column validation, median imputation, `RobustScaler`.
3. `detect.py` — `IsolationForestDetector`, `StatisticalDetector`.
4. `evaluate.py` — confusion counts, precision, recall, F1, accuracy, FPR, ROC AUC.
5. `explain.py` — deviations, affected features, structured narrative.
6. `experiment.py` — reproducible train/test comparison persisting JSON + CSV.

## Data flow (one detection run)

1. `POST /api/datasets/generate` (or upload) writes a CSV and registers a dataset ID.
2. `POST /api/models/train` reads the CSV, fits `RobustScaler` and the chosen
   detector on training features, pickles the bundle to `models/` and registers a model ID.
3. `POST /api/detection/run` loads the bundle, prepares features with the saved
   scaler, produces scores and flags, builds explanations for flagged rows,
   writes a result JSON to `reports/`, registers a detection, creates one incident
   per flagged record, and computes metrics when labels are present.
4. `GET /api/incidents` and `POST /api/incidents/{id}` support triage.
5. `POST /api/reports` renders a Markdown investigation report from the result JSON.

## Persistence

| Directory | Contents |
| --- | --- |
| `datasets/` | Synthetic/uploaded CSVs, `.meta.json`, `tracelens.db` |
| `models/` | Pickled `{"scaler", "detector", "method", "threshold", "feature_names"}` bundles |
| `experiments/` | `experiment.json` and `<method>_predictions.csv` per run |
| `reports/` | Detection result JSON and generated Markdown reports |
| `logs/` | Reserved for runtime logs |

The SQLite registry is created at import time via `init_db()`; all directories
are created by `backend/app/config.py`.
