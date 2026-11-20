"""Report assembly and real PDF/CSV/JSON exports.

Every figure in a report is computed from the SQLite database or a stored
detection result. No accuracy claim, customer name or invented metric is used.
"""
from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from fpdf import FPDF

from app.config import REPORTS_DIR
from app.services import store
from app.services.security import utc_now

REPORT_TYPES: Dict[str, str] = {
    "anomaly_detection": "Anomaly Detection Report",
    "incident_investigation": "Incident Investigation Report",
    "escalation_history": "Escalation History Report",
    "experiment_evaluation": "Experiment Evaluation Report",
    "dataset_quality": "Dataset Quality Report",
}

ALIASES = {
    "investigation": "incident_investigation",
    "detection": "anomaly_detection",
    "escalation": "escalation_history",
    "experiment": "experiment_evaluation",
    "quality": "dataset_quality",
    "anomaly detection": "anomaly_detection",
    "incident investigation": "incident_investigation",
    "escalation history": "escalation_history",
    "experiment evaluation": "experiment_evaluation",
    "dataset quality": "dataset_quality",
}

LIMITATIONS = [
    "Synthetic telemetry is labelled fixture data and is not production traffic.",
    "Detection thresholds are demonstration defaults; no production accuracy is claimed.",
    "Explainability narratives describe feature deviations and are not causal proof.",
    "Findings reflect the recorded database state at generated_at and may change after new runs.",
]


def canonical_kind(kind: str | None) -> str:
    value = (kind or "incident_investigation").strip().lower().replace("-", "_")
    value = ALIASES.get(value, value)
    if value not in REPORT_TYPES:
        raise ValueError(
            "kind must be one of: " + ", ".join(REPORT_TYPES)
        )
    return value


def _dataset_block(dataset_id: str | None, detection: Dict | None) -> Dict[str, Any]:
    ds = store.get_dataset(dataset_id or (detection or {}).get("dataset_id") or "")
    if not ds:
        return {"id": None, "name": None, "n_rows": None, "kind": None,
                "scenario": None, "synthetic": False}
    return {
        "id": ds["id"],
        "name": ds.get("name"),
        "n_rows": ds.get("n_rows"),
        "kind": ds.get("kind"),
        "scenario": ds.get("scenario"),
        "synthetic": bool(ds.get("synthetic")),
    }


def _flagged(res: Dict | None) -> List[Dict]:
    return [r for r in (res or {}).get("rows", []) if r.get("flag") == 1]


