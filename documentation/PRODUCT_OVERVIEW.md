# TraceLens — Product Overview

> **Status note.** This document describes the real, working TraceLens build in this
> repository and the target state defined in `TRANSFORMATION_CONTRACT.md`. Sections
> marked **current build** are verified against local source and artefacts; sections
> marked **transformation target** come from the shared contract and are being built
> by the parallel agents. All data is **synthetic and labelled** unless stated.

## Identity

| Field | Value |
|---|---|
| Product | **TraceLens** |
| Descriptor | Explainable Anomaly Intelligence |
| Tagline | "See the signal. Understand the anomaly. Act with confidence." |
| Public story headline | "See Beyond the Alert. Understand the Anomaly." |
| Trust line | "Evidence-driven. Explainable. Reproducible." |
| Participant | **ProgVision** — individual participant, AEGYTHON 2026 |
| Developer | P. Ganesh Krishna Reddy (solo, AI-assisted development) |

TraceLens is an independent project. It does **not** claim employees, customers,
certification, production deployment or partnerships, and is not affiliated with
the official AeglysAI .NET repository.

## The problem

Modern services emit high-volume telemetry — CPU, memory, disk I/O, network,
request rate, latency, error rate and connection count. Two problems make incidents
hard to handle:

1. **Detection** — anomalies are rare and multi-dimensional. A single threshold on
   one metric misses combined or subtle deviations and produces false alarms.
2. **Trust and investigation** — a binary "anomaly / normal" output does not say
   what was observed, why the model flagged it, what to check next, or what remains
   unknown.

## What TraceLens does (current build — verified)

- Generates **reproducible labelled synthetic telemetry**: 1,440 windows by default
  (1,200 normal / 240 anomalous, seed `20261120`) across 8 numeric features and 9
  injected anomaly scenarios (`datasets/synthetic/telemetry.meta.json`,
  `ml-engine/data_generator.py`).
- Splits leakage-safe at 70/30 (1,008 train / 432 test, 72 anomalies in test).
- Trains two independent detectors — Isolation Forest (200 trees, contamination
  0.1) and a robust MAD statistical baseline (z-threshold 3.5).
- Scores windows with anomaly scores in `[0, 1]`, applies a configurable threshold
  and computes precision, recall, F1, accuracy, false-positive rate and ROC AUC
  against ground truth (`ml-engine/evaluate.py`).
- Explains each flag with a structured narrative that separates **observed
  evidence**, **model interpretation**, a careful **non-causal possible
  explanation**, **recommended investigation** and **unknowns**
  (`ml-engine/explain.py`).
- Tracks incidents with status and notes, runs method/threshold experiments and
  exports Markdown investigation reports (FastAPI routes in `backend/app/routes/`).
- Serves a light-themed React 19 dashboard with 8 analyst pages
  (Overview, Data Lab, Detection, Investigation, Explainability, Experiment Lab,
  Reports, About).

## How it works

```
Synthetic generator (seeded)  →  features (validate → median-impute → RobustScaler)
        →  two detectors (Isolation Forest | MAD)  →  evaluate + explain
        →  FastAPI + SQLite registry  →  React dashboard + reports
```

Every number shown comes from a computation on generated or uploaded data; there
are no fabricated metrics. A fixed seed yields byte-identical datasets, models and
detection output (asserted by 5 determinism tests).

## Transformation target (per `TRANSFORMATION_CONTRACT.md`)

The 2.0 pass wraps the working engine in a competition-ready product:

- **Public site**: `/`, `/about`, `/technology`, `/how-it-works`, `/research`,
  `/demo`, `/judge` plus `/login`, `/register`, `/forgot-password` (`BRAND_GUIDELINES.md`,
  `LANDING_PAGE_STORY.md`).
- **Analyst app** under `/app/*` with auth-gated routes and an explicit demo session.
- **Local auth** (hashed passwords, opaque Bearer token) and a documented demo
  account (`AUTHENTICATION.md`).
- **Incident lifecycle and escalation** with an audit trail
  (`INCIDENT_LIFECYCLE.md`, `ESCALATION_WORKFLOW.md`).
- **Six labelled demo scenarios** and a ~3-minute resettable **Judge Mode**
  (`DEMO_GUIDE.md`).
- Expanded API and database for users, sessions, incidents, escalations, notes,
  activity, stats and real report downloads (`API_REFERENCE.md`, `DATABASE_SCHEMA.md`).

Legacy paths (`/data`, `/detect`, `/investigate`, `/explain`, `/experiments`,
`/reports`, `/about`) redirect to the new structure so existing links and the
running video capture keep working.

## Audiences

- **Judges / first-time visitors** — public story, live-demo preview and Judge Mode.
- **Analysts / on-call engineers** — the `/app/*` workbench for detection,
  investigation, escalation and reporting.

## Differentiators (all defensible from local files)

Explainability by design · two independent methods · baseline-aware scoring ·
evidence-first narratives · reproducible seeded artefacts · local/offline operation ·
transparent, visibly labelled synthetic data · human-readable reports.

No accuracy, certification or deployment claims are made.

## Where things live

| Path | Contents |
|---|---|
| `backend/` | FastAPI app, routes, services, SQLite store |
| `ml-engine/` | Generator, features, detectors, evaluation, explanation, experiments |
| `frontend/` | React 19 + Vite + Tailwind 3 dashboard (8 pages, current build) |
| `datasets/`, `models/`, `experiments/`, `reports/` | Real generated artefacts |
| `documentation/`, `research/` | This document set and the anomaly-method research |
| `demo/` | 106-second walkthrough video and reproducible capture sources |

**Transformation status:** in progress, no publication or deployment. See each
referenced document for the current-versus-target distinction and `KNOWN_LIMITATIONS.md`
for open gaps.
