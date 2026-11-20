"""Five report types and real PDF/CSV/JSON downloads."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import store

client = TestClient(app)

REPORT_KINDS = [
    "anomaly_detection", "incident_investigation", "escalation_history",
    "experiment_evaluation", "dataset_quality",
]


@pytest.fixture(scope="module")
def detection_id():
    existing = [d for d in store.list_detections() if d.get("result_path")]
    if existing:
        return existing[0]["id"]
    ds = client.post("/api/datasets/generate",
                     json={"n_normal": 40, "n_anomaly": 8, "seed": 771}).json()
    mdl = client.post("/api/models/train", json={"dataset_id": ds["dataset_id"]}).json()
    det = client.post("/api/detection/run", json={
        "dataset_id": ds["dataset_id"], "model_id": mdl["model_id"],
    }).json()
    return det["detection_id"]


@pytest.mark.parametrize("kind", REPORT_KINDS)
def test_report_types_contain_verified_content(detection_id, kind):
    r = client.post("/api/reports", json={"detection_id": detection_id, "kind": kind})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == kind
    assert body["generated_at"]
    assert body["dataset"] is not None
    assert body["findings"] and all(isinstance(f, str) and f for f in body["findings"])
    assert body["limitations"] and len(body["limitations"]) >= 3
    assert body["method"]
    assert body["data_verified"] is True


@pytest.mark.parametrize("fmt,magic", [
    ("pdf", b"%PDF"),
    ("csv", b"report_id"),
    ("json", b'"report_id"'),
])
def test_download_returns_real_files(detection_id, fmt, magic):
    report = client.post("/api/reports", json={
        "detection_id": detection_id, "kind": "incident_investigation",
    }).json()
    rid = report["report_id"]
    r = client.get(f"/api/reports/{rid}/download?format={fmt}")
    assert r.status_code == 200, r.text[:200]
    assert len(r.content) > 100
    assert magic in r.content
    assert "attachment" in r.headers.get("content-disposition", "")
    assert fmt in r.headers.get("content-type", "") or "pdf" in r.headers.get("content-type", "")


def test_download_validation_and_legacy_kind(detection_id):
    report = client.post("/api/reports", json={
        "detection_id": detection_id, "kind": "investigation",
    })
    assert report.status_code == 200
    assert report.json()["kind"] == "investigation"  # legacy clients keep their slug
    rid = report.json()["report_id"]

    assert client.get(f"/api/reports/{rid}/download?format=txt").status_code == 400
    assert client.get("/api/reports/no-such-report/download?format=pdf").status_code == 404

    listed = client.get("/api/reports").json()
    assert any(x["id"] == rid for x in listed)