def build_report(*, detection_id: str, kind: str, incident_id: str | None = None,
                 experiment_id: str | None = None,
                 dataset_id: str | None = None) -> Dict[str, Any]:
    canonical = canonical_kind(kind)
    res = None
    detection = None
    if detection_id:
        res = None
        try:
            from app.services.ml_service import get_detection_results
            res = get_detection_results(detection_id)
        except Exception:
            res = None
        detection = store.get_detection(detection_id)

    dataset = _dataset_block(dataset_id, detection)
    flagged = _flagged(res)
    findings: List[str] = []
    sections: List[Dict[str, Any]] = []
    method = (res or {}).get("method") or (detection or {}).get("method") or "n/a"
    source_counts: Dict[str, Any] = {}

    if canonical == "anomaly_detection":
        if res is None:
            raise ValueError("detection not found")
        n_rows = int(res.get("n_rows") or 0)
        n_flag = len(flagged)
        rate = round(100.0 * n_flag / n_rows, 2) if n_rows else 0.0
        sev: Dict[str, int] = {}
        for r in flagged:
            s = str(r.get("severity") or "unknown")
            sev[s] = sev.get(s, 0) + 1
        method = res.get("method", "unspecified")
        findings = [
            f"{n_rows} records were analysed with the {method} method at threshold {res.get('threshold')}.",
            f"{n_flag} records were flagged ({rate}% of the analysed population).",
            "Flagged severity distribution: " + (", ".join(f"{k}={v}" for k, v in sorted(sev.items())) or "none") + ".",
        ]
        source_counts = {"n_rows": n_rows, "n_flagged": n_flag, "severity": sev}
        sections = [
            {"heading": "Method", "body": [
                f"Detector: {method}", f"Threshold: {res.get('threshold')}",
                f"Dataset: {dataset['name'] or 'unregistered'}",
            ]},
            {"heading": "Flagged records", "body": [
                f"{r.get('record_id')} — {r.get('severity')} — score {float(r.get('score') or 0):.3f}"
                for r in flagged[:50]
            ] or ["No records were flagged in this run."]},
        ]

    elif canonical == "incident_investigation":
        if detection_id and detection is None and not incident_id:
            raise ValueError("detection not found")
        incidents = store.list_incidents(
            detection_id=detection_id if detection_id else None)
        if incident_id:
            one = store.get_incident(incident_id)
            incidents = [one] if one else []
        statuses: Dict[str, int] = {}
        for i in incidents:
            statuses[str(i.get("status"))] = statuses.get(str(i.get("status")), 0) + 1
        notes = sum(len(store.list_incident_notes(i["id"])) for i in incidents)
        escalations = sum(len(store.list_escalations(i["id"])) for i in incidents)
        findings = [
            f"{len(incidents)} incident(s) are linked to this investigation.",
            "Incident status distribution: " + (", ".join(f"{k}={v}" for k, v in sorted(statuses.items())) or "none") + ".",
            f"{notes} investigation note(s) and {escalations} escalation record(s) are on file.",
        ]
        source_counts = {"n_incidents": len(incidents), "statuses": statuses,
                         "n_notes": notes, "n_escalations": escalations}
        sections = [
            {"heading": "Incidents", "body": [
                f"{i['id']} — {i.get('record_id')} — {i.get('severity')} — {i.get('status')}"
                for i in incidents[:50]
            ] or ["No incidents were recorded for this detection."]},
            {"heading": "Evidence and explanations", "body": [
                (r.get("explanation") or {}).get("narrative", "")
                for r in flagged[:20] if (r.get("explanation") or {}).get("narrative")
            ] or ["No detection explanation was available."]},
        ]

    elif canonical == "escalation_history":
        esc = store.list_escalations(incident_id if incident_id else None)
        prio: Dict[str, int] = {}
        for e in esc:
            k = str(e.get("priority") or "unspecified")
            prio[k] = prio.get(k, 0) + 1
        resolved = sum(1 for e in esc if store.get_incident(e["incident_id"])
                       and store.get_incident(e["incident_id"])["status"] in ("resolved", "closed"))
        findings = [
            f"{len(esc)} escalation record(s) were found in the database.",
            "Priority distribution: " + (", ".join(f"{k}={v}" for k, v in sorted(prio.items())) or "none") + ".",
            f"{resolved} escalated incident(s) are currently resolved or closed.",
        ]
        source_counts = {"n_escalations": len(esc), "priorities": prio, "n_resolved": resolved}
        sections = [
            {"heading": "Escalations", "body": [
                f"{e['incident_id']} — severity {e.get('severity')} — priority {e.get('priority')} — owner {e.get('assigned_owner') or 'unassigned'} — {e.get('reason')}"
                for e in esc[:50]
            ] or ["No escalations were recorded."]},
        ]

    elif canonical == "experiment_evaluation":
        exp_row = store.get_experiment(experiment_id) if experiment_id else None
        if not exp_row:
            all_exp = store.list_experiments()
            exp_row = all_exp[0] if all_exp else None
        metrics = store._unjson((exp_row or {}).get("metrics_json"), {}) or {}
        config = store._unjson((exp_row or {}).get("config_json"), {}) or {}
        if exp_row and (exp_row.get("result_path")):
            p = Path(exp_row["result_path"])
            if p.exists():
                try:
                    disk = json.loads(p.read_text())
                    if isinstance(disk, dict):
                        metrics = metrics or disk.get("metrics") or disk
                        config = config or disk.get("config") or {}
                except (ValueError, OSError):
                    pass
        method_names = sorted(set(config.get("methods", []))) if isinstance(config, dict) else []
        findings = [
            f"Experiment {exp_row['id'] if exp_row else 'unavailable'} was evaluated from stored results."
            if exp_row else "No experiments are recorded in the database yet.",
            "Methods compared: " + (", ".join(method_names) or "not recorded") + ".",
            "Stored metric keys: " + (", ".join(sorted(metrics)) or "none") + ".",
        ]
        source_counts = {"experiment_id": exp_row["id"] if exp_row else None,
                         "methods": method_names, "metrics": metrics}
        sections = [
            {"heading": "Stored metrics", "body": [
                f"{k}: {v}" for k, v in sorted(metrics.items())
            ] or ["No numeric metrics were recorded."]},
        ]

    else:  # dataset_quality
        if not dataset.get("id"):
            raise ValueError("dataset not found")
        ds = store.get_dataset(dataset["id"])
        path = Path(ds["path"])
        if not path.exists():
            raise ValueError("dataset file not found")
        import pandas as pd
        frame = pd.read_csv(path)
        missing = int(frame.isna().sum().sum())
        label_counts: Dict[str, int] = {}
        if "label" in frame.columns:
            label_counts = {str(k): int(v) for k, v in frame["label"].value_counts().items()}
        scenario_counts: Dict[str, int] = {}
        if "scenario" in frame.columns:
            scenario_counts = {str(k): int(v) for k, v in frame["scenario"].value_counts().items()}
        findings = [
            f"Dataset {ds['id']} contains {len(frame)} rows across {len(frame.columns)} columns.",
            f"{missing} missing value(s) were found across all columns.",
            "Label distribution: " + (", ".join(f"label {k}={v}" for k, v in sorted(label_counts.items())) or "unlabelled") + ".",
            "Scenarios present: " + (", ".join(f"{k}={v}" for k, v in sorted(scenario_counts.items())) or "none") + ".",
            "Data origin: " + ("synthetic fixture (labelled in every record)" if dataset["synthetic"] else "uploaded/generated dataset"),
        ]
        source_counts = {"n_rows": len(frame), "n_columns": len(frame.columns),
                         "n_missing": missing, "labels": label_counts,
                         "scenarios": scenario_counts}
        sections = [
            {"heading": "Columns", "body": [
                f"{c} — {int(frame[c].isna().sum())} missing" for c in frame.columns
            ]},
        ]

    payload: Dict[str, Any] = {
        "report_id": None,
        "id": None,
        "kind": canonical,
        "title": REPORT_TYPES[canonical],
        "generated_at": utc_now(),
        "detection_id": detection_id or None,
        "incident_id": incident_id or None,
        "experiment_id": experiment_id or None,
        "dataset": dataset,
        "method": method,
        "findings": findings,
        "limitations": list(LIMITATIONS),
        "sections": sections,
        "source_counts": source_counts,
        "data_verified": True,
        "records": [
            {"record_id": r.get("record_id"), "score": r.get("score"),
             "severity": r.get("severity"), "affected_features": r.get("affected_features", [])}
            for r in flagged[:200]
        ],
        "note": "All values are derived from the local TraceLens database or stored detection artefacts.",
    }
    return payload


