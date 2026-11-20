"""Idempotent SQLite schema for TraceLens 2.0.

Every statement is additive: CREATE TABLE IF NOT EXISTS and PRAGMA-guarded
ALTER TABLE ... ADD COLUMN. Nothing here deletes, resets or rewrites existing
rows. Both backend startup (``store.init_db``) and ``scripts/migrate_v2.py``
call :func:`ensure_schema`, so the app and the standalone migration can never
drift apart.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Dict, List, Tuple

# Tables introduced or extended for the 2.0 contract. The original column sets
# are kept verbatim so an existing tracelens.db upgrades in place.
TABLE_STATEMENTS: List[str] = [
    """
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT,
        path TEXT,
        n_rows INTEGER,
        created_at TEXT,
        kind TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        dataset_id TEXT,
        method TEXT,
        threshold REAL,
        created_at TEXT,
        path TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS detections (
        id TEXT PRIMARY KEY,
        dataset_id TEXT,
        model_id TEXT,
        method TEXT,
        threshold REAL,
        n_flagged INTEGER,
        created_at TEXT,
        result_path TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS detection_results (
        id TEXT PRIMARY KEY,
        detection_id TEXT NOT NULL,
        record_id TEXT,
        score REAL,
        flag INTEGER,
        severity TEXT,
        affected_features TEXT,
        explanation TEXT,
        true_label INTEGER,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        detection_id TEXT,
        record_id TEXT,
        score REAL,
        severity TEXT,
        status TEXT,
        notes TEXT,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS escalations (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        reason TEXT,
        severity TEXT,
        priority TEXT,
        assigned_owner TEXT,
        investigation_summary TEXT,
        evidence_refs TEXT,
        recommended_action TEXT,
        previous_status TEXT,
        new_status TEXT,
        actor TEXT,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS investigation_notes (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        author TEXT,
        note TEXT,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS incident_activity (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        action TEXT,
        actor TEXT,
        previous_status TEXT,
        new_status TEXT,
        reason TEXT,
        detail TEXT,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        result_path TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        kind TEXT,
        created_at TEXT,
        path TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'analyst',
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT,
        expires_at TEXT,
        revoked INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS demo_runs (
        id TEXT PRIMARY KEY,
        scenario TEXT,
        created_at TEXT,
        dataset_id TEXT,
        detection_id TEXT,
        incident_ids TEXT,
        report_ids TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        note TEXT
    )
    """,
]

# Additive columns keyed by table. Skipped when already present.
EXTRA_COLUMNS: Dict[str, Dict[str, str]] = {
    "datasets": {
        "synthetic": "INTEGER NOT NULL DEFAULT 0",
        "origin": "TEXT",
        "scenario": "TEXT",
        "demo_run_id": "TEXT",
    },
    "models": {
        "dataset_name": "TEXT",
        "config_json": "TEXT",
    },
    "detections": {
        "n_rows": "INTEGER",
        "dataset_name": "TEXT",
        "synthetic": "INTEGER NOT NULL DEFAULT 0",
        "demo_run_id": "TEXT",
    },
    "experiments": {
        "config_json": "TEXT",
        "metrics_json": "TEXT",
        "demo_run_id": "TEXT",
    },
    "reports": {
        "title": "TEXT",
        "dataset_id": "TEXT",
        "dataset_name": "TEXT",
        "method": "TEXT",
        "generated_at": "TEXT",
        "config_json": "TEXT",
        "findings_json": "TEXT",
        "limitations_json": "TEXT",
        "content_path": "TEXT",
        "data_verified": "INTEGER NOT NULL DEFAULT 1",
        "demo_run_id": "TEXT",
    },
    "incidents": {
        "priority": "TEXT",
        "assigned_owner": "TEXT",
        "investigation_summary": "TEXT",
        "evidence_refs": "TEXT",
        "recommended_action": "TEXT",
        "escalated_at": "TEXT",
        "resolved_at": "TEXT",
        "resolution_summary": "TEXT",
        "updated_at": "TEXT",
        "demo_run_id": "TEXT",
    },
}

INDEX_STATEMENTS: List[str] = [
    "CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)",
    "CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)",
    "CREATE INDEX IF NOT EXISTS idx_activity_incident ON incident_activity(incident_id)",
    "CREATE INDEX IF NOT EXISTS idx_notes_incident ON investigation_notes(incident_id)",
    "CREATE INDEX IF NOT EXISTS idx_escalations_incident ON escalations(incident_id)",
    "CREATE INDEX IF NOT EXISTS idx_detection_results_det ON detection_results(detection_id)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
]

EXISTING_TABLES = ("datasets", "models", "detections", "incidents", "experiments", "reports")

MANAGED_TABLES = (
    "datasets", "models", "detections", "detection_results", "incidents",
    "escalations", "investigation_notes", "incident_activity", "experiments",
    "reports", "users", "sessions", "demo_runs",
)


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def count_rows(conn: sqlite3.Connection, table: str) -> int:
    if not table_exists(conn, table):
        return 0
    return int(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])


def column_names(conn: sqlite3.Connection, table: str) -> List[str]:
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def ensure_schema(db_path: Path | str) -> Dict[str, int]:
    """Create missing tables/columns/indexes; return row counts of legacy tables."""
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    before = {t: count_rows(conn, t) for t in EXISTING_TABLES}
    try:
        for statement in TABLE_STATEMENTS:
            conn.execute(statement)
        for table, columns in EXTRA_COLUMNS.items():
            present = set(column_names(conn, table))
            for column, ddl in columns.items():
                if column not in present:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
        for statement in INDEX_STATEMENTS:
            conn.execute(statement)
        conn.commit()
    finally:
        conn.close()
    return before
