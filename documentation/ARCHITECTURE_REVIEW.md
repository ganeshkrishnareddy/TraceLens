# TraceLens — Independent Architecture Review (AGENT 8)

**Reviewer:** Tango · AGENT 8 (Independent Technical Reviewer), also AGENT 1
**Date:** 2026-11-20
**Subject:** three-layer TraceLens architecture — React/Vite frontend → FastAPI backend → `ml-engine` → files + SQLite
**Method:** static read of the source and documentation files listed in §7, plus a fresh test run. No production deployment was reviewed; no browser smoke test was performed by this reviewer this turn.
**Verdict:** the architecture is sound and well separated for a two-day hackathon, with **three medium-risk correctness/credibility gaps** and **one high-risk missing artifact** (the demo video). Fix the gaps in §4 before submission.

---

## 1. Architecture as implemented

```
React 19 + Vite + Tailwind + Recharts (localhost:5173)
        │ HTTP/JSON via src/api.ts → /api
        ▼
FastAPI + uvicorn (localhost:8000)
        │  routes/ ── services/ml_service.py ── services/store.py
        ▼
ml-engine/  generator → features → detector → evaluate / explain / experiment
        │
        ▼
CSV + JSON + pickle + Markdown on disk   and   SQLite (tracelens.db)
```

- **Frontend** (`frontend/src/`): eight complete page components — `Overview`, `DataLab`, `Detection`, `Investigation`, `Explainability`, `ExperimentLab`, `Reports`, `About` — with centralised API calls in `api.ts`. All eight files contain real data-fetching and rendering logic; the earlier "stub page" state described in `TANGO_AGENT1_AGENT8_PLAN.md` is no longer current.
- **Backend** (`backend/app/`): seven routers (`health`, `datasets`, `models`, `detection`, `incidents`, `experiments`, `reports`), Pydantic schemas, an ML service wrapper, and a SQLite registry with an in-memory model cache. `config.py` puts the hyphenated `ml-engine` folder on `sys.path`.
- **ML core** (`ml-engine/`): six dependency-light modules — `data_generator.py`, `features.py`, `detect.py`, `evaluate.py`, `explain.py`, `experiment.py`.
- **Persistence**: generated/uploaded CSVs in `datasets/`, pickled `{scaler, detector, method, threshold, feature_names}` bundles in `models/`, per-run prediction CSVs + `experiment.json` in `experiments/`, detection JSON and Markdown in `reports/`, six tables in `tracelens.db`.

---

## 2. Architectural strengths

1. **Clean layer boundary.** The ML core has no FastAPI or React imports, so it can be tested directly; the backend is a thin orchestration layer; the frontend never computes metrics locally.
2. **Leakage-safe pipeline.** `RobustScaler` is fit on training data only and reused with `fit=False`; the train/test split is stratified and uses disjoint record IDs (`AI_ML_METHODOLOGY.md` §2–3).
3. **Determinism by design.** Fixed generator seed, fixed detector `random_state`, `n_jobs=1`, stored UTC `created_at` per experiment. Fixed seed + config is asserted to give byte-identical rows.
4. **Honest explainability.** The explanation object separates evidence, model interpretation, non-causal possible explanation, recommended investigation and unknowns; it never asserts an unmeasured root cause.
5. **Reproducible environment.** `backend/requirements.txt` pins exact versions (FastAPI 0.139.2, scikit-learn 1.9.1, pandas 3.0.5, …) and `frontend/package-lock.json` pins the Node tree; `START_TRACELENS.bat` / `STOP_TRACELENS.bat` give a one-command run.
6. **Test coverage across layers.** API, generator, feature, detector, evaluation and explanation tests all run from one command.

---

## 3. Data-flow review

| Stage | What happens | Review finding |
| --- | --- | --- |
| Generate | Seeded NumPy generator, 8 features, 9 anomaly scenarios, `REC-…` IDs | Good. Missing-value scenario deliberately exercises imputation. |
| Split | Stratified 70/30, disjoint IDs | Good. No leakage. |
| Prepare | Validate columns → coerce numerics → median-impute → `RobustScaler` fit on train only | Good. Minor risk: medians are computed from whatever frames are passed to the call; if a caller imputes train+test together, a small leakage path opens. Keep the calls separate. |
| Detect | Isolation Forest (200 trees) or MAD baseline, scores in `[0,1]` | **Gap G3** — Isolation Forest min–max normalises per batch, so scores are not comparable across runs. |
| Evaluate | scikit-learn metrics with `zero_division=0`, FPR and ROC AUC | Good. **Gap G4** — headline numbers come from 36/72-row runs and shift between them. |
| Explain | Baseline median/std deviation, top-3 affected features, structured narrative | **Gap G5** — explanation uses `std` while the detector uses robust MAD; the two can disagree about what is "extreme". |
| Persist | Pickle model bundle, SQLite registry, JSON/CSV/Markdown | Acceptable for a local demo. **Gap G6** — pickle deserialisation is a trust boundary; **Gap G7** — permissive CORS and no auth are fine locally but must be stated as demo-only. |
| Report | Markdown generated from a stored detection result | Good — report numbers are traceable to a persisted run. |
| Logging | `logs/` exists but is unused | **Gap G8** — no runtime log of parameters used for a given run beyond the experiment JSON. |

---

## 4. Prioritised gaps and recommendations