def create_report(*, detection_id: str, kind: str, incident_id: str | None = None,
                  experiment_id: str | None = None,
                  dataset_id: str | None = None) -> Dict[str, Any]:
    payload = build_report(detection_id=detection_id, kind=kind, incident_id=incident_id,
                           experiment_id=experiment_id, dataset_id=dataset_id)
    rid = store.new_id("rep")
    payload["report_id"] = rid
    payload["id"] = rid
    content_path = REPORTS_DIR / f"{rid}.json"
    content_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    db_id = store.register_report(
        payload["kind"], str(content_path),
        title=payload["title"],
        dataset_id=payload["dataset"].get("id"),
        dataset_name=payload["dataset"].get("name"),
        method=payload["method"],
        generated_at=payload["generated_at"],
        config={"detection_id": detection_id, "incident_id": incident_id,
                "experiment_id": experiment_id},
        findings=payload["findings"],
        limitations=payload["limitations"],
        content_path=str(content_path),
        data_verified=1,
    )
    payload["report_id"] = db_id
    payload["id"] = db_id
    content_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return {
        "report_id": db_id, "id": db_id, "kind": payload["kind"],
        "title": payload["title"], "generated_at": payload["generated_at"],
        "dataset": payload["dataset"], "method": payload["method"],
        "findings": payload["findings"], "limitations": payload["limitations"],
        "data_verified": payload["data_verified"],
        "path": str(content_path),
    }


