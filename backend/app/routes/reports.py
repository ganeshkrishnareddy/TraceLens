"""Report generation and real file downloads."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas import ReportRequest
from app.services import reporting, store

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def list_reports():
    return store.list_reports()


@router.post("")
def create_report(req: ReportRequest):
    try:
        out = reporting.create_report(
            detection_id=req.detection_id,
            kind=req.kind,
            incident_id=req.incident_id,
            experiment_id=req.experiment_id,
            dataset_id=req.dataset_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    # Legacy clients expect their original kind slug echoed back.
    if req.kind in reporting.ALIASES:
        out["kind"] = req.kind
    return out


@router.get("/{report_id}")
def get_report(report_id: str):
    report = store.get_report(report_id)
    if not report:
        raise HTTPException(404, "report not found")
    return report


@router.get("/{report_id}/content")
def content(report_id: str):
    try:
        return reporting.get_report_payload(report_id)
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.get("/{report_id}/download")
def download(report_id: str, format: str = "pdf"):
    try:
        content, media_type, filename = reporting.export_report(report_id, format)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except LookupError as e:
        raise HTTPException(404, str(e))
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
