from fastapi import APIRouter, HTTPException

from app.services import store
from app.services.ml_service import run_detection, get_detection_results
from app.schemas import DetectRequest

router = APIRouter(prefix="/api/detection", tags=["detection"])


@router.post("/run")
def run(req: DetectRequest):
    try:
        return run_detection(req.dataset_id, req.model_id, req.threshold)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/results")
def list_results():
    return store.list_detections()


@router.get("/results/{detection_id}")
def get_result(detection_id: str):
    res = get_detection_results(detection_id)
    if not res:
        raise HTTPException(404, "detection not found")
    return res


@router.post("/evaluate")
def evaluate(req: DetectRequest):
    # re-run detection returns metrics
    try:
        return run_detection(req.dataset_id, req.model_id, req.threshold)
    except ValueError as e:
        raise HTTPException(400, str(e))
