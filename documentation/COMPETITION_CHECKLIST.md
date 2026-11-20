# TraceLens — Competition Requirements & Submission Checklist

**Event:** AEGYTHON 2026 · Challenge 02 — "Find the Anomaly"
**Team / participant:** ProgVision · P. Ganesh Krishna Reddy (solo)
**Deadline:** 22 November 2026 (as briefed; confirm the exact cut-off time on the official portal)
**Owner of this checklist:** Tango · AGENT 1 (Research & Competition Strategist) + AGENT 8 (Independent Technical Reviewer)
**Last updated:** 2026-11-20
**Project root:** `D:\PROVISION_TRACELENS`

**Status legend**
- ✅ Done and verified against the files in this repository
- 🟡 Exists but incomplete or unverified end to end
- 🔴 Missing — must be produced before submission
- ⚪ Cannot verify locally — check the official challenge portal

---

## 1. Event, identity and eligibility

| # | Requirement | Detail recorded for this project | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1.1 | Competition | AEGYTHON 2026, Challenge 02 "Find the Anomaly" | Brief supplied by @MausBot; `README.md` | ✅ |
| 1.2 | Participant | P. Ganesh Krishna Reddy, team ProgVision, solo entry | `README.md` line 4 | ✅ |
| 1.3 | Submission deadline | 22 Nov 2026 | Brief. Exact portal time not locally verifiable | ⚪ |
| 1.4 | Independence | TraceLens is an independent project; **not** affiliated with or derived from the official AeglysAI .NET repository | Brief; no upstream code in repo | ✅ |
| 1.5 | Theme fit | Explainable AI for anomaly detection in system telemetry | `documentation/PROBLEM_STATEMENT.md` | ✅ |
| 1.6 | Registration / team name on portal | Must match "ProgVision" exactly | Not available locally | ⚪ |
| 1.7 | Required submission format (repo link, archive, form fields, file limits) | Unknown from the brief | Not available locally | ⚪ |
| 1.8 | Code licence | MIT, `LICENSE` present at repo root | `LICENSE` | ✅ |

**Action for 1.3 / 1.6 / 1.7:** open the official challenge page once and transcribe the exact deadline, team-name field and accepted submission format into this table. Nothing else in this checklist depends on those answers.

---

## 2. Judging rubric → evidence map

| Criterion | Weight | What a judge needs to see | Where it lives in this repo | Status |
| --- | ---: | --- | --- | --- |
| Functionality | 30 | App starts, generates data, trains, detects, explains, tracks incidents, exports a report | `START_TRACELENS.bat`, 7 API routers in `backend/app/routes/`, 8 React pages in `frontend/src/pages/`, `POST /api/reports` | 🟡 (see §4) |
| AI / ML | 25 | Two independent detectors, leakage-safe split, real metrics, explainability, experiments | `ml-engine/detect.py`, `features.py`, `evaluate.py`, `explain.py`, `experiment.py`; `documentation/AI_ML_METHODOLOGY.md` | ✅ |
| Creativity | 20 | Investigation narrative that separates evidence, interpretation, plausible explanation, next steps and unknowns; incident triage | `ml-engine/explain.py`; `frontend/src/pages/Investigation.tsx`, `Explainability.tsx`; `backend/app/routes/incidents.py` | ✅ |
| Reproducibility | 15 | Fixed seeds, pinned dependencies, one-command test run, documented data split and results | Seeds in generator/detectors; `backend/requirements.txt` pinned; `frontend/package-lock.json`; `python -m pytest backend/tests tests -q` → **35 passed**; `README.md` | 🟡 (see §3) |
| Video | 10 | Short demo of the working product | No video file anywhere in the repo | 🔴 |

**Rubric total available:** 100 points. Current honest self-assessment: **75/100** — see `documentation/RUBRIC_SELF_ASSESSMENT.md`.

---

## 3. Submission item checklist

