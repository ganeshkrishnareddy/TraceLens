# TraceLens 2.0 — Shared Transformation Contract

This is the single source of truth for the TraceLens 2.0 rebuild. Every agent reads it before writing code.
It exists so parallel agents produce one coherent product, not eight different ones.

Project root: `D:\PROVISION_TRACELENS`. Do not publish, deploy or push to GitHub. Stop for the person's review at the end.

## 1. What is being preserved

The existing app is working and tested (40 tests). Do not delete or rewrite it blindly.

- `backend/` — FastAPI, SQLite store (`tracelens.db`), routes: health, datasets, models, detection, incidents, experiments, reports. Canonical aliases `POST /api/train` and `POST /api/detect`.
- `ml-engine/` — seeded telemetry generator, Isolation Forest + statistical MAD/IQR detectors, evaluation, explainability, experiments.
- `frontend/` — React 19 + TypeScript + Vite + Tailwind 3, 8 pages, recharts, lucide-react.
- `datasets/`, `models/`, `experiments/`, `reports/` — real generated artefacts.
- `documentation/`, `research/` — real documents from the first build round.

## 2. Product identity

- Brand: **TraceLens**, descriptor **Explainable Anomaly Intelligence**.
- Tagline: **"See the signal. Understand the anomaly. Act with confidence."**
- Participant: **ProgVision — individual participant, AEGYTHON 2026**. Independent project, AI-assisted development. Never invent employees, customers, certification, production deployment or partnerships.
- Public story headline: **"See Beyond the Alert. Understand the Anomaly."**
- Trust line: **"Evidence-driven. Explainable. Reproducible."**

## 3. Design system — light theme ONLY

Never introduce dark mode, neon, glow, heavy gradients, generic target/brain icons or random stock art.

| Token | Value | Use |
|---|---|---|
| Page background | `#F6F8FB` | app + site background |
| Surface | `#FFFFFF` | cards, panels |
| Soft section | `#EEF2F7` | alternating sections |
| Ink / heading | `#0B1F3A` | headings |
| Body text | `#334155` | body copy |
| Muted text | `#64748B` | captions, labels |
| Border | `#E2E8F0` | hairlines |
| Primary teal | `#0E7C7B` | actions, focus, emphasis |
| Primary hover | `#0A6363` | hover/pressed |
| Secondary blue | `#2563EB` | sparse accent only |
| Success | `#0F766E` | resolved/healthy (always with words) |
| Warning | `#B45309` | elevated/severe (always with words) |
| Critical | `#B91C1C` | critical (always with words) |

- Font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- Type scale: 12 / 14 / 16 / 20 / 24 / 30 / 36 / 48 px. Headings `font-semibold tracking-tight`, body `leading-relaxed`.
- Spacing: 4, 8, 12, 16, 24, 32, 48 px. Radius: 8 / 12 / 16 px.
- Shadow: `0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.06)`. Restrained.
- One accent per view. Grey everything else. Charts start at zero, direct labels, no 3D, no dual axes.
- Every text colour needs at least 4.5:1 contrast. Every interactive element needs a visible focus ring.
- Works at 360 px: one column, no sideways scroll except wide tables in their own box.

## 4. Route map

Public (no auth):
`/` landing · `/about` · `/technology` · `/how-it-works` · `/research` · `/demo` · `/login` · `/register` · `/forgot-password` · `/judge`

Analyst app (auth required except explicit demo session):
`/app/overview` · `/app/data` · `/app/detect` · `/app/investigate` · `/app/explain` · `/app/experiments` · `/app/reports` · `/app/settings`

Legacy paths `/`, `/data`, `/detect`, `/investigate`, `/explain`, `/experiments`, `/reports`, `/about` must redirect to the new structure so existing links and the running video capture do not break. Note: `/` is the new landing page, so the old overview moves to `/app/overview`.

## 5. File ownership — do not edit another owner's files

| Owner | Owns | Exports / contract |
|---|---|---|
| MausBot (orchestrator) | `frontend/src/App.tsx`, `main.tsx`, `index.css`, `api.ts`, `auth.tsx`, `components/**`, `scripts/start-stop` | Wires all routes and integration; final build and verification |
| Vega | `frontend/src/public/**`, `frontend/public/brand/**` | Named React page exports: `Landing`, `About`, `Technology`, `HowItWorks`, `Research`, `DemoAccess`, `Login`, `Register`, `ForgotPassword`, `JudgeMode`. Default export is fine too; say which in your report |
| Nova | `frontend/src/app/**` | Named React page exports: `AppOverview`, `AppDataLab`, `AppDetection`, `AppInvestigation`, `AppExplain`, `AppExperiments`, `AppReports`, `AppSettings`, plus incident/demo workflow components under `frontend/src/app/components/` |
| Panko | `backend/**`, `backend/tests/**`, `scripts/migrate_*.py`, `ml-engine/**` only if the API needs it | New API endpoints in section 6; no DB reset |
| Tango | `documentation/**`, `research/**` (except this contract file), `assets/brand/**` docs | The documentation set in section 18 of the brief, plus brand guidelines |

