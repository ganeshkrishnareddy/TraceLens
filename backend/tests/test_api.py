"""Integration tests for the FastAPI application."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def dataset_id():
    r = client.post("/api/datasets/generate",
                    json={"n_normal": 60, "n_anomaly": 12, "seed": 31})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["n_rows"] == 72
    return body["dataset_id"]


@pytest.fixture(scope="module")
def second_dataset_id():
    r = client.post("/api/datasets/generate",
                    json={"n_normal": 60, "n_anomaly": 12, "seed": 97})
    assert r.status_code == 200, r.text
    return r.json()["dataset_id"]


@pytest.fixture(scope="module")
def model_id(dataset_id):
    r = client.post("/api/models/train", json={
        "dataset_id": dataset_id,
        "method": "isolation_forest",
        "threshold": 0.5,
        "contamination": 0.15,
    })
    assert r.status_code == 200, r.text
    return r.json()["model_id"]


@pytest.fixture(scope="module")
def detection(dataset_id, model_id):
    r = client.post("/api/detection/run", json={
        "dataset_id": dataset_id,
        "model_id": model_id,
        "threshold": 0.5,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_root_and_health():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "TraceLens"
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_generate_dataset(dataset_id):
    assert dataset_id.startswith("ds-")
    r = client.get(f"/api/datasets/{dataset_id}")
    assert r.status_code == 200
    assert r.json()["id"] == dataset_id
    r = client.get(f"/api/datasets/{dataset_id}/preview?limit=5")
    assert r.status_code == 200
    assert len(r.json()["preview"]) == 5


def test_train_model(model_id):
    assert model_id.startswith("mdl-")
    r = client.get("/api/models")
    assert r.status_code == 200
    assert any(m["id"] == model_id for m in r.json())


def test_detect_and_results(detection):
    assert detection["n_rows"] == 72
    assert 0 <= detection["n_flagged"] <= 72
    assert detection["metrics"] is not None
    assert detection["metrics"]["n_samples"] == 72
    det_id = detection["detection_id"]
    r = client.get(f"/api/detection/results/{det_id}")
    assert r.status_code == 200
    assert r.json()["n_rows"] == 72
    r = client.get("/api/detection/results")
    assert r.status_code == 200
    assert any(d["id"] == det_id for d in r.json())


def test_incidents_created_and_updated(detection):
    r = client.get("/api/incidents")
    assert r.status_code == 200
    incidents = r.json()
    assert len(incidents) >= detection["n_flagged"]
    if not incidents:
        pytest.skip("no incidents were flagged for this run")
    inc = incidents[0]
    r = client.get(f"/api/incidents/{inc['id']}")
    assert r.status_code == 200
    r = client.post(f"/api/incidents/{inc['id']}",
                    json={"status": "resolved", "notes": "verified in test"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
    r = client.get(f"/api/incidents/{inc['id']}")
    assert r.json()["status"] == "resolved"
    r = client.get("/api/incidents?status=resolved")
    assert any(i["id"] == inc["id"] for i in r.json())


def test_experiment_endpoint(dataset_id, second_dataset_id):
    r = client.post("/api/experiments/run", json={
        "train_dataset_id": dataset_id,
        "test_dataset_id": second_dataset_id,
        "methods": ["isolation_forest", "statistical_mad"],
        "thresholds": {"isolation_forest": 0.5, "statistical_mad": 0.3},
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["n_train"] == 72
    assert body["n_test"] == 72
    assert len(body["results"]) == 2
    assert {x["method"] for x in body["results"]} == {"isolation_forest", "statistical_mad"}
    assert all(x["metrics"]["n_samples"] == 72 for x in body["results"])
    r = client.get("/api/experiments")
    assert r.status_code == 200
    assert any(e["id"] == body["experiment_id"] for e in r.json())


def test_report_endpoint(detection):
    r = client.post("/api/reports", json={
        "detection_id": detection["detection_id"],
        "kind": "investigation",
    })
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "investigation"
    r = client.get("/api/reports")
    assert r.status_code == 200
    assert any(x["id"] == r.json()[0]["id"] for x in r.json())
