# TraceLens — Demo Video Narration Script

**Audience:** AEGYTHON 2026 Challenge 02 judges
**Format:** screen recording with voiceover, 1080p, captions on
**Total runtime:** 108 seconds (8 s title + 92 s product + 8 s summary)
**Routes:** exactly the eight pages registered in `frontend/src/App.tsx`
**Rule for this script:** every number spoken is read from a local file in this repository. No invented names, figures or claims.

---

## Timing overview

| # | Segment | Route | Seconds | Running time |
| ---: | --- | --- | ---: | ---: |
| 0 | Title slate | — | 8 | 0:00–0:08 |
| 1 | Overview | `/` | 10 | 0:08–0:18 |
| 2 | Data Lab | `/data` | 12 | 0:18–0:30 |
| 3 | Anomaly Detection | `/detect` | 12 | 0:30–0:42 |
| 4 | Investigation | `/investigate` | 12 | 0:42–0:54 |
| 5 | Explainability | `/explain` | 12 | 0:54–1:06 |
| 6 | Experiment Lab | `/experiments` | 13 | 1:06–1:19 |
| 7 | Reports | `/reports` | 11 | 1:19–1:30 |
| 8 | About & Methodology | `/about` | 10 | 1:30–1:40 |
| 9 | Summary slate | — | 8 | 1:40–1:48 |

---

## Shot 0 — Title slate

- **Duration:** 8 seconds (0:00–0:08)
- **On-screen action:** Static slate. Title "TraceLens", subtitle "Explainable Anomaly Detection and Intelligent Incident Investigation", footer "AEGYTHON 2026 · Challenge 02 — Find the Anomaly · ProgVision · P. Ganesh Krishna Reddy". Hold for the full 8 seconds; no cursor movement.
- **Narration:** "TraceLens is an explainable anomaly-detection workbench for system telemetry. This demo shows the full path from generated data to an investigated incident."
- **Proof point:** Establishes the challenge entry and that the demo covers an end-to-end workflow.

---

## Shot 1 — Overview

- **Page / route:** Overview — `/`
- **Duration:** 10 seconds (0:08–0:18)
- **On-screen action:** Start the app with the backend running on port 8000, open `http://localhost:5173/`, let the KPI tiles load, then move the cursor slowly across the dataset, model, detection and incident counts. Do not click anything. Confirm no "Backend is offline" banner is visible.
- **Narration:** "The overview reads its counts from the running API. Datasets, trained models, detection runs and incidents are all registered records, so the numbers on screen come from work that was actually executed."
- **Proof point:** The dashboard is backed by a live API and persisted records, not static mock tiles.

---

## Shot 2 — Data Lab

- **Page / route:** Data Lab — `/data`
- **Duration:** 12 seconds (0:18–0:30)
- **On-screen action:** In the generate form, set 1,200 normal rows, 240 anomalies and seed `20261120`; click Generate. Scroll to the preview and hold on the label distribution and column statistics for the final 4 seconds.
- **Narration:** "Data Lab generates 1,440 labelled telemetry windows with one fixed seed: 1,200 normal and 240 anomalous. The standard split produces 1,008 training rows and 432 test rows. The preview statistics and label counts are computed from the generated file."
- **Proof point:** 1,440 windows (1,200 normal / 240 anomalies), split 1,008 train / 432 test — verified in `telemetry.meta.json` and `train_report.json`.

---

## Shot 3 — Anomaly Detection

- **Page / route:** Anomaly Detection — `/detect`
- **Duration:** 12 seconds (0:30–0:42)
- **On-screen action:** Train the Isolation Forest detector at threshold 0.5, then run detection on the test dataset. Hold on the metrics block: 40 flagged rows, precision, recall, F1, false-positive rate and ROC AUC. Pause 2 seconds on the score distribution.
- **Narration:** "On the 432-row test set, Isolation Forest flags 40 windows. Precision is 1.000 with zero false positives, recall is 0.556, F1 is 0.714 and ROC AUC is 0.886. Changing the threshold changes the flag count; the scores are computed, not assigned."
- **Proof point:** Isolation Forest — precision 1.000 / recall 0.556 / F1 0.714 / ROC AUC 0.886 (from `train_report.json`).

---

## Shot 4 — Investigation

- **Page / route:** Investigation — `/investigate`
- **Duration:** 12 seconds (0:42–0:54)
- **On-screen action:** Filter to flagged records and open `REC-000123`. Zoom slightly on the severity badge, the three affected features and the deviation table so the CPU, memory and error-rate rows are readable.
- **Narration:** "Opening the flagged window REC-000123 shows an anomaly score of 0.551 and medium severity. CPU is 105 percent above its baseline, memory 58 percent, and error rate 697 percent. Each value is compared with a baseline measured from the training data."
- **Proof point:** Sample explanation `REC-000123` — CPU +105%, memory +58%, error rate +697% (from `detections.json`).

