# TraceLens — User Journeys & Acceptance Map

> All ten acceptance journeys from `TRANSFORMATION_CONTRACT.md` §11 are listed below,
> each mapped to the responsible page and endpoint. "Journey status" distinguishes
> the **current build** (verified working engine + 8-page dashboard) from the
> **transformation target** (public site, auth, incident lifecycle, demo scenarios,
> reports). Endpoints marked (target) are defined by the contract and are being
> implemented by the parallel agents; all others exist today in `backend/app/routes/`.

## Route reference

- Public: `/` · `/about` · `/technology` · `/how-it-works` · `/research` · `/demo` · `/login` · `/register` · `/forgot-password` · `/judge`
- Analyst app: `/app/overview` · `/app/data` · `/app/detect` · `/app/investigate` · `/app/explain` · `/app/experiments` · `/app/reports` · `/app/settings`
- Legacy paths redirect to the new structure; old overview → `/app/overview`.

---

## J1 — Landing → understand problem → technology → launch demo

- **Pages:** `/` → `/about` or `/how-it-works` → `/technology` → `/demo`
- **Endpoints:** none required for the story; `GET /api/demo/scenarios` (target) populates the launch screen.
- **Evidence:** `LANDING_PAGE_STORY.md`, `demo/shots/00_title.png`.
- **Journey status:** public pages are transformation target; content plan is complete.

## J2 — Login with demo account → reach analyst dashboard

- **Pages:** `/login` → `/app/overview`
- **Endpoints:** `POST /api/auth/login` `{email,password}` → `{user, token}` (target); `GET /api/auth/me` (target).
- **Credentials:** `demo@tracelens.local` / `TraceLens2026!` (contract §6).
- **Journey status:** target. Current build has no auth (`KNOWN_LIMITATIONS.md`).

## J3 — Data Lab → load synthetic data → preview

- **Pages:** `/app/data`
- **Endpoints:** `POST /api/datasets/generate` `{"n_normal":1200,"n_anomaly":240,"seed":20261120}`; `POST /api/demo/load` `{scenario}` (target); `GET /api/datasets/{id}/preview`.
- **Data:** `datasets/synthetic/telemetry.csv` (1,440 rows, 1,200 normal / 240 anomalous), visibly labelled synthetic.
- **Journey status:** generate + preview are current and verified; `demo/load` is target.

## J4 — Select scenario → run detection → see real model results

- **Pages:** `/app/detect`
- **Endpoints:** `POST /api/models/train` (alias `POST /api/train`) → `POST /api/detection/run` (alias `POST /api/detect`); `GET /api/detection/results/{id}`.
- **Data:** scores in `[0,1]`, threshold, flags, and metrics when labels are present.
- **Journey status:** current and verified. Six demo scenario keys (target) are in `DEMO_GUIDE.md`.

## J5 — Open anomaly → read explanation → create incident

- **Pages:** `/app/explain` → `/app/investigate`
- **Endpoints:** `GET /api/detection/results/{id}` (explanation fields); flagged rows automatically create incidents via `POST /api/detection/run`.
- **Explanation fields:** evidence, model_interpretation, possible_explanation, recommended_investigation, unknowns, severity, narrative (`explain.py`).
- **Journey status:** current and verified.

## J6 — Review incident → add evidence → add notes

- **Pages:** `/app/investigate`
- **Endpoints:** `GET /api/incidents`, `GET /api/incidents/{id}`, `POST /api/incidents/{id}` `{status,notes}` (current); `POST /api/incidents/{id}/notes` `{note}` (target).
- **Journey status:** notes via update are current; dedicated notes + evidence_refs are target.

## J7 — Escalate incident → see status update → audit trail

- **Pages:** `/app/investigate`
- **Endpoints:** `POST /api/incidents/{id}/escalate` `{reason,severity,priority,assigned_owner,investigation_summary,evidence_refs,recommended_action}` (target); `GET /api/incidents/{id}/activity` (target); `GET /api/incidents?status=&severity=` (target adds severity filter).
- **Lifecycle:** `detected → triaged → investigating → escalated → mitigating → resolved → closed`.
- **Journey status:** target. See `INCIDENT_LIFECYCLE.md` and `ESCALATION_WORKFLOW.md`.

## J8 — Resolve incident → record summary → close

- **Pages:** `/app/investigate`
- **Endpoints:** `POST /api/incidents/{id}/resolve` `{summary}` (target); `GET /api/incidents/{id}/activity` (target).
- **Journey status:** target. Current `POST /api/incidents/{id}` can set a status, but does not enforce the lifecycle or record an audit entry.

## J9 — Generate report → download PDF/CSV/JSON

- **Pages:** `/app/reports`
- **Endpoints:** `POST /api/reports` `{detection_id,kind}` (current, Markdown); `GET /api/reports/{id}/download?format=pdf|csv|json` (target); `GET /reports/{id}/download` (current file response).
- **Report types (target):** anomaly detection, incident investigation, escalation history, experiment evaluation, dataset quality — with generation time, dataset info, method, findings and limitations; verified data only.
- **Journey status:** generation + Markdown download are current; typed PDF/CSV/JSON export is target.

## J10 — Reset demo → restore initial environment

- **Pages:** `/demo`, `/judge`, `/app/settings`
- **Endpoints:** `POST /api/demo/reset` (target); `GET /api/demo/scenarios` (target).
- **Rule:** reset restores the initial demo state and must not overwrite real datasets.
- **Journey status:** target.

---

## Coverage summary

| Journey | Responsible page(s) | Key endpoint(s) | Status |
|---|---|---|---|
| J1 | `/`, `/about`, `/technology`, `/demo` | (static) + demo scenarios | target |
| J2 | `/login`, `/app/overview` | auth login / me | target |
| J3 | `/app/data` | datasets generate, demo load, preview | mixed |
| J4 | `/app/detect` | train / detect | current |
| J5 | `/app/explain`, `/app/investigate` | detection results | current |
| J6 | `/app/investigate` | incidents get / update / notes | mixed |
| J7 | `/app/investigate` | escalate, activity | target |
| J8 | `/app/investigate` | resolve, activity | target |
| J9 | `/app/reports` | reports create / download | mixed |
| J10 | `/demo`, `/judge`, `/app/settings` | demo reset / scenarios | target |

No acceptance journey has been executed end-to-end in the browser by this
documentation owner; the statuses above are code-level verification, not a claim
of a completed click-through. Final execution is the orchestrator's review gate.