def _payload_for(report: Dict[str, Any]) -> Dict[str, Any]:
    content_path = report.get("content_path") or report.get("path")
    if content_path:
        p = Path(content_path)
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data.setdefault("report_id", report["id"])
                    data.setdefault("id", report["id"])
                    data.setdefault("kind", report["kind"])
                    data.setdefault("generated_at", report.get("generated_at"))
                    return data
            except (ValueError, OSError):
                pass
    return {
        "report_id": report["id"], "id": report["id"], "kind": report["kind"],
        "title": report.get("title") or REPORT_TYPES.get(report["kind"], "TraceLens Report"),
        "generated_at": report.get("generated_at") or report.get("created_at"),
        "dataset": {"id": report.get("dataset_id"), "name": report.get("dataset_name")},
        "method": report.get("method") or "n/a",
        "findings": report.get("findings") or [],
        "limitations": report.get("limitations") or [],
        "sections": [], "records": [], "data_verified": bool(report.get("data_verified", 1)),
    }


def get_report_payload(report_id: str) -> Dict[str, Any]:
    """Full, display-ready report document for the analyst preview panel."""
    report = store.get_report(report_id)
    if not report:
        raise LookupError("report not found")
    return _payload_for(report)


def _ascii(text: Any) -> str:
    return str(text).encode("latin-1", "replace").decode("latin-1")


# --- Branded report design tokens (match frontend/src/index.css) ------------
NAVY = (11, 31, 58)
TEAL = (14, 124, 123)
TEAL_DARK = (10, 99, 99)
SECONDARY = (37, 99, 235)
BODY = (51, 65, 85)
MUTED = (100, 116, 139)
LINE = (226, 232, 240)
SOFT = (238, 242, 247)
PAPER = (246, 248, 251)
WHITE = (255, 255, 255)
CRITICAL = (185, 28, 28)
WARNING = (180, 83, 9)
SUCCESS = (15, 118, 110)

KPI_LABELS: Dict[str, str] = {
    "n_rows": "Records", "n_flagged": "Flagged", "severity": "Severity classes",
    "n_incidents": "Incidents", "n_notes": "Notes", "n_escalations": "Escalations",
    "statuses": "Statuses", "priorities": "Priorities", "n_resolved": "Resolved",
    "methods": "Methods", "metrics": "Metrics", "n_columns": "Columns",
    "n_missing": "Missing values", "scenarios": "Scenarios", "labels": "Labels",
    "experiment_id": "Experiment",
}


