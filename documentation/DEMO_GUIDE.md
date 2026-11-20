# TraceLens — Demo Guide

> **Status note.** The six demo scenarios, Judge Mode and demo reset are a
> **transformation target** (`TRANSFORMATION_CONTRACT.md` §7–§8). They run the
> **real** detection pipeline — there is no separate fake pipeline. The current
> local build already exposes generation, training, detection, explanation and
> reporting; the scenario catalogue and reset endpoints are being added by the
> backend agent. All demo records are **synthetic and visibly labelled**.

## Demo credentials (target auth)

| Field | Value |
|---|---|
| Email | `demo@tracelens.local` |
| Password | `TraceLens2026!` |

Judges can also enter through `/demo` or `/judge` with an explicit demo session and
use the real analyst workflows without creating an account (`AUTHENTICATION.md`).

## Six scenarios (exact keys)

`normal` · `cpu_spike` · `memory_leak` · `network_surge` · `latency_error_surge` · `combined_anomaly`

These are the **demo** keys. The underlying generator also injects nine anomaly
patterns (`cpu_spike`, `memory_leak`, `network_surge`, `latency_spike`,
`error_surge`, `combined_anomaly`, `multi_metric`, `missing_measurement`, `noisy`)
plus `normal` (`datasets/synthetic/telemetry.meta.json`). The demo scenario
`latency_error_surge` maps to the generator's `latency_spike` + `error_surge`
patterns; label it as a combined demo scenario, not a separate generator class.

| Scenario key | What the analyst sees |
|---|---|
| `normal` | Baseline telemetry; few or no flags |
| `cpu_spike` | CPU driven near 92–100% |
| `memory_leak` | Memory near 88–99%, CPU nudged up |
| `network_surge` | Network ≥200 MB/s, connections ×2.5 |
| `latency_error_surge` | Latency ≥500 ms and error rate 5–25% (combined demo) |
| `combined_anomaly` | CPU, memory and error rate pushed high together |

## Standard demo flow (per scenario)

1. `GET /api/demo/scenarios` — list the six scenarios (target).
2. `POST /api/demo/load` `{scenario}` — load a **labelled synthetic preview**; must
   not overwrite real datasets (target).
3. Pick a method — Isolation Forest or statistical MAD — and a threshold.
4. Run the real pipeline: `POST /api/train` → `POST /api/detect` (current aliases).
5. Read the real metrics (precision, recall, F1, FPR, ROC AUC) computed against the
   synthetic labels.
6. Open an anomaly explanation — evidence, model interpretation, possible
   explanation, recommended investigation, unknowns, severity.
7. Create / review the incident, add evidence and notes.
8. Escalate it (`POST /api/incidents/{id}/escalate`, target).
9. Export a report (`POST /api/reports`, then download).
10. Reset or replay.

**Reset / replay / clear-history are required** (contract §7): `POST /api/demo/reset`
restores the initial demo state without touching real datasets.

## Judge Mode

`/judge` is a resettable, guided **~3-minute** walkthrough using the same real
workflows (contract §8):

```
problem → preloaded dataset → real detection → anomaly explanation
        → incident escalation → final report
```

No separate fake pipeline. Start from a clean state, keep the scope to one or two
records so it fits three minutes, and offer reset at the end.

## Numbers you may quote during the demo

From `experiments/_doc_reference/experiment.json` (seed 20261120, 432 test windows,
72 true anomalies):

- Isolation Forest: F1 **0.726**, ROC AUC **0.886**, 41 flagged, 0 false positives.
- Statistical MAD: F1 **0.866**, ROC AUC **0.901**, 55 flagged, 0 false positives.

From `experiments/train_report.json` (independent CLI/artefact run): Isolation Forest
F1 0.714 / AUC 0.886; MAD F1 0.769 / AUC 0.901.

Always say "synthetic, seeded test split", state the sample size, and do not present
zero false positives as a general performance guarantee.

## Current-build quick path (works today)

From the repository root, with services started by `START_TRACELENS.bat`:

```
GET  /api/health
POST /api/datasets/generate   {"n_normal":1200,"n_anomaly":240,"seed":20261120}
POST /api/models/train        {"dataset_id":"ds-...","method":"statistical_mad","threshold":0.3}
POST /api/detection/run       {"dataset_id":"ds-...","model_id":"mdl-..."}
GET  /api/detection/results/{detection_id}
GET  /api/incidents
POST /api/reports             {"detection_id":"det-...","kind":"investigation"}
```

## Video asset

A 106-second walkthrough already exists at `demo/TraceLens_Demo.mp4` with reproducible
capture sources in `demo/` (`demo/README.md`). It captures the running app, not a
mock. Screenshots in `demo/shots/` are reused on the public site
(`LANDING_PAGE_STORY.md`).
