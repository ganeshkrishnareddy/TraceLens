# TraceLens — Incident Lifecycle

> **Status note.** The full lifecycle and its audit trail are a **transformation
> target** (`TRANSFORMATION_CONTRACT.md` §6). The current build already creates an
> incident for every flagged record and supports a status + notes update; the
> ordered state machine, severity filter and activity trail are being added by the
> backend agent. Current fields are verified from `backend/app/services/store.py`.

## Purpose

A detection flag is the start of an investigation, not the end. An incident turns
an anomalous record into a trackable object with severity, status, evidence, notes,
escalation and a complete activity trail. Every incident links back to the real
detection and record that created it.

## States

Canonical lifecycle (contract §6):

```
detected → triaged → investigating → escalated → mitigating → resolved → closed
```

| State | Meaning | Entry |
|---|---|---|
| detected | A flagged record produced an incident | automatic on `POST /api/detection/run` |
| triaged | A human has looked at severity and priority | analyst action |
| investigating | Evidence and notes are being gathered | analyst action |
| escalated | Handed to an owner with a recommendation | `POST /api/incidents/{id}/escalate` |
| mitigating | Fix or containment in progress | analyst action |
| resolved | A summary has been recorded | `POST /api/incidents/{id}/resolve` |
| closed | Final state | analyst action |

Illegal transitions must be rejected by the API. Escalating a missing incident must
also be rejected (contract §6).

## Current build (verified)

Schema of the `incidents` table (`store.py`):

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | `inc-<12 hex>` |
| `detection_id` | TEXT | detection that produced it |
| `record_id` | TEXT | `REC-000000` telemetry window |
| `score` | REAL | anomaly score `[0,1]` |
| `severity` | TEXT | low / medium / high / critical (from `explain.py`) |
| `status` | TEXT | current status; default `open` in the current build |
| `notes` | TEXT | analyst notes |
| `created_at` | TEXT | UTC ISO timestamp |

Behaviour today:

- `POST /api/detection/run` creates one incident per flagged row.
- `GET /api/incidents` lists all, optionally filtered by `status`.
- `GET /api/incidents/{id}` fetches one.
- `POST /api/incidents/{id}` `{status, notes}` updates status and/or notes.

The current status vocabulary is `open` plus whatever string the caller supplies;
it is **not** yet the enforced lifecycle above.

## Target endpoints (contract §6)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/incidents?status=&severity=` | List, with severity filter added |
| POST | `/api/incidents/{id}/notes` `{note}` | Append an investigation note |
| POST | `/api/incidents/{id}/escalate` `{…}` | Escalate + write audit entry |
| POST | `/api/incidents/{id}/resolve` `{summary}` | Resolve with a summary |
| GET | `/api/incidents/{id}/activity` | Ordered audit trail |

See `ESCALATION_WORKFLOW.md` for the escalation payload and audit semantics.

## Severity

Severity is derived from the anomaly score in `ml-engine/explain.py`:

| Score | Severity |
|---|---|
| < 0.40 | low |
| 0.40 – 0.60 | medium |
| 0.60 – 0.80 | high |
| ≥ 0.80 | critical |

Always display severity with a word and, where colour is used, an ▲/▼ cue — never
colour alone (`BRAND_GUIDELINES.md`).

## Activity / audit trail (target)

Each state change, note, escalation and resolution appends an ordered entry to
`incident_activity` so a reviewer can reconstruct who changed what and why. The
trail is read through `GET /api/incidents/{id}/activity` and is the evidence behind
story act 6, "every decision traceable" (`LANDING_PAGE_STORY.md`).

## Data honesty

Incidents are created from **synthetic** labelled telemetry in the demo. Records
must be visibly marked as synthetic in the UI and in reports; do not imply real
outages or real customers.
