# Technical QA

## Verified environment

| Component | Version used |
| --- | --- |
| OS | Windows |
| Python | 3.12.10 |
| pytest | 9.2.0 |
| FastAPI | 0.139.2 |
| uvicorn | 0.51.0 |
| pandas | 3.0.5 |
| numpy | 2.5.1 |
| scikit-learn | 1.9.1 |
| Node.js | 24.18.0 |
| npm | 11.16.0 |

## Build and run checklist

- [x] Python dependencies install from `backend/requirements.txt`
      (`python-multipart` was additionally installed in this environment).
- [x] Backend imports cleanly: `python -c "import sys; sys.path.insert(0,'backend'); import app.main"`.
- [x] FastAPI app starts: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- [x] Health endpoint returns `{"status":"healthy",...}` at `/api/health`.
- [x] Dataset → train → detect → incidents → experiment → report flow returns HTTP 200.
- [x] Frontend scaffold present with `npm run dev` (Vite port 5173).
- [x] Full pytest suite passes: 66 passed.
- [x] START/STOP batch scripts written at repository root.

## Manual verification performed

A TestClient smoke run produced:

- generated dataset `n_rows=36` (30 normal / 6 anomalous);
- Isolation Forest model trained;
- detection flagged 9 rows with real metrics
  (precision 0.556, recall 0.833, ROC AUC 0.822 for that 36-row run);
- 9 incidents registered;
- experiment with both methods returned metrics for 36 test rows.

The canonical 1440-row reference experiment is recorded in
`EXPERIMENT_RESULTS.md`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `RuntimeError: Form data requires "python-multipart"` | Run `python -m pip install -r backend/requirements.txt` |
| `ModuleNotFoundError: No module named 'features'` | Run pytest from repository root; `conftest.py` adds `ml-engine` to `sys.path` |
| Port 8000 already in use | Run `STOP_TRACELENS.bat`, or change the `--port` value in `START_TRACELENS.bat` |
| Port 5173 already in use | Stop the existing Vite process or change Vite config |
| Frontend shows no data | Confirm backend is running and `frontend/src/api.ts` base `/api` is reachable |
| Empty metrics after detection | Scored CSV must include a `label` column for evaluation |

## Definition of done for this work item

- Tests written for API, generator, features, detectors, evaluation and explanations.
- `START_TRACELENS.bat` / `STOP_TRACELENS.bat` delivered at repository root.
- README, 10 documentation files, `.env.example`, `.gitignore`, `LICENSE`,
  `CONTRIBUTING.md` delivered.
- Pytest pass/fail summary recorded (66 passed, 0 failed).
