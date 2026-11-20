from fastapi import APIRouter, HTTPException

from app.services import store
from app.services.ml_service import train_model
from app.schemas import TrainRequest

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
def list_models():
    return store.list_models()


@router.post("/train")
def train(req: TrainRequest):
    try:
        return train_model(req.dataset_id, req.method, req.threshold,
                           req.contamination, req.z_threshold)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/status")
def status():
    return {"models": store.list_models(), "count": len(store.list_models())}
