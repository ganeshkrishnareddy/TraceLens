# TraceLens frontend

React 19 + TypeScript + Vite + Tailwind dashboard for TraceLens.

## Run locally

From `D:\PROVISION_TRACELENS\frontend`:

```powershell
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to the backend at `http://localhost:8000`.

If the backend is not running, the dashboard automatically switches to representative demo data and shows an offline banner. No data is sent anywhere.

## Build and preview

```powershell
npm run build
npm run preview
```

`npm run build` type-checks with TypeScript and writes a production bundle to `dist/`. Preview runs on port 4173.

## Pages

- **Overview** — KPIs, detection chart, recent detections and incidents.
- **Data Lab** — generate seeded synthetic telemetry or upload a CSV, then preview statistics and rows.
- **Anomaly Detection** — train Isolation Forest or MAD detectors, run detection, review metrics and explanations.
- **Investigation** — triage incidents, inspect feature deviations and record status/notes.
- **Explainability** — per-record narratives, evidence, model interpretation, possible explanations, recommendations and unknowns.
- **Experiment Lab** — compare methods and thresholds on reproducible train/test splits.
- **Reports** — generate and download investigation reports and detection JSON.
- **About & Methodology** — architecture, datasets, evaluation approach, limitations and attribution.

## API wiring

All requests go through `src/api.ts`. When a request fails (backend stopped, proxy error, or timeout), that call returns demo data from an in-memory store and emits a mode change so the app shows the offline banner. Starting the backend and refreshing restores live data.
