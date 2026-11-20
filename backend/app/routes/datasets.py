from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path

from app.config import DATASETS_DIR, MAX_UPLOAD_BYTES
from app.services import store
from app.services.ml_service import preview_dataset, generate_synthetic
from app.schemas import DatasetGenerateRequest

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("")
def list_datasets():
    return store.list_datasets()


@router.post("/generate")
def generate(req: DatasetGenerateRequest):
    return generate_synthetic(req.n_normal, req.n_anomaly, req.seed)


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed.")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 25 MB).")
    # safe filename
    safe = Path(file.filename).name
    dest = DATASETS_DIR / "raw" / safe
    dest.parent.mkdir(parents=True, exist_ok=True)
    # avoid overwrite collision
    if dest.exists():
        stem = dest.stem
        dest = DATASETS_DIR / "raw" / f"{stem}_{store.new_id('f')}.csv"
    dest.write_bytes(data)
    # validate
    import pandas as pd
    try:
        df = pd.read_csv(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Invalid CSV: {e}")
    from features import validate_columns
    # validate only if feature columns present; allow any csv but check
    did = store.register_dataset(dest.name, dest, len(df), "uploaded")
    return {"dataset_id": did, "name": dest.name, "n_rows": len(df)}


@router.get("/{dataset_id}/preview")
def preview(dataset_id: str, limit: int = 50):
    ds = store.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(404, "dataset not found")
    return preview_dataset(ds["path"], limit)


@router.get("/{dataset_id}")
def get_dataset(dataset_id: str):
    ds = store.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(404, "dataset not found")
    return ds