| Item | Status | Location / command | Note |
| --- | --- | --- | --- |
| Working source code | ✅ | `backend/`, `frontend/`, `ml-engine/` | No build step required for the backend; `npm install` + Vite for the frontend |
| README with quick start | ✅ | `README.md` | Ports 5173 / 8000 documented |
| Problem statement | ✅ | `documentation/PROBLEM_STATEMENT.md` | |
| System architecture | ✅ | `documentation/SYSTEM_ARCHITECTURE.md` | |
| AI/ML methodology | ✅ | `documentation/AI_ML_METHODOLOGY.md` | |
| Dataset documentation | ✅ | `documentation/DATASET_DOCUMENTATION.md` | |
| Competition checklist | ✅ | This file | |
| Anomaly-method research | ✅ | `research/ANOMALY_DETECTION_METHODS.md` | |
| Architecture review | ✅ | `documentation/ARCHITECTURE_REVIEW.md` | |
| Rubric self-assessment | ✅ | `documentation/RUBRIC_SELF_ASSESSMENT.md` | |
| Experiment results | 🟡 | `experiments/exp-4ceb9977f528/`, `experiments/exp-e6f79ec7ab30/` | Raw JSON exists; the README-referenced `documentation/EXPERIMENT_RESULTS.md` was not present when checked (may be in progress by another agent) |
| Testing report | 🟡 | Fresh run: 35 passed, 2 deprecation warnings | README references `documentation/TESTING_REPORT.md`, not present at check time |
| Security review | 🔴 | — | Referenced by README, not present at check time |
| Limitations | 🔴 | — | Referenced by README, not present at check time |
| Competition submission / demo script | 🔴 | — | Referenced by README, not present at check time |
| Technical QA / troubleshooting | 🔴 | — | Referenced by README, not present at check time |
| Demo video | 🔴 | — | Worth up to 10 points; script is in `RUBRIC_SELF_ASSESSMENT.md` §5 |
| `.gitignore` | 🟡 | `.github/` exists; no root `.gitignore` confirmed | Exclude `node_modules/`, `*.db`, `__pycache__/`, generated CSVs before publishing the repo |
| GitHub push / publication | ✅ (intentionally not done) | — | Explicitly out of scope for this assignment |

---

## 4. Functional acceptance checks (the judge's click-through)

Run `START_TRACELENS.bat`, then confirm each item. Record a screenshot or a one-line note for each — these become the video storyboard.

1. `GET http://localhost:8000/api/health` → healthy JSON response.
2. Open `http://localhost:5173` → Overview renders without a console error; KPI tiles read from the API.
3. Data Lab → generate a labelled dataset with seed `20261120`; preview shows 8 numeric columns and the label distribution.
4. Detection → train `isolation_forest`, run detection, note score / flag counts; repeat with `statistical_mad` and a different threshold; the flagged count must change.
5. Investigation → open a flagged record; evidence, model interpretation, possible explanation, recommended investigation, unknowns and severity are all populated.
6. Incident workflow → change an incident status and add notes; reload and confirm persistence.
7. Experiment Lab → run both methods on a train/test split; metrics table shows non-fabricated precision, recall, F1, FPR and ROC AUC.
8. Reports → export a Markdown investigation report from a detection run and open the downloaded file.
9. Rerun the generator with the same seed and confirm identical rows (determinism claim).
10. `python -m pytest backend/tests tests -q` from the repo root → 35 passed.

Items 1–10 are the minimum evidence for the Functionality (30) and Reproducibility (15) criteria.

---

## 5. Close plan — 20–22 November 2026

| When | Action | Owner | Gate |
| --- | --- | --- | --- |
| 20 Nov, immediately | Read the official portal page; fill in §1 items 1.3, 1.6, 1.7 | Participant | Exact deadline + submission format known |
| 20 Nov | Finish the README-referenced docs marked 🔴/🟡 in §3 | Documentation agents | No broken doc links |
| 20–21 Nov | Execute §4 checks 1–10 and capture screenshots | Atlas + Panko | Every check passes |
| 21 Nov | Produce a 3–5 minute demo video following the §4 order | Participant / Atlas | Video uploaded or attached as permitted by the portal |
| 21 Nov | Run one canonical larger evaluation (e.g. 1200 normal / 240 anomalies) and record the numbers | Panko | Headline metrics have a defensible sample size |
| 22 Nov, well before the cut-off | Final submission; verify the confirmation screen | Participant | Receipt captured |

---

## 6. Open risks

1. **Video is the single largest unclaimed score (10 pts) and does not exist yet.** Everything needed for its storyboard is in §4.
2. **Documentation links in `README.md` point at six files that were absent at check time.** That is a direct reproducibility-credibility risk; quickest fix is to write short, honest files rather than leave broken links.
3. **Headline experiment numbers come from small runs (36 and 72 test rows) and move between runs.** Use the larger canonical run as the published result and keep the small ones as smoke tests.
4. **Exact portal rules are unknown locally** (deadline time, team-name field, accepted submission format, any file-size cap). One portal visit resolves all four.
5. **No end-to-end browser smoke test was performed by this reviewer this turn** — the acceptance list in §4 is a checklist, not a claim that each item was executed.

---

## 7. What was actually checked for this checklist

- Read `README.md`, all five pre-existing documents in `documentation/`, the six `ml-engine` modules, the seven API router definitions in `documentation/SYSTEM_ARCHITECTURE.md`, the eight frontend page files and `backend/requirements.txt`.
- Ran `python -m pytest backend/tests tests -q` on 2026-11-20 → **35 passed in 9.51s**, 2 third-party deprecation warnings (anyio `CallSpec2`, Starlette test-client `httpx`).
- Inspected both `experiments/*/experiment.json` files and their recorded metrics.
- Competition facts (event, challenge, deadline, weights, team, independence constraint) come from the assignment brief, not from a live portal fetch — a web lookup was attempted but unavailable this turn, so §1 portal fields are deliberately left as ⚪.

— Tango