Atlas is finishing the demo video and is not assigned code in this pass.

## 6. API contract (backend additions — keep all existing endpoints)

Auth — local prototype, hashed passwords, opaque session token in `Authorization: Bearer <token>`:
- `POST /api/auth/register` `{email,password,name}` → `{user, token}`
- `POST /api/auth/login` `{email,password}` → `{user, token}`
- `POST /api/auth/logout` → `{ok:true}`
- `GET /api/auth/me` → `{user}`
- Demo account, documented in README: `demo@tracelens.local` / `TraceLens2026!`

Incidents — extend, do not replace:
- `GET /api/incidents?status=&severity=` (add severity filter)
- `POST /api/incidents/{id}/notes` `{note}` → note record
- `POST /api/incidents/{id}/escalate` `{reason,severity,priority,assigned_owner,investigation_summary,evidence_refs,recommended_action}` → escalation + audit entry
- `POST /api/incidents/{id}/resolve` `{summary}` → updated incident
- `GET /api/incidents/{id}/activity` → ordered audit trail
- Lifecycle: `detected → triaged → investigating → escalated → mitigating → resolved → closed`. Reject illegal transitions and escalation of a missing incident.

Demo & stats:
- `GET /api/demo/scenarios` → the six scenarios below
- `POST /api/demo/load` `{scenario}` → labelled synthetic dataset preview; must not overwrite real datasets
- `POST /api/demo/reset` → restore initial demo state
- `GET /api/stats/overview` → counts derived from the DB only (no hardcoded numbers)

Reports:
- `GET /api/reports/{id}/download?format=pdf|csv|json` → real file response
- Keep `POST /api/reports`; report types: anomaly detection, incident investigation, escalation history, experiment evaluation, dataset quality. Include generation time, dataset info, method, findings, limitations; verified data only.

Database: extend `tracelens.db` with users, sessions, datasets, models, detections, detection_results, incidents, escalations, investigation_notes, incident_activity, experiments, reports. Provide `scripts/migrate_*.py`. Never silently reset or delete existing data.

## 7. Demo scenarios (exact keys)

`normal`, `cpu_spike`, `memory_leak`, `network_surge`, `latency_error_surge`, `combined_anomaly`.

Each selects a labelled synthetic dataset, shows a preview, explains the scenario, lets the user pick a method, runs the real detection pipeline, shows real metrics, opens an anomaly explanation, creates/escalates an incident and exports a report. Reset, replay and clear-history are required. Every synthetic record must be visibly labelled as synthetic.

## 8. Judge Mode

`/judge` — a resettable guided ~3 minute walkthrough using the same real workflows: problem → preloaded dataset → real detection → anomaly explanation → incident escalation → final report. No separate fake pipeline.

## 9. Content requirements for the public site

Sections, in order: hero; problem; connected approach workflow (observe → learn → detect → explain → investigate → escalate → resolve, each mapped to a real feature or explicitly marked future); product experience using **real screenshots from the running app**; differentiators (explainability, multiple methods, baseline-aware, evidence-first, reproducible, local offline, transparent synthetic data, human-readable narratives — no unsupported accuracy claims); interactive architecture diagram where clicking a component reveals its purpose; "Built by ProgVision" development story; research & methodology with measured values only; interactive demo preview; FAQ; footer with real links only (GitHub link only when verified public).

Story mode: six scroll acts — signal everywhere → anomaly hides in normal behaviour → detection is only the beginning → evidence creates understanding → investigation creates action → every decision traceable. Subtle transitions, timeline animation, accessible and fast.

## 10. Quality bar

Loading skeletons, error boundaries, empty states, form validation, toasts, responsive tables, accessible dialogs, keyboard navigation, search/filters, pagination where needed, real API errors. No dead buttons. No fabricated metrics — every number must come from the DB or a real computation, or be labelled a demo fixture. Check console errors, API failures, routing, nested-route refresh, session persistence and responsive layout.

## 11. Acceptance — ten journeys, each actually executed

1. Landing → understand problem → technology → launch demo.
2. Login with demo account → reach analyst dashboard.
3. Data Lab → load synthetic data → preview.
4. Select scenario → run detection → see real model results.
5. Open anomaly → read explanation → create incident.
6. Review incident → add evidence → add notes.
7. Escalate incident → see status update → audit trail.
8. Resolve incident → record summary → close.
9. Generate report → download PDF/CSV/JSON.
10. Reset demo → restore initial environment.

## 12. Deliverables at review

- What changed / added, which agents completed which workstream.
- Which journeys passed, with actual test output.
- Outstanding issues, local URLs, demo credentials, project directory.
- Screenshots: hero, storytelling, about, login, analyst overview, detection results, investigation, escalation, explainability, reports.
- Everything under `D:\PROVISION_TRACELENS`. **STOP and wait for review. Do not publish or deploy.**
