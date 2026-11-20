# TraceLens — Landing Page Story

> **Status note.** This is the content and interaction plan for the public site
> defined in `TRANSFORMATION_CONTRACT.md` §4 (route map), §7–§8 (demo workflows) and
> §9 (public-site content). It maps every section to a real feature or endpoint, or
> marks it explicitly as future. Palette, type and motif rules are in
> `BRAND_GUIDELINES.md`. No metric here is invented; measured values are cited from
> `EXPERIMENT_RESULTS.md` and `experiments/train_report.json`.

## Headline and trust line

- Hero headline: **"See Beyond the Alert. Understand the Anomaly."**
- Trust line: **"Evidence-driven. Explainable. Reproducible."**
- Descriptor: Explainable Anomaly Intelligence · Built by ProgVision, AEGYTHON 2026.

## Public sections, in order

| # | Section | Purpose | Maps to (real) | Notes |
|---|---|---|---|---|
| 1 | **Hero** | Promise + primary CTA "Launch the demo" | `/demo`, `/judge` | Use the lens/signal motif; no accuracy claim. |
| 2 | **Problem** | Detection + trust gap in telemetry | `PROBLEM_STATEMENT.md` | Two problems: rare multi-dimensional anomalies; binary output with no evidence. |
| 3 | **Connected approach** | observe → learn → detect → explain → investigate → escalate → resolve | see mapping below | Each step is a real feature or marked future. |
| 4 | **Product experience** | Real screenshots of the running app | `demo/shots/01_overview.png` … `08_about.png` | Label any synthetic data visibly. |
| 5 | **Differentiators** | Why this approach | see list below | No unsupported accuracy claims. |
| 6 | **Interactive architecture** | Click a component → its purpose | `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md` | Lens/signal/evidence-node diagram. |
| 7 | **Built by ProgVision** | Development story | `README.md`, `PRODUCT_OVERVIEW.md` | Solo, independent, AI-assisted; no invented team. |
| 8 | **Research & methodology** | Measured values only | `AI_ML_METHODOLOGY.md`, `EXPERIMENT_RESULTS.md` | Cite the seeded run and its sample size. |
| 9 | **Interactive demo preview** | Try the pipeline | `/demo`, `/judge` | Uses real detection pipeline, not a fake one. |
| 10 | **FAQ** | Common questions | see below | Honest scope answers. |
| 11 | **Footer** | Real links only | routes in contract §4 | GitHub link only when verified public. |

### Connected approach → real feature map

| Step | Status | Real feature / endpoint |
|---|---|---|
| Observe | real | Synthetic telemetry generator (`ml-engine/data_generator.py`), Data Lab |
| Learn | real | `RobustScaler` fit on training data, `POST /api/models/train` |
| Detect | real | Isolation Forest + MAD detectors, `POST /api/detect` |
| Explain | real | `ml-engine/explain.py`, anomaly explanation in `/app/explain` |
| Investigate | real | Incident record + notes, `/app/investigate`, `GET /api/incidents` |
| Escalate | target | `POST /api/incidents/{id}/escalate` (contract §6) |
| Resolve | target | `POST /api/incidents/{id}/resolve` (contract §6) |

## Differentiators (defensible statements only)

- **Explainability** — every flag carries evidence, interpretation, next steps and unknowns.
- **Multiple methods** — two independent detectors can be compared on the same split.
- **Baseline-aware** — robust medians/MAD and a scaler fitted on training data only.
- **Evidence-first** — narratives describe observed deviations, not invented root causes.
- **Reproducible** — fixed seeds; byte-identical outputs asserted by tests.
- **Local / offline** — single-machine FastAPI + SQLite, no external service required.
- **Transparent synthetic data** — every dataset is labelled and visibly marked synthetic.
- **Human-readable reports** — Markdown/portable reports from real results.

Do not publish statements such as "99% accuracy", "production-ready",
"certified" or "used by customers".

## Research section — the numbers that may be shown

All from the **reference experiment** (`experiments/_doc_reference/experiment.json`,
seed `20261120`; 1,008 train / 432 test, 72 true anomalies):

| Method | Recall | F1 | ROC AUC | False positives |
|---|---:|---:|---:|---:|
| Isolation Forest (threshold 0.50) | 0.569 | 0.726 | 0.886 | 0 |
| Statistical MAD (threshold 0.30) | 0.764 | 0.866 | 0.901 | 0 |

Always state the sample size (432 test windows) and that zero false positives is a
property of this synthetic split, not a general claim. The independently produced
`experiments/train_report.json` records a second seeded run (IF F1 0.714 / AUC 0.886;
MAD F1 0.769 / AUC 0.901); use it when you need the CLI/artefact path.

## Story mode — six scroll acts

Subtle transitions and a timeline animation; accessible and fast; keyboard and
reduced-motion friendly.

1. **Signal everywhere** — telemetry waveforms fill the view (8 metrics).
2. **Anomaly hides in normal behaviour** — one flagged window is indistinguishable by eye.
3. **Detection is only the beginning** — a score and threshold appear; the flag alone is not enough.
4. **Evidence creates understanding** — the evidence node expands into observed deviations.
5. **Investigation creates action** — notes, severity and escalation turn insight into a workflow.
6. **Every decision traceable** — the audit trail and report close the loop.

Each act should focus on one accent colour, keep all other surfaces grey, and use
the real evidence-node motif from `BRAND_GUIDELINES.md`.

## Interactive architecture diagram

Clicking a component reveals its purpose, sourced from the real stack:

- **React dashboard** (`frontend/`) — 8 analyst pages, light theme, API base `/api`.
- **FastAPI backend** (`backend/app/`) — 7 routers plus canonical `/api/train` and `/api/detect` aliases.
- **ml-engine** — generator → features → detectors → evaluate / explain / experiment.
- **SQLite store** (`tracelens.db`) — datasets, models, detections, incidents, experiments, reports (current build).
- **Files** — CSV / JSON / pickle / Markdown artefacts under `datasets/`, `models/`, `experiments/`, `reports/`.

## FAQ topics (honest answers)

- *Is this real telemetry?* No — labelled synthetic data, clearly marked.
- *Does it find root cause?* No — explanations are non-causal and list unknowns.
- *What detectors are used?* Isolation Forest and a robust MAD statistical baseline.
- *Are the metrics guaranteed?* No — they are computed on one seeded split.
- *Can I use my own data?* Yes — upload CSV (≤25 MB) with the 8 feature columns; labels are needed only for metrics.
- *Is there an account?* A local demo account exists for the transformation target (see `AUTHENTICATION.md`).

## Assets

Real screenshots: `demo/shots/00_title.png` … `09_closing.png`. They were captured
from the running app at 1440×900 (`demo/README.md`); reuse them rather than
generating mock UI. Do not publish or deploy this site.
