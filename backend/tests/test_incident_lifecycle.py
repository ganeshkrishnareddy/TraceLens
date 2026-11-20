"""Incident lifecycle, escalation payloads, illegal transitions and audit trail."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import lifecycle, store

client = TestClient(app)


@pytest.fixture
def incident():
    iid = store.create_incident(
        detection_id=f"test-lifecycle-{uuid.uuid4().hex[:8]}",
        record_id="SYN-LIFECYCLE-001", score=0.91, severity="high", status="detected",
    )
    yield iid
    c = store._conn()
    for table in ("incident_activity", "investigation_notes", "escalations"):
        c.execute(f"DELETE FROM {table} WHERE incident_id=?", (iid,))
    c.execute("DELETE FROM incidents WHERE id=?", (iid,))
    c.commit()
    c.close()


def _auth_header():
    r = client.post("/api/auth/login", json={
        "email": "demo@tracelens.local", "password": "TraceLens2026!",
    })
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_notes_and_activity_are_audited(incident):
    h = _auth_header()
    r = client.post(f"/api/incidents/{incident}/notes",
                    json={"note": "Verified CPU deviation against baseline."}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["note"] == "Verified CPU deviation against baseline."

    notes = client.get(f"/api/incidents/{incident}/notes").json()
    assert any(n["note"].startswith("Verified CPU") for n in notes)

    activity = client.get(f"/api/incidents/{incident}/activity").json()
    assert activity[0]["action"] == "created"
    assert any(a["action"] == "note_added" for a in activity)
    assert all(a["created_at"] for a in activity)
    assert [a["created_at"] for a in activity] == sorted(a["created_at"] for a in activity)


def test_escalation_payload_status_and_audit(incident):
    h = _auth_header()
    payload = {
        "reason": "Sustained CPU saturation across five intervals",
        "severity": "critical",
        "priority": "high",
        "assigned_owner": "on-call SRE",
        "investigation_summary": "CPU at 95% while request rate dropped 40%",
        "evidence_refs": ["SYN-000012", "detection-metric:score"],
        "recommended_action": "Scale the service and re-check latency",
    }
    r = client.post(f"/api/incidents/{incident}/escalate", json=payload, headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["incident"]["status"] == "escalated"
    esc = body["escalation"]
    assert esc["reason"] == payload["reason"]
    assert esc["severity"] == "critical"
    assert esc["priority"] == "high"
    assert esc["assigned_owner"] == "on-call SRE"
    assert esc["investigation_summary"] == payload["investigation_summary"]
    assert esc["evidence_refs"] == payload["evidence_refs"]
    assert esc["recommended_action"] == payload["recommended_action"]

    escalations = store.list_escalations(incident)
    assert len(escalations) == 1
    assert escalations[0]["previous_status"] == "detected"
    assert escalations[0]["new_status"] == "escalated"

    activity = client.get(f"/api/incidents/{incident}/activity").json()
    esc_activity = [a for a in activity if a["action"] == "escalated"][0]
    assert esc_activity["previous_status"] == "detected"
    assert esc_activity["new_status"] == "escalated"
    assert esc_activity["reason"] == payload["reason"]
    assert esc_activity["created_at"]


def test_illegal_transitions_are_rejected(incident):
    h = _auth_header()
    assert client.post(f"/api/incidents/{incident}/escalate",
                       json={"reason": "first escalation"}, headers=h).status_code == 200
    second = client.post(f"/api/incidents/{incident}/escalate",
                         json={"reason": "second escalation"}, headers=h)
    assert second.status_code == 409
    assert "illegal transition" in second.json()["detail"].lower()

    assert client.post(f"/api/incidents/{incident}/resolve",
                       json={"summary": "fixed"}, headers=h).status_code == 200
    again = client.post(f"/api/incidents/{incident}/resolve",
                        json={"summary": "fixed again"}, headers=h)
    assert again.status_code == 409

    assert client.post("/api/incidents/does-not-exist/escalate",
                       json={"reason": "missing"}, headers=h).status_code == 404
    assert client.post("/api/incidents/does-not-exist/resolve",
                       json={"summary": "missing"}, headers=h).status_code == 404
    assert client.get("/api/incidents/does-not-exist/activity").status_code == 404


def test_resolve_records_summary_and_full_audit_trail(incident):
    h = _auth_header()
    client.post(f"/api/incidents/{incident}/notes", json={"note": "evidence attached"}, headers=h)
    client.post(f"/api/incidents/{incident}/escalate",
                json={"reason": "needs owner", "severity": "high", "priority": "medium"},
                headers=h)
    r = client.post(f"/api/incidents/{incident}/resolve",
                    json={"summary": "Capacity restored and verified"}, headers=h)
    assert r.status_code == 200
    assert r.json()["incident"]["status"] == "resolved"
    assert r.json()["incident"]["resolution_summary"] == "Capacity restored and verified"

    actions = [a["action"] for a in client.get(f"/api/incidents/{incident}/activity").json()]
    assert actions == ["created", "note_added", "escalated", "resolved"]
    assert lifecycle.normalize("open") == "detected"
    assert lifecycle.can_transition("detected", "closed") is True
    assert lifecycle.can_transition("resolved", "escalated") is False


def test_severity_filter_on_incident_list(incident):
    filtered = client.get("/api/incidents?severity=high").json()
    assert any(i["id"] == incident for i in filtered)
    assert all(i["severity"].lower() == "high" for i in filtered)
    assert client.get("/api/incidents?severity=low").status_code == 200
