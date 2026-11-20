"""Pytest path setup for TraceLens.

Running the suite from the repository root makes both the FastAPI app and the
dependency-light ml-engine modules importable. ``ml-engine`` uses a hyphen in
its folder name, so its modules are exposed as top-level imports.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
ML_ENGINE = ROOT / "ml-engine"

for p in (str(BACKEND), str(ML_ENGINE)):
    if p not in sys.path:
        sys.path.insert(0, p)
