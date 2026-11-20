# TraceLens — Rubric Self-Assessment

**Assessor:** Tango · AGENT 1 / AGENT 8 (independent of the implementing agents)
**Date:** 2026-11-20
**Basis:** AEGYTHON 2026 Challenge 02 "Find the Anomaly" weights as briefed — functionality 30 / AI–ML 25 / creativity 20 / reproducibility 15 / video 10.
**Method:** score what is demonstrably present in `D:\PROVISION_TRACELENS` today, not what is planned. Deductions are explicit and tied to a named gap. This is a **self-assessment**, not an official score.

---

## 1. Scorecard

| Criterion | Weight | Score | Basis | Deduction reason |
| --- | ---: | ---: | --- | --- |
| Functionality | 30 | **26** | Seven API router groups, eight implemented React pages, seeded generator, two detectors, threshold control, incident triage, experiment comparison, Markdown report export; 35 tests pass | 4 withheld: no end-to-end browser smoke test was recorded by this assessor, and the acceptance list in `COMPETITION_CHECKLIST.md` §4 has not been signed off item by item |
| AI / ML | 25 | **20** | Two independent detectors, leakage-safe stratified split, robust scaling fit on train only, scikit-learn metrics (precision/recall/F1/FPR/ROC AUC), per-record structured explanations, reproducible experiment runner | 5 withheld: headline metrics come from 36/72-row runs and shift between them (0.667 → 0.870 F1 for Isolation Forest); Isolation Forest scores are batch-relative; threshold selection on test is not ruled out |
| Creativity | 20 | **17** | Investigation narrative separates observed evidence / model interpretation / non-causal possible explanation / recommended checks / explicit unknowns; incident workflow; method-comparison UI; honest "we do not claim root cause" stance | 3 withheld: no SHAP/LIME or counterfactual view, and explanation statistics (std) are not aligned with the detector's robust MAD spread |
| Reproducibility | 15 | **12** | Fixed seeds, pinned `backend/requirements.txt` and `frontend/package-lock.json`, one-command start/stop scripts, documented split and imputation policy, persisted experiment JSON + per-record prediction CSVs, MIT `LICENSE`, one-command test suite | 3 withheld: six README-referenced documents were absent at check time; no recorded canonical large run; no documented runtime config log |
| Video | 10 | **0** | No video artifact exists | Full deduction — highest-value single fix available |
| **Total** | **100** | **75** | | |

**Reading:** the code and ML work are submission-ready; the score is being held back mainly by **missing presentation and evidence artifacts**, not by missing engineering.

---

## 2. What would move each score

| Criterion | Current | Realistic ceiling in 2 days | Condition |
| --- | ---: | ---: | --- |
| Functionality | 26 | 29–30 | Execute and record `COMPETITION_CHECKLIST.md` §4 checks 1–10 |
| AI / ML | 20 | 23–24 | Larger canonical evaluation + fixed-threshold-on-validation + score calibration |
| Creativity | 17 | 19–20 | Align explanation to robust statistics; add one comparison visual (e.g. method agreement) |
| Reproducibility | 12 | 14–15 | Write the six missing docs; publish canonical commands and numbers |
| Video | 0 | 8–10 | 3–5 min demo showing the ten acceptance checks |
| **Total** | **75** | **88–98** | |

---

## 3. Top five improvements (ranked by points recoverable ÷ effort)

### 1. Produce the demo video — up to +10 points
Highest return by a wide margin. Storyboard follows the acceptance order in `COMPETITION_CHECKLIST.md` §4:

