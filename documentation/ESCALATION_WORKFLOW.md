# TraceLens — Escalation Workflow

> **Status note.** Escalation is a **transformation target** defined in
> `TRANSFORMATION_CONTRACT.md` §6 and is one of the ten acceptance journeys
> (**J7**, `USER_JOURNEYS.md`). It extends — it does not replace — the existing
> incident endpoints in `backend/app/routes/incidents.py`.

## Purpose

Escalation is the point where an evidence-backed anomaly becomes an owned action.
The workflow captures the reason, severity, priority, assigned owner, the
investigation so far, the evidence it rests on and a recommended next action — then
records every part of that decision in the incident audit trail.

## Preconditions

- An incident must exist (created automatically by `POST /api/detection/run` for a
  flagged record).
- The incident's lifecycle state must permit escalation
  (`detected → triaged → investigating → escalated → …`, see
  `INCIDENT_LIFECYCLE.md`).
- Escalating a **missing** incident must be rejected by the API, not silently
  accepted (contract §6).

## Endpoint

```
POST /api/incidents/{id}/escalate
```

Request body (all fields from contract §6):

| Field | Type | Meaning |
|---|---|---|
| `reason` | string | Why this incident is being escalated |
| `severity` | string | low / medium / high / critical |
| `priority` | string | Handling priority assigned by the analyst |
| `assigned_owner` | string | Person/role the incident is handed to |
| `investigation_summary` | string | What the investigation found so far |
| `evidence_refs` | array | References to the supporting evidence (record IDs, affected features, report/detection IDs) |
| `recommended_action` | string | The concrete action the owner should take |

Response: the updated incident plus a written audit entry.

## Evidence refs — what they point to

Evidence is grounded in real detection output (`ml-engine/explain.py`,
`backend/app/services/ml_service.py`):

- `record_id` of the flagged telemetry window (`REC-000000` format).
- `affected_features` identified by robust deviation (up to three).
- The explanation's `evidence` sentences (observed value vs baseline median).
- The `detection_id` and `result_path` of the run that produced the incident.
- A generated report ID, when one has been produced.

Do not fabricate evidence refs. Every reference must resolve to data actually
present in the local dataset or artefacts.

## Activity trail

`GET /api/incidents/{id}/activity` returns an ordered audit trail. The escalation
entry records the payload above plus the transition into `escalated`. Together with
notes (`POST /api/incidents/{id}/notes`) and resolution
(`POST /api/incidents/{id}/resolve`), this makes the whole decision traceable — the
final act of the landing-page story (`LANDING_PAGE_STORY.md`).

## Analyst steps (J7)

1. Open the incident in `/app/investigate` (from an anomaly explanation in
   `/app/explain`).
2. Review severity, score and the explanation's evidence/next steps/unknowns.
3. Attach evidence refs and add notes.
4. Fill the escalation form: reason, severity, priority, owner, summary, evidence,
   recommended action.
5. Submit → confirm the status updates to `escalated`.
6. Open the activity trail and verify the escalation entry appears in order.

## Related database objects (target)

`incidents`, `escalations`, `investigation_notes`, `incident_activity` — see
`DATABASE_SCHEMA.md`. Migrations must extend `tracelens.db` without deleting
existing data.

## Honesty

Demo incidents come from visibly labelled **synthetic** telemetry. An escalation
is a workflow demonstration, not a real operational page to a real on-call engineer.
