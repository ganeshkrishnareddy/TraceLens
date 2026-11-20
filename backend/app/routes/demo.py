"""Demo scenario catalogue and resettable synthetic fixtures."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import DemoLoadRequest
from app.services import demo_service, store

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/scenarios")
def scenarios():
    return demo_service.list_scenarios()


@router.post("/load")
def load(req: DemoLoadRequest):
    try:
        return demo_service.load_scenario(req.scenario, req.n_rows, req.seed)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/runs")
def runs(active_only: bool = True):
    return store.list_demo_runs(active_only=active_only)


@router.post("/reset")
def reset():
    return demo_service.reset()
