# TraceLens — AGENT 1 & AGENT 8 Plan (Retry)

> **SUPERSEDED (2026-11-20):** the go-ahead was received and the four deliverables were written under the filenames required by the current assignment, not the names proposed below. Use `documentation/COMPETITION_CHECKLIST.md`, `research/ANOMALY_DETECTION_METHODS.md`, `documentation/ARCHITECTURE_REVIEW.md` and `documentation/RUBRIC_SELF_ASSESSMENT.md`. The "no implementation until confirmed" note below no longer applies.

**Role:** AGENT 1 Research & Competition Strategist + AGENT 8 Independent Technical Reviewer  
**Project:** `D:\PROVISION_TRACELENS` — AEGYTHON 2026, Challenge 02 "Find the Anomaly", deadline Nov 22 2026  
**Owner:** P Ganesh Krishna Reddy, team ProgVision (solo)  
**Status:** Full structure exists; backend + ml-engine built; frontend scaffolded; no git repo yet; documentation/ is empty.

## What already exists (verified by reading every source file)

**ML engine** (`ml-engine/`) — complete: `data_generator.py` (seeded synthetic telemetry, 8 features, 9 anomaly scenarios, train/test split), `detect.py` (Isolation Forest + Statistical/MAD baseline), `features.py` (RobustScaler pipeline, median imputation), `explain.py` (per-feature deviation, narrative, severity, recommended investigation, unknowns), `evaluate.py` (precision/recall/F1/accuracy/FPR/confusion matrix/ROC-AUC), `experiment.py` (reproducible method comparison).

**Backend** (`backend/app/`) — complete: FastAPI with routes health / datasets / models / detection / incidents / experiments / reports; SQLite persistence (`tracelens.db`); store layer; ML service wiring; requirements (`fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `pytest`, `httpx`).

**Frontend** (`frontend/src/`) — scaffolded: React 19 + TS + Vite + Tailwind + Recharts, router with 8 pages. `Overview`, `DataLab`, `Detection`, `Investigation` are stubs. `Reports`, `ExperimentLab`, `Explainability`, `About` are implemented. `api.ts` wired to `/api`.

**Data:** `datasets/synthetic/` has seeded train/test CSVs. `experiments/exp-e6f79ec7ab30/` contains a completed two-method comparison (isolation forest F1 0.67, statistical MAD F1 0.91).

## My plan — documentation/ (AGENT 1 + AGENT 8), no implementation until confirmed

1. **Competition requirements checklist** (`documentation/competition_checklist.md`) — map each judging weight (functionality 30 / AI-ML 25 / creativity 20 / reproducibility 15 / video 10) to concrete deliverables in this repo; flag gaps (e.g., video not yet produced, reproducibility evidence thin).
2. **Anomaly detection research summary** (`documentation/anomaly_detection_research.md`) — Isolation Forest vs MAD baseline rationale, feature set justification, threshold selection approach, explainability design (evidence/interpretation/possible explanation/investigation/unknowns), limitations honestly stated.
3. **Architecture review against the rubric** (`documentation/architecture_review.md`) — review the full-stack architecture (React/Vite/Tailwind frontend → FastAPI backend → ml-engine → SQLite) against each judging weight; score current state per criterion; list recommendations and risks (e.g., no auth/multi-user, synthetic-only default data, frontend stub pages).
4. **Independent technical review** (`documentation/technical_review.md`) — AGENT 8 audit of correctness: data leakage (train/test split is stratified — good), metrics computation, explainability honesty (no fabricated root cause), severity scoring, missing-value handling, API contract consistency; note any bugs or gaps found.

All four files will be written to `D:\PROVISION_TRACELENS\documentation/`. I will not push to GitHub or publish anything, and I will not start implementation until @MausBot confirms the roles/go-ahead.

## What I need from @MausBot

A go-ahead (or any role adjustment) before I write the documentation files. Everything else is defaulted.

— Tango