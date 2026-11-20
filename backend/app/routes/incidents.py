"""Incident listing, evidence and the 2.0 lifecycle endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.services import store, lifecycle
from app.schemas import EscalateRequest, IncidentUpdate, NoteRequest, ResolveRequest

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

SEVERITIES = {"low", "medium", "high", "critical"}


def _actor(authorization: str | None) -> str:
    if authorization:
        parts = authorization.split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            user = store.get_session_user(parts[1].strip())
            if user:
                return user.get("email") or user.get("name") or "analyst"
    return "analyst"


@router.get("")
def list_incidents(status: str = None, severity: str = None,
                   detection_id: str = None):
    return store.list_incidents(status, severity, detection_id=detection_id)


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(404, "incident not found")
    return inc


@router.post("/{incident_id}")
def update_incident(incident_id: str, req: IncidentUpdate):
    ok = store.update_incident(incident_id, req.status, req.notes)
    if not ok:
        raise HTTPException(404, "incident not found")
    return {"ok": True}


@router.get("/{incident_id}/activity")
def get_activity(incident_id: str):
    if not store.get_incident(incident_id):
        raise HTTPException(404, "incident not found")
    return store.get_incident_activity(incident_id)


@router.get("/{incident_id}/notes")
def get_notes(incident_id: str):
    if not store.get_incident(incident_id):
        raise HTTPException(404, "incident not found")
    return store.list_incident_notes(incident_id)


@router.post("/{incident_id}/notes")
def add_note(incident_id: str, req: NoteRequest,
             authorization: str | None = Header(default=None)):
    note = store.add_investigation_note(incident_id, req.note.strip(), _actor(authorization))
    if not note:
        raise HTTPException(404, "incident not found")
    return note


@router.post("/{incident_id}/escalate")
def escalate(incident_id: str, req: EscalateRequest,
             authorization: str | None = Header(default=None)):
    incident = store.get_incident(incident_id)
    if not incident:
        raise HTTPException(404, "incident not found")
    if not lifecycle.can_escalate(incident["status"]):
        raise HTTPException(
            409,
            f"illegal transition: cannot escalate from '{incident['status']}'",
        )
    if not req.reason.strip():
        raise HTTPException(400, "reason is required")
    if req.severity and req.severity.lower() not in SEVERITIES:
        raise HTTPException(400, "severity must be low, medium, high or critical")
    if req.priority and req.priority.lower() not in SEVERITIES:
        raise HTTPException(400, "priority must be low, medium, high or critical")
    result = store.escalate_incident(
        incident_id,
        {
            "reason": req.reason.strip(),
            "severity": req.severity.lower() if req.severity else None,
            "priority": req.priority.lower() if req.priority else None,
            "assigned_owner": req.assigned_owner,
            "investigation_summary": req.investigation_summary,
            "evidence_refs": req.evidence_refs,
            "recommended_action": req.recommended_action,
        },
        actor=_actor(authorization),
    )
    return {"escalation": result, "incident": store.get_incident(incident_id)}


@router.post("/{incident_id}/resolve")
def resolve(incident_id: str, req: ResolveRequest,
            authorization: str | None = Header(default=None)):
    incident = store.get_incident(incident_id)
    if not incident:
        raise HTTPException(404, "incident not found")
    if not lifecycle.can_resolve(incident["status"]):
        raise HTTPException(
            409,
            f"illegal transition: cannot resolve from '{incident['status']}'",
        )
    updated = store.resolve_incident(incident_id, req.summary.strip(), _actor(authorization))
    return {"incident": updated}