---

## Shot 5 — Explainability

- **Page / route:** Explainability — `/explain`
- **Duration:** 12 seconds (0:54–1:06)
- **On-screen action:** On the same record, expand the five explanation blocks in order: evidence, model interpretation, possible explanation, recommended investigation, unknowns. Hold the last block for 3 seconds.
- **Narration:** "The explanation keeps five things separate: what was measured, what the model decided, a possible pattern, what to check next, and what is not known. Root cause, whether the event is real or benign, and user impact are explicitly listed as unknown. The system does not claim causation."
- **Proof point:** The unknowns section of `REC-000123` states that root cause is not determined by the detector.

---

## Shot 6 — Experiment Lab

- **Page / route:** Experiment Lab — `/experiments`
- **Duration:** 13 seconds (1:06–1:19)
- **On-screen action:** Run the two-method comparison on the same test dataset. Hold on the side-by-side results table and point to the F1 and ROC AUC columns. Show that both methods have a false-positive rate of 0.000.
- **Narration:** "Experiment Lab compares both detectors on the same 432 test rows. The statistical MAD and IQR detector reaches precision 1.000, recall 0.625, F1 0.769 and ROC AUC 0.901. Isolation Forest reaches F1 0.714 and ROC AUC 0.886. Both have zero false positives. Each run saves per-record predictions."
- **Proof point:** MAD/IQR — precision 1.000 / recall 0.625 / F1 0.769 / ROC AUC 0.901, against Isolation Forest 0.714 / 0.886 (from `train_report.json`).

---

## Shot 7 — Reports

- **Page / route:** Reports — `/reports`
- **Duration:** 11 seconds (1:19–1:30)
- **On-screen action:** Select the detection run from shot 3, choose the investigation report type and click Generate. Open the resulting Markdown file in the editor or browser for 3 seconds before returning to the page.
- **Narration:** "Reports renders a Markdown investigation document from the stored detection result. It carries the method, threshold, metrics and per-record findings, so the same numbers can be reviewed outside the application."
- **Proof point:** Report content is generated from the saved detection result, which contains the 40 flagged rows shown earlier.

---

## Shot 8 — About & Methodology

- **Page / route:** About & Methodology — `/about`
- **Duration:** 10 seconds (1:30–1:40)
- **On-screen action:** Scroll slowly through the method summary and scope boundaries; stop on the limitations text.
- **Narration:** "The About page records the method and its boundaries. TraceLens is a demonstration on synthetic telemetry. It evaluates detection and explanation quality; it does not predict real outages or determine root cause."
- **Proof point:** Scope boundaries are stated in the product itself, matching `PROBLEM_STATEMENT.md`.

---

## Shot 9 — Summary slate

- **Duration:** 8 seconds (1:40–1:48)
- **On-screen action:** Static slate, three short lines, no animation:
  1. "Reproducible: seed 20261120 · pinned Python and Node dependencies · one-command start and stop"
  2. "Verified: 40/40 tests pass · frontend production build passes"
  3. "All figures shown came from local result files in this repository"
- **Narration:** "Every figure in this demo is reproducible: one fixed seed, pinned dependencies, a one-command start, 40 passing tests and a passing frontend build. The result files are included in the repository."
- **Proof point:** Reproducibility statement — 40/40 tests and a successful `npm run build`, verified locally on 2026-11-20.

---

## Delivery notes

- Start the backend before recording. When the API is offline the app displays a "Backend is offline — showing representative demo data" banner; the demo must show live results instead.
- Use the fixed seed and the exact row counts in shot 2. Do not substitute different configuration values during recording, or the spoken metrics will not match.
- Keep narration at a steady, factual pace. Do not describe the system as predicting outages or finding root cause.
- If a page loads slowly, hold the previous frame rather than talking over a loading spinner.

---

**Source note:** All spoken figures and page routes came from local files in `D:\PROVISION_TRACELENS` — `experiments/train_report.json`, `datasets/processed/detections.json`, `datasets/synthetic/telemetry.meta.json`, `frontend/src/App.tsx`, `documentation/PROBLEM_STATEMENT.md`; the 40-test result is from a fresh `python -m pytest backend/tests tests -q` run and the build result from a fresh `npm run build` in `frontend/`, both on 2026-11-20.

— Tango
