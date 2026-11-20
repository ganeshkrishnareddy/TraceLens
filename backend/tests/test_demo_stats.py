"""Six demo scenarios, synthetic labelling, reset safety and DB-derived stats."""
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import store

client = TestClient(app)

EXACT_KEYS = [
    "normal", "cpu_spike", "memory_leak", "network_surge",
    "latency_error_surge", "combined_anomaly",
]


@pytest.fixture(scope="module", autouse=True)
def reset_after_demo_tests():
    real_before = {d["id"] for d in store.list_datasets(include_demo=False)}
    yield
    result = client.post("/api/demo/reset").json()
    assert result["real_data_preserved"] is True
    real_after = {d["id"] for d in store.list_datasets(include_demo=False)}
    assert real_after == real_before


def test_scenarios_are_exactly_the_six_contract_keys():
    body = client.get("/api/demo/scenarios").json()
    assert [s["key"] for s in body] == EXACT_KEYS
    assert all(s["synthetic"] for s in body)
    assert all(s["description"] and s["expected_signal"] for s in body)


@pytest.mark.parametrize("scenario", EXACT_KEYS)
def test_load_scenario_returns_labelled_synthetic_preview(scenario):
    real_before = {d["id"] for d in store.list_datasets(include_demo=False)}
    r = client.post("/api/demo/load", json={"scenario": scenario, "n_rows": 32})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["synthetic"] is True
    assert body["scenario"] == scenario
    assert body["labels"]["data_origin"] == "synthetic"
    assert body["labels"]["all_records_labelled_synthetic"] is True
    assert body["labels"]["scenario"] == scenario
    assert body["labels"]["n_normal"] + body["labels"]["n_anomaly"] == body["n_rows"]
    assert len(body["preview"]["preview"]) > 0
    assert "data_origin" in body["preview"]["columns"]
    assert all(row["data_origin"] == "synthetic" for row in body["preview"]["preview"])
    assert all(str(row["record_id"]).startswith("SYN-") for row in body["preview"]["preview"])

    ds = store.get_dataset(body["dataset_id"])
    assert ds is not None and ds["kind"] == "demo_synthetic"
    assert ds["demo_run_id"] == body["demo_run_id"]
    assert {d["id"] for d in store.list_datasets(include_demo=False)} == real_before


def test_unknown_scenario_is_rejected():
    assert client.post("/api/demo/load", json={"scenario": "not_real"}).status_code == 400


def test_stats_overview_is_derived_from_database_only():
    body = client.get("/api/stats/overview").json()
    conn = sqlite3.connect(str(store.DB_PATH))
    try:
        counts = {
            "n_datasets": conn.execute("SELECT COUNT(*) FROM datasets").fetchone()[0],
            "n_models": conn.execute("SELECT COUNT(*) FROM models").fetchone()[0],
            "n_detections": conn.execute("SELECT COUNT(*) FROM detections").fetchone()[0],
            "n_incidents": conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0],
            "n_experiments": conn.execute("SELECT COUNT(*) FROM experiments").fetchone()[0],
            "n_reports": conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0],
            "n_escalations": conn.execute("SELECT COUNT(*) FROM escalations").fetchone()[0],
            "n_notes": conn.execute("SELECT COUNT(*) FROM investigation_notes").fetchone()[0],
            "n_activity": conn.execute("SELECT COUNT(*) FROM incident_activity").fetchone()[0],
            "n_detection_results": conn.execute("SELECT COUNT(*) FROM detection_results").fetchone()[0],
        }
    finally:
        conn.close()
    for key, value in counts.items():
        assert body[key] == value, f"{key}: API {body[key]} != DB {value}"
    assert body["n_open_incidents"] + body["n_resolved_incidents"] <= body["n_incidents"]
    assert body["n_synthetic_datasets"] + body["n_real_datasets"] == body["n_datasets"]
    assert all(isinstance(v, int) and v >= 0 for k, v in body.items()
               if k.startswith("n_") and isinstance(v, int))
