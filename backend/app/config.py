import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # D:\PROVISION_TRACELENS
ML_ENGINE = ROOT / "ml-engine"
DATASETS_DIR = ROOT / "datasets"
MODELS_DIR = ROOT / "models"
EXPERIMENTS_DIR = ROOT / "experiments"
REPORTS_DIR = ROOT / "reports"
LOGS_DIR = ROOT / "logs"

for d in (DATASETS_DIR, MODELS_DIR, EXPERIMENTS_DIR, REPORTS_DIR, LOGS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# make ml-engine importable
import sys
if str(ML_ENGINE) not in sys.path:
    sys.path.insert(0, str(ML_ENGINE))

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {".csv"}