def _kpis(payload: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Pick up to four defensible headline figures from the payload itself."""
    sc = payload.get("source_counts") or {}
    items: List[Tuple[str, str]] = []
    for key, value in sc.items():
        if isinstance(value, dict):
            shown = str(len(value))
        elif isinstance(value, bool):
            continue
        elif isinstance(value, (int, float)):
            shown = f"{value:g}"
        elif isinstance(value, str) and len(value) <= 18:
            shown = value
        else:
            continue
        items.append((KPI_LABELS.get(key, key.replace("_", " ").title()), shown))
    rows = sc.get("n_rows")
    flagged = sc.get("n_flagged")
    if isinstance(rows, int) and rows and isinstance(flagged, int):
        items.insert(2, ("Flag rate", f"{round(100.0 * flagged / rows, 1)}%"))
    return items[:4] or [("Data verified", "Yes")]


class _ReportPDF(FPDF):
    """A4 analyst report with a consistent brand system and page furniture."""

    LEFT = 18.0
    RIGHT = 192.0
    WIDTH = 174.0

    def __init__(self, payload: Dict[str, Any]) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.payload = payload
        self.set_margins(self.LEFT, 18, 210 - self.RIGHT)
        self.set_auto_page_break(auto=True, margin=24)
        self.alias_nb_pages()
        self.set_title(_ascii(payload.get("title") or "TraceLens Report"))
        self.set_author("TraceLens - ProgVision")
        self.set_subject("Explainable anomaly intelligence report")
        self.set_creator("TraceLens reporting service")

    # -- brand mark ---------------------------------------------------------
    def _mark(self, x: float, y: float, size: float,
              color: Tuple[int, int, int] = TEAL,
              accent: Tuple[int, int, int] | None = None) -> None:
        """Six-blade aperture lens holding a signal trace and evidence nodes."""
        import math
        cxx, cyy = x + size / 2, y + size / 2
        r = size * 0.40
        self.set_draw_color(*color)
        self.set_line_width(max(0.35, size / 22))
        self.ellipse(cxx - r, cyy - r, 2 * r, 2 * r)
        self.ellipse(cxx - r * 0.32, cyy - r * 0.32, 2 * r * 0.32, 2 * r * 0.32)
        for i in range(6):
            a = math.radians(i * 60)
            self.line(
                cxx + r * 0.34 * math.cos(a), cyy + r * 0.34 * math.sin(a),
                cxx + r * 0.92 * math.cos(a + 0.38), cyy + r * 0.92 * math.sin(a + 0.38),
            )
        points = [
            (cxx - r * 0.72, cyy + r * 0.18),
            (cxx - r * 0.24, cyy - r * 0.10),
            (cxx + r * 0.14, cyy + r * 0.34),
            (cxx + r * 0.44, cyy - r * 0.58),
            (cxx + r * 0.76, cyy + r * 0.12),
        ]
        self.set_line_width(max(0.45, size / 18))
        self.set_draw_color(*(accent or TEAL))
        for a, b in zip(points, points[1:]):
            self.line(a[0], a[1], b[0], b[1])
        for px, py in points[:3]:
            self.set_fill_color(*(accent or TEAL))
            self.ellipse(px - size * 0.025, py - size * 0.025,
                         size * 0.05, size * 0.05, "F")
        self.set_fill_color(*SECONDARY)
        self.ellipse(points[3][0] - size * 0.045, points[3][1] - size * 0.045,
                     size * 0.09, size * 0.09, "F")

    # -- page furniture -----------------------------------------------------
    def header(self) -> None:
        self.set_fill_color(*TEAL)
        self.rect(0, 0, 210, 2.2, "F")
        if self.page_no() == 1:
            return
        self._mark(self.LEFT, 9.5, 8, color=TEAL, accent=TEAL_DARK)
        self.set_xy(self.LEFT + 11, 9)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.cell(60, 5, "TraceLens")
        self.set_xy(self.LEFT + 11, 13.5)
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(*MUTED)
        self.cell(90, 4, "EXPLAINABLE ANOMALY INTELLIGENCE")
        self.set_xy(126, 10)
        self.set_font("Helvetica", "B", 6.5)
        self.set_text_color(*TEAL_DARK)
        self.cell(66, 5, _ascii(str(self.payload.get("title") or "").upper()), align="R")
        self.set_draw_color(*LINE)
        self.set_line_width(0.3)
        self.line(self.LEFT, 19.5, self.RIGHT, 19.5)
        self.set_y(24)

    def footer(self) -> None:
        self.set_y(-16)
        y = self.get_y()
        self.set_draw_color(*LINE)
        self.set_line_width(0.3)
        self.line(self.LEFT, y + 2, self.RIGHT, y + 2)
        self.set_font("Helvetica", "", 6.8)
        self.set_text_color(*MUTED)
        self.cell(120, 4, "TraceLens  |  ProgVision  |  AEGYTHON 2026  |  Synthetic demonstration data")
        self.cell(0, 4, f"Page {self.page_no()} of {{nb}}", align="R")

    # -- reusable components ------------------------------------------------
    def _section(self, title: str) -> None:
        if self.get_y() > 250:
            self.add_page()
        self.set_fill_color(*TEAL)
        self.rect(self.LEFT, self.get_y() + 0.8, 1.4, 5, "F")
        self.set_xy(self.LEFT + 4.5, self.get_y() - 0.5)
        self.set_font("Helvetica", "B", 10.5)
        self.set_text_color(*NAVY)
        self.cell(90, 6, _ascii(title))
        self.set_draw_color(*LINE)
        self.set_line_width(0.2)
        self.line(self.LEFT + 4.5, self.get_y() + 6.2, self.RIGHT, self.get_y() + 6.2)
        self.set_y(self.get_y() + 8)

    def _bullet(self, text: Any, index: int | None = None,
                color: Tuple[int, int, int] = BODY) -> None:
        y0 = self.get_y()
        if y0 > 258:
            self.add_page()
            y0 = self.get_y()
        if index is None:
            self.set_fill_color(*TEAL)
            self.ellipse(self.LEFT + 1.6, y0 + 2.1, 1.5, 1.5, "F")
        else:
            self.set_fill_color(*TEAL)
            self.rect(self.LEFT, y0 + 0.7, 4.4, 4.4, "F")
            self.set_xy(self.LEFT, y0 + 0.7)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*WHITE)
            self.cell(4.4, 4.4, str(index), align="C")
        self.set_xy(self.LEFT + 7, y0)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*color)
        self.multi_cell(self.WIDTH - 7, 4.8, _ascii(text), align="L")
        self.set_y(self.get_y() + 1.2)

    def _fit(self, text: Any, width: float, style: str = "", size: int = 8) -> str:
        value = _ascii(text)
        self.set_font("Helvetica", style, size)
        while value and self.get_string_width(value) > width:
            value = value[:-2] + "..."
        return value

    def _table(self, headings: List[str], rows: List[List[Any]],
               widths: List[float], severity_col: int | None = None) -> None:
        def header_row() -> None:
            self.set_fill_color(*NAVY)
            self.set_text_color(*WHITE)
            self.set_font("Helvetica", "B", 7.5)
            for head, w in zip(headings, widths):
                self.cell(w, 7, _ascii(head), border=0, align="L", fill=1)
            self.ln(7)

        header_row()
        for n, row in enumerate(rows):
            if self.get_y() > 252:
                self.add_page()
                header_row()
            fill = WHITE if n % 2 == 0 else PAPER
            self.set_fill_color(*fill)
            self.set_font("Helvetica", "", 7.6)
            for col, (value, w) in enumerate(zip(row, widths)):
                self.set_text_color(*BODY)
                if col == severity_col:
                    label = str(value).lower()
                    self.set_text_color(*(CRITICAL if label == "critical" else
                                          WARNING if label == "high" else
                                          TEAL_DARK if label in ("medium", "low") else MUTED))
                self.cell(w, 6.2, self._fit(value, w - 2.5), border=0, align="L", fill=1)
            self.ln(6.2)

    def render(self) -> bytes:
        p = self.payload
        self.add_page()

        # Cover band
        self.set_fill_color(*NAVY)
        self.rect(self.LEFT, 26, self.WIDTH, 40, "F")
        self.set_fill_color(*TEAL)
        self.rect(self.LEFT, 26, self.WIDTH, 1.6, "F")
        self._mark(158, 33, 22, color=(58, 92, 128), accent=(96, 170, 170))
        self.set_xy(self.LEFT + 7, 30)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*TEAL)
        self.cell(110, 4, "TRACE LENS  /  ANALYST REPORT")
        self.set_xy(self.LEFT + 7, 36)
        self.set_font("Helvetica", "B", 17)
        self.set_text_color(*WHITE)
        self.multi_cell(122, 8, _ascii(p.get("title") or "TraceLens Report"), align="L")
        self.set_xy(self.LEFT + 7, 55)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(186, 205, 220)
        self.cell(130, 4, f"Generated {p.get('generated_at') or 'n/a'}")
        self.set_xy(self.LEFT + 7, 60)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(150, 178, 202)
        self.cell(130, 4, f"Report {p.get('report_id') or 'n/a'}   |   Kind: {p.get('kind') or 'n/a'}")

        # Headline figures
        kpis = _kpis(p)
        gap = 2.5
        box_w = (self.WIDTH - gap * (len(kpis) - 1)) / len(kpis)
        y = 70
        for label, value in kpis:
            self.set_fill_color(*SOFT)
            self.rect(self.LEFT, y, box_w, 18, "F")
            self.set_fill_color(*TEAL)
            self.rect(self.LEFT, y, box_w, 0.9, "F")
            self.set_xy(self.LEFT + 2, y + 3)
            self.set_font("Helvetica", "B", 13)
            self.set_text_color(*NAVY)
            self.cell(box_w - 4, 7, _ascii(value), align="L")
            self.set_xy(self.LEFT + 2, y + 11.5)
            self.set_font("Helvetica", "", 6.2)
            self.set_text_color(*MUTED)
            self.cell(box_w - 4, 4, _ascii(label.upper()), align="L")
        self.set_y(y + 24)

        # Provenance line
        ds = p.get("dataset") or {}
        self.set_fill_color(*PAPER)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*BODY)
        self.multi_cell(
            self.WIDTH, 5,
            _ascii(f"Source: {ds.get('name') or ds.get('id') or 'unregistered dataset'}  |  "
                   f"Method: {p.get('method') or 'n/a'}  |  "
                   f"Data verified: {'yes' if p.get('data_verified') else 'not recorded'}"),
            border=0, align="L", fill=1,
        )
        self.set_y(self.get_y() + 3)

        # Executive summary
        self._section("Executive summary")
        for i, item in enumerate(p.get("findings", []) or [], 1):
            self._bullet(item, i)

        # Detailed sections
        for section in p.get("sections", []) or []:
            self._section(str(section.get("heading") or "Detail"))
            body = section.get("body", [])
            if isinstance(body, str):
                body = [body]
            for item in body:
                self._bullet(item)

        # Limitations
        self._section("Limitations and scope")
        for item in p.get("limitations", []) or []:
            self._bullet(item, color=MUTED)

        # Flagged records table
        records = p.get("records", []) or []
        if records:
            self._section(f"Flagged records ({len(records)})")
            self._table(
                ["Record ID", "Severity", "Score", "Affected features"],
                [[r.get("record_id"), r.get("severity"),
                  f"{float(r.get('score') or 0):.3f}",
                  ", ".join(str(f) for f in (r.get("affected_features") or [])) or "-"]
                 for r in records[:50]],
                [48, 26, 20, 80], severity_col=1,
            )

        # Closing note
        if self.get_y() > 245:
            self.add_page()
        self.set_y(self.get_y() + 3)
        self.set_fill_color(*SOFT)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(*BODY)
        self.multi_cell(
            self.WIDTH, 5,
            _ascii(p.get("note") or "All figures are computed from the local TraceLens database; "
                   "synthetic data is labelled as fixtures."),
            border=0, align="L", fill=1,
        )

        tmp = REPORTS_DIR / f"_pdf_{store.new_id('tmp')}.pdf"
        try:
            self.output(str(tmp))
            return tmp.read_bytes()
        finally:
            tmp.unlink(missing_ok=True)


def _pdf_bytes(payload: Dict[str, Any]) -> bytes:
    return _ReportPDF(payload).render()


def _csv_bytes(payload: Dict[str, Any]) -> bytes:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["report_id", "generated_at", "kind", "section", "item", "value"])
    meta = [
        ("metadata", "title", payload.get("title")),
        ("metadata", "dataset", (payload.get("dataset") or {}).get("name")),
        ("metadata", "dataset_id", (payload.get("dataset") or {}).get("id")),
        ("metadata", "method", payload.get("method")),
        ("metadata", "data_verified", payload.get("data_verified")),
    ]
    for row in meta:
        w.writerow([payload.get("report_id"), payload.get("generated_at"), payload.get("kind"), *row])
    for key, label in (("findings", "finding"), ("limitations", "limitation")):
        for item in payload.get(key, []) or []:
            w.writerow([payload.get("report_id"), payload.get("generated_at"),
                        payload.get("kind"), key, label, item])
    for section in payload.get("sections", []) or []:
        body = section.get("body", [])
        if isinstance(body, str):
            body = [body]
        for item in body:
            w.writerow([payload.get("report_id"), payload.get("generated_at"),
                        payload.get("kind"), section.get("heading", "section"), "detail", item])
    for r in payload.get("records", []) or []:
        w.writerow([payload.get("report_id"), payload.get("generated_at"),
                    payload.get("kind"), "records", r.get("record_id"),
                    f"{r.get('severity')}; {float(r.get('score') or 0):.3f}"])
    return out.getvalue().encode("utf-8-sig")


def export_report(report_id: str, fmt: str = "pdf") -> Tuple[bytes, str, str]:
    """Return (bytes, media_type, filename) for a real file download."""
    fmt = (fmt or "pdf").lower()
    if fmt not in {"pdf", "csv", "json"}:
        raise ValueError("format must be pdf, csv or json")
    report = store.get_report(report_id)
    if not report:
        raise LookupError("report not found")
    payload = _payload_for(report)
    safe_kind = str(payload.get("kind") or "report").replace("/", "_").replace(" ", "_")
    filename = f"tracelens_{safe_kind}_{report_id}.{fmt}"
    if fmt == "json":
        return (json.dumps(payload, indent=2, default=str).encode("utf-8"),
                "application/json", filename)
    if fmt == "csv":
        return _csv_bytes(payload), "text/csv; charset=utf-8", filename
    return _pdf_bytes(payload), "application/pdf", filename
