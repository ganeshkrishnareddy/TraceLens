"""Database-derived overview counters (no hardcoded values)."""
from __future__ import annotations

from fastapi import APIRouter

from app.services import store

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
def overview():
    return store.overall_stats()
