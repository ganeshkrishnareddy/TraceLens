"""
SQLite-backed state for TraceLens.

Datasets/models/results live on disk under the project folders; metadata,
detection results, incidents, audit records, auth and reports live in
``tracelens.db``. The 2.0 additions are additive: every legacy function keeps
its original signature and the original database is never reset or deleted.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import (
    DATASETS_DIR, EXPERIMENTS_DIR, REPORTS_DIR, MODELS_DIR,
)
from app.services.security import hash_password, hash_token, utc_after_hours, utc_now
from app.services.schema import ensure_schema

DB_PATH = DATASETS_DIR.parent / "tracelens.db"

DEMO_EMAIL = "demo@tracelens.local"
DEMO_PASSWORD = "TraceLens2026!"


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    return c


def init_db() -> Dict[str, int]:
    """Apply the additive 2.0 schema and seed the documented demo account."""
    counts = ensure_schema(DB_PATH)
    c = _conn()
    try:
        c.execute(
            """INSERT OR IGNORE INTO users(id,email,name,password_hash,role,is_demo,created_at)
               VALUES(?,?,?,?,?,?,?)""",
            (new_id("usr"), DEMO_EMAIL, "TraceLens Demo User",
             hash_password(DEMO_PASSWORD), "analyst", 1, _now()),
        )
        c.commit()
    finally:
        c.close()
    return counts


def new_id(prefix: str = "") -> str:
    return (prefix + "-" if prefix else "") + uuid.uuid4().hex[:12]


def _now() -> str:
    return utc_now()


def _json(value: Any) -> Optional[str]:
    return None if value is None else json.dumps(value, default=str)


def _unjson(value: Any, default: Any = None) -> Any:
    if value is None or value == "":
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------------------
# datasets
# ---------------------------------------------------------------------------
def register_dataset(name: str, path: Path, n_rows: int, kind: str = "uploaded",
                     *, synthetic: bool = False, origin: Optional[str] = None,
                     scenario: Optional[str] = None,
                     demo_run_id: Optional[str] = None) -> str:
    did = new_id("ds")
    c = _conn()
    c.execute(
        """INSERT INTO datasets(id,name,path,n_rows,created_at,kind,synthetic,origin,scenario,demo_run_id)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (did, name, str(path), n_rows, _now(), kind, int(bool(synthetic)),
         origin, scenario, demo_run_id),
    )
    c.commit()
    c.close()
    return did


def list_datasets(*, include_demo: bool = True) -> List[Dict]:
    c = _conn()
    if include_demo:
        rows = c.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    else:
        rows = c.execute(
            "SELECT * FROM datasets WHERE COALESCE(synthetic,0)=0 AND kind NOT LIKE 'demo%' "
            "ORDER BY created_at DESC"
        ).fetchall()
    c.close()
    return [dict(r) for r in rows]