1. 0:00–0:25 — title card: "TraceLens — Explainable Anomaly Detection for System Telemetry", AEGYTHON 2026 Challenge 02, ProgVision.
2. 0:25–1:00 — `START_TRACELENS.bat`, health endpoint, Overview page.
3. 1:00–1:45 — Data Lab: generate 1200 normal + 240 anomalies, seed `20261120`, show preview statistics and label counts.
4. 1:45–2:30 — Detection: train Isolation Forest, run detection, change the threshold live, point at the changed flag count.
5. 2:30–3:15 — Investigation: open a flagged record and read the five explanation fields aloud, emphasising "root cause unknown".
6. 3:15–3:45 — Experiment Lab: run both methods, show precision/recall/F1 and ROC AUC from real predictions.
7. 3:45–4:15 — Update an incident status + notes; export a Markdown report and open it.
8. 4:15–4:30 — Closing card: reproducibility claims (seed, pinned dependencies, 35 passing tests) and repo location.

Keep it narrated, captioned and under five minutes. Do not claim causality anywhere in the voiceover.

### 2. Close the documentation gaps — up to +3 reproducibility points
Write short, factual versions of the six README-referenced files. Minimum useful content:
- `EXPERIMENT_RESULTS.md` — both recorded runs in a table, exact commands, honest small-sample caveat, and the canonical large run once available.
- `TESTING_REPORT.md` — the 35-passed command output and the two upstream deprecation warnings.
- `SECURITY_REVIEW.md` — localhost demo, permissive CORS, no auth, pickle bundles are self-generated only, uploaded CSVs are parsed as data not code.
- `LIMITATIONS.md` — synthetic telemetry, no root cause, no drift/streaming, small samples.
- `COMPETITION_SUBMISSION.md` — mapping of each rubric criterion to a repo artifact + the §4 demo script.
- `TECHNICAL_QA.md` — install, start, stop, test, troubleshooting.

### 3. Strengthen the AI/ML evidence — up to +4 points
- Run 1200 normal / 240 anomalies with the default seed and publish that as the headline result; move the 36/72-row runs to a "smoke tests" section.
- Select the detection threshold on a validation split, freeze it, then evaluate once on the held-out test set; state this in the methodology.
- Persist the raw Isolation Forest `decision_function` value next to the batch-normalised score so thresholds are comparable across runs.

### 4. Align explainability with the detector — up to +2 points
Drive `elevated` / `extreme` from the same robust spread (`1.4826 × MAD`) used by `StatisticalDetector`, and print the threshold and units in the narrative. This closes the gap where an explanation can call a feature extreme while the robust detector does not.

### 5. Record end-to-end verification — up to +4 functionality confidence points
Execute checks 1–10 in `COMPETITION_CHECKLIST.md` §4, save pass/fail notes and a few screenshots, and paste the summary into `TECHNICAL_QA.md`. This converts "the code appears complete" into "the product was observed working".

---

## 4. Evidence used for this assessment

- Static review of `README.md`, `PROBLEM_STATEMENT.md`, `SYSTEM_ARCHITECTURE.md`, `AI_ML_METHODOLOGY.md`, `DATASET_DOCUMENTATION.md`, all six `ml-engine` modules, `backend/requirements.txt`, all eight frontend page components, and both experiment JSON files.
- Fresh test run on 2026-11-20 from `D:\PROVISION_TRACELENS`: `python -m pytest backend/tests tests -q` → **35 passed in 9.51s**, 2 upstream deprecation warnings.
- Measured experiment figures (copied, not estimated):

| Run | Test rows | Method | F1 | ROC AUC |
| --- | ---: | --- | ---: | ---: |
| `exp-e6f79ec7ab30` | 36 | isolation_forest | 0.667 | 0.950 |
| `exp-e6f79ec7ab30` | 36 | statistical_mad | 0.909 | 0.978 |
| `exp-4ceb9977f528` | 72 | isolation_forest | 0.870 | 0.876 |
| `exp-4ceb9977f528` | 72 | statistical_mad | 0.870 | 0.876 |

- The event, deadline, weights, team and independence constraint come from the assignment brief; exact official portal submission rules were not locally verifiable.

---

## 5. Assessor's one-line conclusion

TraceLens is a strong 75-point implementation today; the fastest path to a competitive score is not more code — it is the video, the missing documentation, and one larger, honestly reported evaluation run.

— Tango
