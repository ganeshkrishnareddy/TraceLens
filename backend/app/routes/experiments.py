from fastapi import APIRouter, HTTPException

from app.services import store
from app.services.ml_service import run_experiment_api
from app.schemas import ExperimentRequest

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("/run")
def run(req: ExperimentRequest):
    try:
        return run_experiment_api(req.train_dataset_id, req.test_dataset_id,
                                 req.methods, req.thresholds)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("")
def list_experiments():
    return store.list_experiments()