def get_dataset(did: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM datasets WHERE id=?", (did,)).fetchone()
    c.close()
    return dict(r) if r else None


def delete_dataset(did: str) -> Optional[Dict]:
    c = _conn()
    row = c.execute("SELECT * FROM datasets WHERE id=?", (did,)).fetchone()
    if row:
        c.execute("DELETE FROM datasets WHERE id=?", (did,))
        c.commit()
    c.close()
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# models cache
# ---------------------------------------------------------------------------
_MODELS: Dict[str, Dict[str, Any]] = {}


def cache_model(mid: str, payload: Dict[str, Any]) -> None:
    _MODELS[mid] = payload


def get_model(mid: str) -> Optional[Dict[str, Any]]:
    return _MODELS.get(mid)


def register_model(dataset_id: str, method: str, threshold: float,
                   path: str | None = None, *, dataset_name: Optional[str] = None,
                   config: Optional[Dict] = None) -> str:
    mid = new_id("mdl")
    c = _conn()
    c.execute(
        """INSERT INTO models(id,dataset_id,method,threshold,created_at,path,dataset_name,config_json)
           VALUES(?,?,?,?,?,?,?,?)""",
        (mid, dataset_id, method, threshold, _now(), path, dataset_name, _json(config)),
    )
    c.commit()
    c.close()
    return mid


def list_models() -> List[Dict]:
    c = _conn()
    rows = c.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# detections and per-record results
# ---------------------------------------------------------------------------
def register_detection(dataset_id: str, model_id: str, method: str, threshold: float,
                       n_flagged: int, result_path: str, *,
                       n_rows: Optional[int] = None,
                       dataset_name: Optional[str] = None,
                       synthetic: bool = False,
                       demo_run_id: Optional[str] = None) -> str:
    did = new_id("det")
    c = _conn()
    c.execute(
        """INSERT INTO detections(id,dataset_id,model_id,method,threshold,n_flagged,created_at,
                                  result_path,n_rows,dataset_name,synthetic,demo_run_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
        (did, dataset_id, model_id, method, threshold, n_flagged, _now(), result_path,
         n_rows, dataset_name, int(bool(synthetic)), demo_run_id),
    )
    c.commit()
    c.close()
    return did


def list_detections(*, demo_run_id: Optional[str] = None) -> List[Dict]:
    c = _conn()
    if demo_run_id:
        rows = c.execute(
            "SELECT * FROM detections WHERE demo_run_id=? ORDER BY created_at DESC",
            (demo_run_id,),
        ).fetchall()
    else:
        rows = c.execute("SELECT * FROM detections ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


def get_detection(did: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM detections WHERE id=?", (did,)).fetchone()
    c.close()
    return dict(r) if r else None


def persist_detection_results(detection_id: str, rows: List[Dict]) -> int:
    """Mirror per-record results into SQLite without replacing the JSON artefact."""
    c = _conn()
    for r in rows:
        c.execute(
            """INSERT INTO detection_results(id,detection_id,record_id,score,flag,severity,
                                             affected_features,explanation,true_label,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (new_id("dres"), detection_id, r.get("record_id"), r.get("score"),
             int(r.get("flag") or 0), r.get("severity"), _json(r.get("affected_features")),
             _json(r.get("explanation")), r.get("true_label"), _now()),
        )
    c.commit()
    n = c.execute(
        "SELECT COUNT(*) FROM detection_results WHERE detection_id=?", (detection_id,)
    ).fetchone()[0]
    c.close()
    return int(n)


def list_detection_results(detection_id: str) -> List[Dict]:
    c = _conn()
    rows = c.execute(
        "SELECT * FROM detection_results WHERE detection_id=? ORDER BY rowid", (detection_id,)
    ).fetchall()
    c.close()
    out = []
    for r in rows:
        d = dict(r)
        d["affected_features"] = _unjson(d.get("affected_features"), [])
        d["explanation"] = _unjson(d.get("explanation"), {})
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# incidents and lifecycle
# ---------------------------------------------------------------------------
def upsert_incident(detection_id: str, record_id: str, score: float, severity: str,
                    status: str = "open", notes: str = "", *,
                    demo_run_id: Optional[str] = None) -> str:
    iid = new_id("inc")
    c = _conn()
    c.execute(
        """INSERT INTO incidents(id,detection_id,record_id,score,severity,status,notes,created_at,updated_at,demo_run_id)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (iid, detection_id, record_id, score, severity, status, notes, _now(), _now(), demo_run_id),
    )
    c.execute(
        """INSERT INTO incident_activity(id,incident_id,action,actor,previous_status,new_status,reason,detail,created_at)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (new_id("act"), iid, "created", "detection_pipeline", None, status,
         None, f"Incident opened for record {record_id}", _now()),
    )
    c.commit()
    c.close()
    return iid


def create_incident(*, detection_id: Optional[str] = None, record_id: str = "MANUAL-001",
                    score: float = 0.0, severity: str = "medium",
                    status: str = "detected", demo_run_id: Optional[str] = None) -> str:
    """Create a controlled incident (used by demo flows and lifecycle tests)."""
    return upsert_incident(detection_id or "manual", record_id, score, severity,
                           status=status, demo_run_id=demo_run_id)


def get_incident(iid: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()
    c.close()
    if not r:
        return None
    d = dict(r)
    d["evidence_refs"] = _unjson(d.get("evidence_refs"), [])
    return d


def list_incidents(status: Optional[str] = None, severity: Optional[str] = None,
                   *, detection_id: Optional[str] = None,
                   demo_run_id: Optional[str] = None) -> List[Dict]:
    c = _conn()
    clauses, params = [], []
    if status:
        clauses.append("status=?"); params.append(status)
    if severity:
        clauses.append("LOWER(severity)=LOWER(?)"); params.append(severity)
    if detection_id:
        clauses.append("detection_id=?"); params.append(detection_id)
    if demo_run_id:
        clauses.append("demo_run_id=?"); params.append(demo_run_id)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = c.execute(f"SELECT * FROM incidents{where} ORDER BY created_at DESC", params).fetchall()
    c.close()
    out = []
    for r in rows:
        d = dict(r)
        d["evidence_refs"] = _unjson(d.get("evidence_refs"), [])
        out.append(d)
    return out


def update_incident(iid: str, status: Optional[str] = None, notes: Optional[str] = None) -> bool:
    """Legacy update endpoint; kept permissive for existing integrations/tests."""
    c = _conn()
    row = c.execute("SELECT status FROM incidents WHERE id=?", (iid,)).fetchone()
    if not row:
        c.close()
        return False
    sets, params = [], []
    if status is not None:
        sets.append("status=?"); params.append(status)
    if notes is not None:
        sets.append("notes=?"); params.append(notes)
    if not sets:
        c.close()
        return False
    sets.append("updated_at=?"); params.append(_now())
    params.append(iid)
    c.execute(f"UPDATE incidents SET {','.join(sets)} WHERE id=?", params)
    if status is not None and status != row["status"]:
        c.execute(
            """INSERT INTO incident_activity(id,incident_id,action,actor,previous_status,new_status,reason,detail,created_at)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (new_id("act"), iid, "status_updated", "api", row["status"], status,
             None, "Status updated through legacy endpoint", _now()),
        )
    c.commit()
    c.close()
    return True


def _record_activity(c: sqlite3.Connection, iid: str, action: str, actor: str,
                     previous: Optional[str], new: Optional[str],
                     reason: Optional[str], detail: Optional[str]) -> None:
    c.execute(
        """INSERT INTO incident_activity(id,incident_id,action,actor,previous_status,new_status,reason,detail,created_at)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (new_id("act"), iid, action, actor, previous, new, reason, detail, _now()),
    )


def add_investigation_note(iid: str, note: str, author: str = "analyst") -> Optional[Dict]:
    c = _conn()
    row = c.execute("SELECT status FROM incidents WHERE id=?", (iid,)).fetchone()
    if not row:
        c.close()
        return None
    nid = new_id("note")
    c.execute(
        "INSERT INTO investigation_notes(id,incident_id,author,note,created_at) VALUES(?,?,?,?,?)",
        (nid, iid, author, note, _now()),
    )
    _record_activity(c, iid, "note_added", author, row["status"], row["status"],
                     None, note[:500])
    c.execute("UPDATE incidents SET updated_at=? WHERE id=?", (_now(), iid))
    c.commit()
    rec = c.execute("SELECT * FROM investigation_notes WHERE id=?", (nid,)).fetchone()
    c.close()
    return dict(rec) if rec else None


def escalate_incident(iid: str, payload: Dict[str, Any], actor: str = "analyst") -> Optional[Dict]:
    c = _conn()
    row = c.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()
    if not row:
        c.close()
        return None
    previous = row["status"]
    new = "escalated"
    eid = new_id("esc")
    evidence = payload.get("evidence_refs") or []
    c.execute(
        """INSERT INTO escalations(id,incident_id,reason,severity,priority,assigned_owner,
                                   investigation_summary,evidence_refs,recommended_action,
                                   previous_status,new_status,actor,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (eid, iid, payload.get("reason"), payload.get("severity"), payload.get("priority"),
         payload.get("assigned_owner"), payload.get("investigation_summary"),
         _json(evidence), payload.get("recommended_action"), previous, new, actor, _now()),
    )
    c.execute(
        """UPDATE incidents SET status=?, severity=COALESCE(?,severity), priority=?,
               assigned_owner=?, investigation_summary=?, evidence_refs=?, recommended_action=?,
               escalated_at=?, updated_at=? WHERE id=?""",
        (new, payload.get("severity"), payload.get("priority"), payload.get("assigned_owner"),
         payload.get("investigation_summary"), _json(evidence), payload.get("recommended_action"),
         _now(), _now(), iid),
    )
    _record_activity(c, iid, "escalated", actor, previous, new,
                     payload.get("reason"), payload.get("investigation_summary"))
    c.commit()
    rec = c.execute("SELECT * FROM escalations WHERE id=?", (eid,)).fetchone()
    c.close()
    d = dict(rec) if rec else {}
    d["evidence_refs"] = _unjson(d.get("evidence_refs"), [])
    return d


def resolve_incident(iid: str, summary: str, actor: str = "analyst") -> Optional[Dict]:
    c = _conn()
    row = c.execute("SELECT status FROM incidents WHERE id=?", (iid,)).fetchone()
    if not row:
        c.close()
        return None
    previous = row["status"]
    new = "resolved"
    c.execute(
        """UPDATE incidents SET status=?, resolution_summary=?, resolved_at=?, updated_at=?
           WHERE id=?""",
        (new, summary, _now(), _now(), iid),
    )
    _record_activity(c, iid, "resolved", actor, previous, new, summary, summary)
    c.commit()
    c.close()
    return get_incident(iid)


def get_incident_activity(iid: str) -> List[Dict]:
    c = _conn()
    rows = c.execute(
        "SELECT * FROM incident_activity WHERE incident_id=? ORDER BY created_at, rowid", (iid,)
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]


def list_incident_notes(iid: str) -> List[Dict]:
    c = _conn()
    rows = c.execute(
        "SELECT * FROM investigation_notes WHERE incident_id=? ORDER BY created_at, rowid", (iid,)
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]


def list_escalations(incident_id: Optional[str] = None) -> List[Dict]:
    c = _conn()
    if incident_id:
        rows = c.execute(
            "SELECT * FROM escalations WHERE incident_id=? ORDER BY created_at DESC", (incident_id,)
        ).fetchall()
    else:
        rows = c.execute("SELECT * FROM escalations ORDER BY created_at DESC").fetchall()
    c.close()
    out = []
    for r in rows:
        d = dict(r)
        d["evidence_refs"] = _unjson(d.get("evidence_refs"), [])
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# experiments
# ---------------------------------------------------------------------------
def register_experiment(name: str, result_path: str, *, config: Optional[Dict] = None,
                        metrics: Optional[Dict] = None,
                        demo_run_id: Optional[str] = None) -> str:
    eid = new_id("exp")
    c = _conn()
    c.execute(
        """INSERT INTO experiments(id,name,created_at,result_path,config_json,metrics_json,demo_run_id)
           VALUES(?,?,?,?,?,?,?)""",
        (eid, name, _now(), result_path, _json(config), _json(metrics), demo_run_id),
    )
    c.commit()
    c.close()
    return eid


def get_experiment(eid: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM experiments WHERE id=?", (eid,)).fetchone()
    c.close()
    return dict(r) if r else None


def list_experiments() -> List[Dict]:
    c = _conn()
    rows = c.execute("SELECT * FROM experiments ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# reports
# ---------------------------------------------------------------------------
def register_report(kind: str, path: str, **meta: Any) -> str:
    rid = new_id("rep")
    c = _conn()
    c.execute(
        """INSERT INTO reports(id,kind,created_at,path,title,dataset_id,dataset_name,method,
                               generated_at,config_json,findings_json,limitations_json,
                               content_path,data_verified,demo_run_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (rid, kind, meta.get("created_at") or _now(), path, meta.get("title"),
         meta.get("dataset_id"), meta.get("dataset_name"), meta.get("method"),
         meta.get("generated_at") or _now(), _json(meta.get("config")),
         _json(meta.get("findings")), _json(meta.get("limitations")),
         meta.get("content_path") or path, int(meta.get("data_verified", 1)),
         meta.get("demo_run_id")),
    )
    c.commit()
    c.close()
    return rid


def get_report(rid: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM reports WHERE id=?", (rid,)).fetchone()
    c.close()
    if not r:
        return None
    d = dict(r)
    for key in ("config", "findings", "limitations"):
        d[key] = _unjson(d.get(f"{key}_json"), [] if key != "config" else {})
    return d


def list_reports() -> List[Dict]:
    c = _conn()
    rows = c.execute("SELECT * FROM reports ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# auth: users and sessions
# ---------------------------------------------------------------------------
def create_user(email: str, password_hash: str, name: str,
                role: str = "analyst") -> Optional[Dict]:
    uid = new_id("usr")
    c = _conn()
    try:
        c.execute(
            """INSERT INTO users(id,email,name,password_hash,role,is_demo,created_at)
               VALUES(?,?,?,?,?,0,?)""",
            (uid, email.strip().lower(), name or email.split("@")[0], password_hash, role, _now()),
        )
        c.commit()
    except sqlite3.IntegrityError:
        c.close()
        return None
    row = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    c.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
    c.close()
    return dict(r) if r else None


def get_user_by_id(uid: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    c.close()
    return dict(r) if r else None


def create_session(user_id: str) -> str:
    token = new_id("") + "." + new_id("")  # opaque, two random segments
    c = _conn()
    c.execute(
        "INSERT INTO sessions(token_hash,user_id,created_at,expires_at,revoked) VALUES(?,?,?,?,0)",
        (hash_token(token), user_id, _now(), utc_after_hours()),
    )
    c.commit()
    c.close()
    return token


def get_session_user(token: str) -> Optional[Dict]:
    if not token:
        return None
    c = _conn()
    r = c.execute(
        """SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
           WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at>?""",
        (hash_token(token), _now()),
    ).fetchone()
    c.close()
    return dict(r) if r else None


def revoke_session(token: str) -> bool:
    c = _conn()
    c.execute("UPDATE sessions SET revoked=1 WHERE token_hash=?", (hash_token(token),))
    changed = c.total_changes > 0
    c.commit()
    c.close()
    return bool(changed)


def list_users() -> List[Dict]:
    c = _conn()
    rows = c.execute("SELECT id,email,name,role,is_demo,created_at FROM users ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# demo runs (synthetic fixtures only; never touches real datasets)
# ---------------------------------------------------------------------------
def create_demo_run(scenario: str, *, dataset_id: Optional[str] = None,
                    detection_id: Optional[str] = None,
                    note: Optional[str] = None) -> str:
    rid = new_id("demo")
    c = _conn()
    c.execute(
        """INSERT INTO demo_runs(id,scenario,created_at,dataset_id,detection_id,incident_ids,report_ids,active,note)
           VALUES(?,?,?,?,?,?,?,1,?)""",
        (rid, scenario, _now(), dataset_id, detection_id, "[]", "[]", note),
    )
    c.commit()
    c.close()
    return rid


def get_demo_run(rid: str) -> Optional[Dict]:
    c = _conn()
    r = c.execute("SELECT * FROM demo_runs WHERE id=?", (rid,)).fetchone()
    c.close()
    return dict(r) if r else None


def list_demo_runs(active_only: bool = False) -> List[Dict]:
    c = _conn()
    if active_only:
        rows = c.execute("SELECT * FROM demo_runs WHERE active=1 ORDER BY created_at DESC").fetchall()
    else:
        rows = c.execute("SELECT * FROM demo_runs ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


def update_demo_run(rid: str, **fields: Any) -> bool:
    allowed = {"dataset_id", "detection_id", "incident_ids", "report_ids", "active", "note"}
    sets, params = [], []
    for key, value in fields.items():
        if key in allowed:
            sets.append(f"{key}=?")
            params.append(_json(value) if key in {"incident_ids", "report_ids"} else value)
    if not sets:
        return False
    params.append(rid)
    c = _conn()
    c.execute(f"UPDATE demo_runs SET {','.join(sets)} WHERE id=?", params)
    c.commit()
    c.close()
    return True


def reset_demo_runs() -> Dict[str, int]:
    """Remove only synthetic demo fixtures. Real datasets/rows are untouched."""
    c = _conn()
    runs = c.execute("SELECT * FROM demo_runs").fetchall()
    dataset_ids = [r["dataset_id"] for r in runs if r["dataset_id"]]
    counts = {"runs": len(runs), "datasets": 0, "detections": 0, "incidents": 0,
              "reports": 0, "results": 0, "models": 0, "files": []}
    for did in dataset_ids:
        # guard: only demo-labelled datasets may be removed
        row = c.execute(
            "SELECT id,path FROM datasets WHERE id=? AND (kind LIKE 'demo%' OR COALESCE(synthetic,0)=1)",
            (did,),
        ).fetchone()
        if not row:
            continue
        if row["path"]:
            counts["files"].append(row["path"])
        for m in c.execute("SELECT id,path FROM models WHERE dataset_id=?", (did,)).fetchall():
            if m["path"]:
                counts["files"].append(m["path"])
            counts["models"] += c.execute("DELETE FROM models WHERE id=?", (m["id"],)).rowcount
        for rep in c.execute(
            "SELECT id,path,content_path FROM reports WHERE dataset_id=?", (did,)
        ).fetchall():
            for p in (rep["path"], rep["content_path"]):
                if p:
                    counts["files"].append(p)
            counts["reports"] += c.execute("DELETE FROM reports WHERE id=?", (rep["id"],)).rowcount
        det_ids = [r[0] for r in c.execute(
            "SELECT id FROM detections WHERE dataset_id=?", (did,)
        ).fetchall()]
        for det_id in det_ids:
            det_row = c.execute("SELECT result_path FROM detections WHERE id=?", (det_id,)).fetchone()
            if det_row and det_row["result_path"]:
                counts["files"].append(det_row["result_path"])
            counts["results"] += c.execute(
                "SELECT COUNT(*) FROM detection_results WHERE detection_id=?", (det_id,)
            ).fetchone()[0]
            c.execute("DELETE FROM detection_results WHERE detection_id=?", (det_id,))
            inc_ids = [r[0] for r in c.execute(
                "SELECT id FROM incidents WHERE detection_id=?", (det_id,)
            ).fetchall()]
            for iid in inc_ids:
                c.execute("DELETE FROM incident_activity WHERE incident_id=?", (iid,))
                c.execute("DELETE FROM investigation_notes WHERE incident_id=?", (iid,))
                c.execute("DELETE FROM escalations WHERE incident_id=?", (iid,))
            counts["incidents"] += len(inc_ids)
            c.execute("DELETE FROM incidents WHERE detection_id=?", (det_id,))
            counts["detections"] += c.execute(
                "DELETE FROM detections WHERE id=?", (det_id,)
            ).rowcount
        c.execute("DELETE FROM datasets WHERE id=?", (did,))
        counts["datasets"] += 1
    c.execute("DELETE FROM demo_runs")
    c.commit()
    c.close()
    return counts


# ---------------------------------------------------------------------------
# stats — every value is a live database count
# ---------------------------------------------------------------------------
def overall_stats() -> Dict[str, Any]:
    c = _conn()

    def scalar(sql: str, params: tuple = ()) -> int:
        return int(c.execute(sql, params).fetchone()[0] or 0)

    by_status = {
        r["status"]: r["n"] for r in c.execute(
            "SELECT status, COUNT(*) AS n FROM incidents GROUP BY status"
        ).fetchall()
    }
    by_severity = {
        r["severity"]: r["n"] for r in c.execute(
            "SELECT severity, COUNT(*) AS n FROM incidents GROUP BY severity"
        ).fetchall()
    }
    stats = {
        "n_datasets": scalar("SELECT COUNT(*) FROM datasets"),
        "n_real_datasets": scalar(
            "SELECT COUNT(*) FROM datasets WHERE NOT (kind LIKE 'demo%' "
            "OR LOWER(kind)='synthetic' OR COALESCE(synthetic,0)=1)"
        ),
        "n_synthetic_datasets": scalar(
            "SELECT COUNT(*) FROM datasets WHERE kind LIKE 'demo%' "
            "OR LOWER(kind)='synthetic' OR COALESCE(synthetic,0)=1"
        ),
        "n_demo_datasets": scalar("SELECT COUNT(*) FROM datasets WHERE kind LIKE 'demo%'"),
        "n_models": scalar("SELECT COUNT(*) FROM models"),
        "n_detections": scalar("SELECT COUNT(*) FROM detections"),
        "n_detection_results": scalar("SELECT COUNT(*) FROM detection_results"),
        "n_flagged": scalar("SELECT COALESCE(SUM(n_flagged),0) FROM detections"),
        "n_rows_processed": scalar("SELECT COALESCE(SUM(n_rows),0) FROM detections")
                            or scalar("SELECT COALESCE(SUM(n_rows),0) FROM datasets"),
        "n_incidents": scalar("SELECT COUNT(*) FROM incidents"),
        "n_open_incidents": scalar(
            "SELECT COUNT(*) FROM incidents WHERE status IN ('open','detected','triaged','investigating')"
        ),
        "n_escalated_incidents": scalar("SELECT COUNT(*) FROM incidents WHERE status='escalated'"),
        "n_resolved_incidents": scalar("SELECT COUNT(*) FROM incidents WHERE status IN ('resolved','closed')"),
        "n_escalations": scalar("SELECT COUNT(*) FROM escalations"),
        "n_notes": scalar("SELECT COUNT(*) FROM investigation_notes"),
        "n_activity": scalar("SELECT COUNT(*) FROM incident_activity"),
        "n_experiments": scalar("SELECT COUNT(*) FROM experiments"),
        "n_reports": scalar("SELECT COUNT(*) FROM reports"),
        "n_users": scalar("SELECT COUNT(*) FROM users"),
        "n_sessions": scalar("SELECT COUNT(*) FROM sessions WHERE revoked=0"),
        "incidents_by_status": by_status,
        "incidents_by_severity": by_severity,
        "recent_detections": [dict(r) for r in c.execute(
            "SELECT * FROM detections ORDER BY created_at DESC LIMIT 5"
        ).fetchall()],
    }
    c.close()
    return stats


# Applied once at import so the app works on a fresh checkout without a manual
# migration step. The standalone scripts/migrate_v2.py calls the same schema
# helper and prints a preservation report.
init_db()
