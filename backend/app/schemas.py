from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class DatasetGenerateRequest(BaseModel):
    n_normal: int = 1200
    n_anomaly: int = 240
    seed: int = 20261120


class TrainRequest(BaseModel):
    dataset_id: str
    method: str = "isolation_forest"
    threshold: float = 0.5
    contamination: float = 0.1
    z_threshold: float = 3.5


class DetectRequest(BaseModel):
    dataset_id: str
    model_id: str
    threshold: Optional[float] = None


class ExperimentRequest(BaseModel):
    train_dataset_id: str
    test_dataset_id: str
    methods: List[str] = ["isolation_forest", "statistical_mad"]
    thresholds: Dict[str, float] = {"isolation_forest": 0.5, "statistical_mad": 0.3}


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ReportRequest(BaseModel):
    detection_id: str
    kind: str = "investigation"
    incident_id: Optional[str] = None
    experiment_id: Optional[str] = None
    dataset_id: Optional[str] = None


# ---- 2.0 additions --------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class NoteRequest(BaseModel):
    note: str = Field(min_length=1)


class EscalateRequest(BaseModel):
    reason: str
    severity: Optional[str] = None
    priority: Optional[str] = None
    assigned_owner: Optional[str] = None
    investigation_summary: Optional[str] = None
    evidence_refs: List[str] = []
    recommended_action: Optional[str] = None


class ResolveRequest(BaseModel):
    summary: str = Field(min_length=1)


class DemoLoadRequest(BaseModel):
    scenario: str
    n_rows: int = 80
    seed: Optional[int] = None