| ID | Severity | Gap | Evidence | Rubric impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| **G1** | **High** | No demo video exists | No video file in the repo; `README.md` does not reference one | Video 10/10 lost | Record a 3–5 min walkthrough following `COMPETITION_CHECKLIST.md` §4; include generation, training, detection, explanation, incident update and report export. Storyboard is already written. |
| **G2** | Medium | Six documentation files referenced by `README.md` were absent at review time (`EXPERIMENT_RESULTS.md`, `SECURITY_REVIEW.md`, `TESTING_REPORT.md`, `LIMITATIONS.md`, `COMPETITION_SUBMISSION.md`, `TECHNICAL_QA.md`) | README lines 152–157 vs. directory listing | Reproducibility 15, credibility | Write short, factual files or remove the links. Include the canonical experiment numbers and the 35-passed test run. Note: another agent may be writing these — re-check before submission. |
| **G3** | Medium | Isolation Forest scores are batch-relative | `detect.py` `score()` min–max normalises `raw` using that batch's min/max | AI/ML 25, Reproducibility 15 | Persist the raw `decision_function` alongside the normalised score, or calibrate against a fixed reference batch, so a threshold means the same thing on every run. |
| **G4** | Medium | Unstable headline metrics from small test sets | `exp-e6f79ec7ab30` (36 rows): MAD F1 0.909, IF 0.667; `exp-4ceb9977f528` (72 rows): both 0.870 | AI/ML 25 | Run the documented 1200/240 configuration as the canonical result, freeze the threshold on a validation split, then evaluate once on test. Keep small runs labelled "smoke test". |
| **G5** | Medium | Explanation and detector use different notions of deviation | `explain.py` uses baseline `std` with fallback 1.0; `detect.py` uses `1.4826 × MAD` | AI/ML 25, Creativity 20 | Drive `elevated`/`extreme` from the stored robust spread used at fit time, and state the units/threshold in the narrative. |
| **G6** | Low | Pickle model bundles are deserialised on load | `models/` bundle format in `SYSTEM_ARCHITECTURE.md` | Security perception | Document that bundles are local, self-generated artifacts only; never load a bundle from an untrusted upload. |
| **G7** | Low | Permissive development CORS, no authentication | `main.py` CORS setup per `SYSTEM_ARCHITECTURE.md` | Reproducibility 15 | Keep as-is for the demo but state "localhost demo, no auth" in `LIMITATIONS.md`. |
| **G8** | Low | No runtime log of the exact configuration per detection | `logs/` empty | Reproducibility 15 | Detection result JSON already stores method/threshold; add timestamp, seed and row counts there rather than adding a logging framework. |
| **G9** | Low | No end-to-end browser verification recorded by this reviewer | Static read only this turn | Functionality 30 | Execute the ten checks in `COMPETITION_CHECKLIST.md` §4 and record pass/fail. |

**Not gaps:** the repo has a root `LICENSE` (MIT), dependencies are pinned, the train/test split is leakage-safe, and all eight frontend pages are implemented. Those were checked and are fine.

---

## 5. Reviewer answers to likely judge questions

- **"Is this just a UI over a hard-coded score?"** No. Scores come from scikit-learn `IsolationForest.decision_function` or explicit per-feature MAD z-scores on loaded CSV data; metrics come from `sklearn.metrics`; the persisted prediction CSVs and experiment JSON allow independent recomputation.
- **"How do I reproduce the numbers?"** Generate with seed `20261120`, train with the recorded method/threshold, run detection, or open `experiments/<id>/experiment.json` plus the matching `*_predictions.csv`. Full commands are in `README.md` and `AI_ML_METHODOLOGY.md`.
- **"Does it claim to find root cause?"** No. `unknowns` explicitly lists root cause, benign-vs-real and user impact as undetermined.
- **"Why two detectors?"** Independent methods give a disagreement signal and a transparent baseline alongside a multivariate model; see `research/ANOMALY_DETECTION_METHODS.md` §4.
- **"What is the weakest part?"** The demo video (absent), followed by the small-sample headline metrics and the batch-relative Isolation Forest scores.

---

## 6. Change order for the remaining two days

1. **G1** — video (up to 10 points; nothing else comes close).
2. **G2** — close documentation links (protects 15 reproducibility points).
3. **G3 + G4** — fix score calibration and run the canonical evaluation (protects 25 AI/ML points).
4. **G5** — align explainability statistics (protects 20 creativity points).
5. **G9** — execute and record the acceptance checks (protects 30 functionality points).
6. **G6–G8** — only if time remains; document, do not refactor.

---

## 7. Verification performed for this review

- Files read: `README.md`; `documentation/PROBLEM_STATEMENT.md`, `SYSTEM_ARCHITECTURE.md`, `AI_ML_METHODOLOGY.md`, `DATASET_DOCUMENTATION.md`, `TANGO_AGENT1_AGENT8_PLAN.md`; all six `ml-engine/*.py` modules relevant to detection and explanation; `backend/requirements.txt`; the eight `frontend/src/pages/*.tsx` files; both `experiments/*/experiment.json` files.
- Command run from `D:\PROVISION_TRACELENS` on 2026-11-20:
  - `python -m pytest backend/tests tests -q` → **66 passed in 19.50s**, 2 third-party deprecation warnings (anyio `CallSpec2` alias; Starlette test client's `httpx` usage). Both are upstream library warnings, not TraceLens test failures.
- Not verified this turn: live browser click-through, frontend build output, API behaviour under a real server process, the exact official portal rules, and any video artifact.

— Tango
