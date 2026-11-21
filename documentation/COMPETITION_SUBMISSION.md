# Competition Submission Guide

**Event:** AEGYTHON 2026 · ProgVision
**Project:** TraceLens — Explainable AI for Anomaly Detection and Intelligent
Incident Investigation
**Team / author:** P. Ganesh Krishna Reddy
**Portfolio:** https://pganeshkrishnareddy.vercel.app/

## What to submit

- Source repository root: `D:\PROVISION_TRACELENS` (or a zip of it excluding
  generated CSVs, `tracelens.db`, pickled models and `node_modules`).
- This README and the `documentation/` folder.
- A short live demo using the flow below.

## Elevator pitch

TraceLens turns raw system telemetry into explainable incident leads. It
generates reproducible labelled data, compares an Isolation Forest with a
robust MAD baseline, scores anomalies, and converts each flag into a structured
investigation narrative with evidence, recommended checks and explicit
unknowns — all behind a light-themed dashboard and a documented REST API.

## Demo script (5–7 minutes)

1. **Start** — run `START_TRACELENS.bat`; open http://localhost:5173.
2. **Data Lab** — generate the default 1440-row dataset (1200 normal / 240
   anomalous) and show preview plus missing-value stats.
3. **Detection** — train Isolation Forest (threshold 0.5) and run detection on
   the labelled data; show score distribution and measured metrics.
4. **Explainability** — open a flagged record; point out affected features,
   evidence, model interpretation, recommended investigation and unknowns.
5. **Investigation** — resolve an incident and add a note.
6. **Experiment Lab** — run both methods; show the measured comparison in
   `EXPERIMENT_RESULTS.md` (MAD recall 0.7639 vs Isolation Forest 0.5694 on the
   reference split).
7. **Reports** — generate and download the Markdown investigation report.
8. **Quality** — run `python -m pytest backend/tests tests -q` → 66 passed.

## API demo alternative

If the frontend is unavailable, use http://localhost:8000/docs and execute:

```
POST /api/datasets/generate
POST /api/models/train
POST /api/detection/run
GET  /api/incidents
POST /api/experiments/run
POST /api/reports
```

## Judging mapping

| Criterion | Evidence in this repository |
| --- | --- |
| Problem relevance | `PROBLEM_STATEMENT.md` |
| Technical depth | `SYSTEM_ARCHITECTURE.md`, `AI_ML_METHODOLOGY.md` |
| Data discipline | `DATASET_DOCUMENTATION.md`, seeded generator, leakage tests |
| Honest evaluation | `EXPERIMENT_RESULTS.md`, `evaluate.py` |
| Explainability | `explain.py`, Explainability page, structured narratives |
| Security awareness | `SECURITY_REVIEW.md` |
| Quality assurance | `TESTING_REPORT.md`, 35 passing tests |
| Honesty about scope | `LIMITATIONS.md` |

## Reproduction note

All results in the docs were produced on the developer machine with the exact
command in `EXPERIMENT_RESULTS.md`. No metric in the documentation is invented.
