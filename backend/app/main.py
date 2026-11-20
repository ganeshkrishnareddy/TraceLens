from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.store import init_db
from app.schemas import TrainRequest, DetectRequest
from app.routes import (
    health, datasets, models, detection, incidents, experiments, reports,
    auth, demo, stats,
)

init_db()

app = FastAPI(title="TraceLens API", version="2.0.0",
              description="Explainable Anomaly Intelligence — anomaly detection and incident investigation.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(datasets.router)
app.include_router(models.router)
app.include_router(detection.router)
app.include_router(incidents.router)
app.include_router(experiments.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(demo.router)
app.include_router(stats.router)


@app.post("/api/train", tags=["models"], summary="Train a detector (canonical alias)")
def train_alias(req: TrainRequest):
    """Alias for POST /api/models/train."""
    return models.train(req)


@app.post("/api/detect", tags=["detection"], summary="Run detection (canonical alias)")
def detect_alias(req: DetectRequest):
    """Alias for POST /api/detection/run."""
    return detection.run(req)


@app.get("/")
def root():
    return {"service": "TraceLens", "version": "2.0.0", "docs": "/docs", "health": "/api/health"}
