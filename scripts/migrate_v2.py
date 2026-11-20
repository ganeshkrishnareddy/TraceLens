"""Non-destructive TraceLens 1.x -> 2.0 SQLite migration.

Usage (from anywhere):
    python D:\\PROVISION_TRACELENS\\scripts\\migrate_v2.py
    python D:\\PROVISION_TRACELENS\\scripts\\migrate_v2.py --db D:\\path\\to\\tracelens.db

The script only creates missing tables, adds missing columns and indexes, and
seeds the documented demo account. It never deletes, resets or rewrites rows.
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.services.schema import (  # noqa: E402
    EXISTING_TABLES, MANAGED_TABLES, count_rows, ensure_schema, table_exists,
)
from app.services.store import DB_PATH, DEMO_EMAIL, DEMO_PASSWORD  # noqa: E402


def snapshot(path: Path) -> dict:
    conn = sqlite3.connect(str(path))
    counts = {t: count_rows(conn, t) for t in MANAGED_TABLES}
    conn.close()
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="TraceLens 2.0 additive SQLite migration")
    parser.add_argument("--db", default=str(DB_PATH), help="path to tracelens.db")
    args = parser.parse_args()
    db = Path(args.db)

    before = ensure_schema(db)  # returns counts of the six legacy tables, pre-change

    # Import seeding lives in store.init_db; call it after the schema exists.
    from app.services.store import init_db
    original = Path(DB_PATH)
    if db.resolve() == original.resolve():
        init_db()

    conn = sqlite3.connect(str(db))
    missing = [t for t in MANAGED_TABLES if not table_exists(conn, t)]
    after_legacy = {t: count_rows(conn, t) for t in EXISTING_TABLES}
    conn.close()

    print(f"Database: {db}")
    print(f"Legacy tables before: {before}")
    print(f"Legacy tables after:  {after_legacy}")
    print("Managed tables present: " + ", ".join(t for t in MANAGED_TABLES if t not in missing))
    if missing:
        print("MISSING TABLES: " + ", ".join(missing))
        return 1

    lost = [t for t in EXISTING_TABLES if after_legacy[t] < before[t]]
    if lost:
        print("DATA LOSS DETECTED in: " + ", ".join(lost))
        return 1

    print("Preservation check: PASS (no legacy row counts decreased)")
    print(f"Demo account: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print("Migration complete. No data was reset or deleted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
