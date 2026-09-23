"""Case-specific report generation for NexusCorvus.

Turns the relational investigation data already persisted for a Case
into a portable document in one of three formats: JSON, Markdown or
PDF.

Only live database records are used. The module queries the same ORM
models and relationships the rest of the API relies on (see
``core.models``) and never fabricates or hardcodes content.
"""

import json
import re
from io import BytesIO
from xml.sax.saxutils import escape as _xml_escape

from django.http import HttpResponse
from django.utils import timezone

from .models import (
    Case,
    Detection,
    Event,
    EvidenceFile,
    Note,
)
from .serializers import CaseSerializer


# ============================================================
# Format registry
# ============================================================

FORMATS = {"json", "md", "markdown", "pdf"}

_CONTENT_TYPES = {
    "json": "application/json; charset=utf-8",
    "md": "text/markdown; charset=utf-8",
    "markdown": "text/markdown; charset=utf-8",
    "pdf": "application/pdf",
}

_FILE_EXTENSIONS = {
    "json": "json",
    "md": "md",
    "markdown": "md",
    "pdf": "pdf",
}

_MD_ESCAPE_RE = re.compile(r"([\\`*_{}\[\]<>#|])")


# ============================================================
# Data aggregation
# ============================================================

def _iso(value):
    if value is None:
        return None

    try:
        return value.isoformat()
    except Exception:
        return str(value)


def _username(related):
    """Resolve a logged authors' username from a user relationship."""
    if related is None:
        return None

    try:
        return related.username
    except Exception:
        return str(related.pk)


def _case_record(case):
    """Flat, nested-free representation of the Case itself."""
    data = CaseSerializer(case).data

    data["created_by"] = {
        "id": case.created_by_id,
        "username": _username(case.created_by),
    }

    return data


def _evidence_record(file):
    return {
        "id": file.id,
        "case_id": file.case_id,
        "file_name": file.file_name,
        "file_type": file.file_type,
        "file_path": file.file_path,
        "file_size": file.file_size,
        "uploaded_by": {
            "id": file.uploaded_by_id,
            "username": _username(file.uploaded_by),
        },
        "uploaded_at": _iso(file.uploaded_at),
    }


def _event_record(event):
    return {
        "id": event.id,
        "case_id": event.case_id,
        "file_name": event.file_name,
        "file_type": event.file_type,
        "file_path": event.file_path,
        "file_size": event.file_size,
        "created_at": _iso(event.created_at),
    }


def _detection_record(detection):
    return {
        "id": detection.id,
        "case_id": detection.case_id,
        "time": _iso(detection.time),
        "event_type": detection.event_type,
        "description": detection.description,
        "host": detection.host,
        "user": detection.user,
        "severity": detection.severity,
        "detection_rule": detection.detection_rule,
        "rule_id": detection.rule_id,
        "mitre_tactic": detection.mitre_tactic,
        "mitre_technique": detection.mitre_technique,
        "created_at": _iso(detection.created_at),
    }


def _note_record(note):
    return {
        "id": note.id,
        "case_id": note.case_id,
        "created_by": {
            "id": note.created_by_id,
            "username": _username(note.created_by),
        },
        "content": note.content,
        "created_at": _iso(note.created_at),
        "updated_at": _iso(note.updated_at),
    }


def build_case_report(case, generated_by=None):
    """Aggregate every investigation artifact belonging to ``case``."""
    evidence = list(
        case.evidencefile_set.order_by("uploaded_at")
    )
    events = list(
        case.event_set.order_by("created_at")
    )
    detections = list(
        case.detection_set.order_by("created_at")
    )
    notes = list(
        case.note_set.order_by("created_at")
    )

    return {
        "report_metadata": {
            "report_type": "case-investigation-report",
            "case_id": case.id,
            "generated_by": generated_by,
            "generated_at": timezone.now().isoformat(),
        },
        "case": _case_record(case),
        "investigation": {
            "status": case.status,
            "description": case.description,
            "created_at": _iso(case.created_at),
            "updated_at": _iso(case.updated_at),
            "counts": {
                "evidence_files": len(evidence),
                "events": len(events),
                "detections": len(detections),
                "notes": len(notes),
            },
        },
        "evidence": [_evidence_record(file) for file in evidence],
        "events": [_event_record(event) for event in events],
        "detections": [_detection_record(detection) for detection in detections],
        "notes": [_note_record(note) for note in notes],
    }


def _report_filename(case, report_format):
    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        str(case.case_name or "").lower(),
    ).strip("-")

    name = f"CASE-{str(case.id).zfill(3)}"

    if slug:
        name = f"{name}_{slug}"

    return f"{name}_report.{_FILE_EXTENSIONS[report_format]}"


# ============================================================
# Markdown rendering
# ============================================================

def _md_escape(value):
    if value is None:
        return ""

    return _MD_ESCAPE_RE.sub(r"\\\1", str(value))


def _md_table(headers, rows):
    """Render a GFM-style table, tolerant of variable row lengths."""
    if not rows:
        return ""

    lines = [
        "| " + " | ".join(str(header) for header in headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]

    for row in rows:
        cells = []

        for index in range(len(headers)):
            value = row[index] if index < len(row) else ""
            cells.append(_md_escape(value))

        lines.append("| " + " | ".join(cells) + " |")

    return "\n".join(lines)


def _render_markdown(data):
    case = data["case"]
    meta = data["report_metadata"]
    investigation = data["investigation"]
    counts = investigation["counts"]

    lines = []

    lines.append(f"# CASE-{str(case['id']).zfill(3)} — {_md_escape(case['case_name'])}")
    lines.append("")

    lines.append(f"- **Status**: {_md_escape(investigation['status'])}")
    lines.append(
        f"- **Created**: {_md_escape(investigation['created_at'])}"
    )
    lines.append(
        f"- **Last updated**: {_md_escape(investigation['updated_at'])}"
    )
    created_by = case.get("created_by") or {}
    lines.append(
        f"- **Created by**: {_md_escape(created_by.get('username') or created_by.get('id'))}"
    )
    lines.append("")

    lines.append("## Investigation Metadata")
    lines.append("")
    lines.append(
        _md_table(
            ["Evidence Files", "Events", "Detections", "Notes"],
            [[
                counts["evidence_files"],
                counts["events"],
                counts["detections"],
                counts["notes"],
            ]],
        )
    )
    lines.append("")

    lines.append("## Case Description")
    lines.append("")
    lines.append(_md_escape(investigation["description"] or "No description provided."))
    lines.append("")

    lines.append("## Evidence Files")
    lines.append("")
    lines.append(
        _md_table(
            ["File", "Type", "Path", "Size (bytes)", "Uploaded By", "Uploaded At"],
            [
                [
                    file["file_name"],
                    file["file_type"],
                    file["file_path"],
                    file["file_size"],
                    (file.get("uploaded_by") or {}).get("username") or "",
                    file["uploaded_at"],
                ]
                for file in data["evidence"]
            ],
        )
        or "_No evidence files are associated with this case._"
    )
    lines.append("")

    lines.append("## Events")
    lines.append("")
    lines.append(
        _md_table(
            ["File", "Type", "Path", "Size (bytes)", "Added At"],
            [
                [
                    event["file_name"],
                    event["file_type"],
                    event["file_path"],
                    event["file_size"],
                    event["created_at"],
                ]
                for event in data["events"]
            ],
        )
        or "_No events are associated with this case._"
    )
    lines.append("")

    lines.append("## Detections")
    lines.append("")
    lines.append(
        _md_table(
            [
                "Time",
                "Event Type",
                "Host",
                "User",
                "Severity",
                "Rule",
                "Rule ID",
                "MITRE Tactic",
                "MITRE Technique",
                "Description",
            ],
            [
                [
                    detection["time"],
                    detection["event_type"],
                    detection["host"],
                    detection["user"],
                    detection["severity"],
                    detection["detection_rule"],
                    detection["rule_id"],
                    detection["mitre_tactic"],
                    detection["mitre_technique"],
                    detection["description"],
                ]
                for detection in data["detections"]
            ],
        )
        or "_No detections are associated with this case._"
    )
    lines.append("")

    lines.append("## Investigation Notes")
    lines.append("")

    if not data["notes"]:
        lines.append("_No notes are associated with this case._")
        lines.append("")
    else:
        for note in data["notes"]:
            author = (note.get("created_by") or {})
            author_label = (
                author.get("username")
                or (f"user-{author.get('id')}" if author.get("id") else "unknown")
            )

            lines.append(
                f"### Note #{str(note['id']).zfill(2)} — {_md_escape(author_label)}"
            )
            lines.append("")
            lines.append(f"- Created: {_md_escape(note['created_at'])}")
            lines.append(f"- Updated: {_md_escape(note['updated_at'])}")
            lines.append("")

            for block in _md_escape(note["content"]).split("\n"):
                lines.append(f"> {block}")

            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        f"_Generated by {_md_escape(meta['generated_by']) or 'NexusCorvus'} "
        f"at {_md_escape(meta['generated_at'])}._"
    )

    return "\n".join(lines)


# ============================================================
# PDF rendering
# ============================================================

def _pdf_column_widths(headers, total=516):
    """Give the last column the leftover width so nothing overflows."""
    per_column = max(int(total / len(headers)), 30)

    return [per_column] * (len(headers) - 1) + [
        total - per_column * (len(headers) - 1)
    ]


def _render_pdf(data):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    case = data["case"]
    meta = data["report_metadata"]
    investigation = data["investigation"]
    counts = investigation["counts"]

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title=f"CASE-{str(case['id']).zfill(3)} {case['case_name']}",
        author="NexusCorvus",
    )

    title_style = ParagraphStyle(
        "Title",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#111827"),
    )
    heading_style = ParagraphStyle(
        "Heading",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#1f2937"),
    )
    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        spaceAfter=6,
        textColor=colors.HexColor("#374151"),
        allowWidows=1,
        allowOrphans=0,
    )
    cell_style = ParagraphStyle(
        "Cell",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#111827"),
    )
    cell_head_style = ParagraphStyle(
        "CellHead",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#111827"),
    )
    note_style = ParagraphStyle(
        "Note",
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        spaceBefore=4,
        spaceAfter=6,
        textColor=colors.HexColor("#374151"),
    )

    story = []

    story.append(
        Paragraph(
            _xml_escape(
                f"CASE-{str(case['id']).zfill(3)} / {case['case_name']}"
            ),
            title_style,
        )
    )

    story.append(Spacer(1, 8 * mm))

    story.append(
        Paragraph(
            _xml_escape(
                f"Status: {investigation['status']} &nbsp;|&nbsp; "
                f"Created: {investigation['created_at']} &nbsp;|&nbsp; "
                f"Updated: {investigation['updated_at']}"
            ),
            body_style,
        )
    )

    created_by = case.get("created_by") or {}
    story.append(
        Paragraph(
            _xml_escape(
                "Created by: "
                f"{created_by.get('username') or ''} "
                f"(user id {created_by.get('id')})"
            ),
            body_style,
        )
    )

    story.append(Paragraph("Investigation Metadata", heading_style))

    counts_headers = ["Evidence Files", "Events", "Detections", "Notes"]
    counts_table = Table(
        [[counts["evidence_files"], counts["events"], counts["detections"], counts["notes"]]],
        colWidths=[65 * mm] * 4,
    )
    counts_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(counts_table)

    story.append(
        Paragraph(
            "Case Description",
            heading_style,
        )
    )
    story.append(
        Paragraph(
            _xml_escape(
                investigation["description"] or "No description provided."
            ),
            body_style,
        )
    )

    def add_table(title, headers, rows):
        story.append(Paragraph(_xml_escape(title), heading_style))

        if not rows:
            story.append(
                Paragraph(
                    _xml_escape("None recorded for this case."),
                    note_style,
                )
            )
            return

        table_data = [[Paragraph(h, cell_head_style) for h in headers]]
        table_data += [
            [
                Paragraph(_xml_escape(str(value)), cell_style)
                for value in row
            ]
            for row in rows
        ]

        table = Table(
            table_data,
            colWidths=_pdf_column_widths(headers, total=178 * mm),
            repeatRows=1,
        )
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )

        story.append(table)

    add_table(
        "Evidence Files",
        ["File", "Type", "Path", "Size (bytes)", "Uploaded By", "Uploaded At"],
        [
            [
                file["file_name"],
                file["file_type"],
                file["file_path"],
                file["file_size"],
                (file.get("uploaded_by") or {}).get("username") or "",
                file["uploaded_at"],
            ]
            for file in data["evidence"]
        ],
    )

    add_table(
        "Events",
        ["File", "Type", "Path", "Size (bytes)", "Added At"],
        [
            [
                event["file_name"],
                event["file_type"],
                event["file_path"],
                event["file_size"],
                event["created_at"],
            ]
            for event in data["events"]
        ],
    )

    add_table(
        "Detections",
        [
            "Time",
            "Event Type",
            "Host",
            "User",
            "Severity",
            "Rule",
            "Rule ID",
            "Tactic",
            "Technique",
            "Description",
        ],
        [
            [
                detection["time"],
                detection["event_type"],
                detection["host"],
                detection["user"],
                detection["severity"],
                detection["detection_rule"],
                detection["rule_id"],
                detection["mitre_tactic"],
                detection["mitre_technique"],
                detection["description"],
            ]
            for detection in data["detections"]
        ],
    )

    story.append(Paragraph("Investigation Notes", heading_style))

    if not data["notes"]:
        story.append(
            Paragraph(
                _xml_escape("None recorded for this case."),
                note_style,
            )
        )
    else:
        for note in data["notes"]:
            author = note.get("created_by") or {}
            author_label = (
                author.get("username")
                or (f"user-{author.get('id')}" if author.get("id") else "unknown")
            )

            story.append(
                Paragraph(
                    _xml_escape(
                        f"Note #{str(note['id']).zfill(2)} - {author_label} "
                        f"(created {note['created_at']})"
                    ),
                    body_style,
                )
            )

            for block in str(note["content"]).split("\n"):
                story.append(
                    Paragraph(
                        _xml_escape(block),
                        note_style,
                    )
                )

    doc.build(story)

    return buffer.getvalue()


# ============================================================
# Response assembly
# ============================================================

def render_case_report(case, report_format, generated_by=None):
    """Render ``case`` into an HTTP download in the requested format.

    ``report_format`` must be one of ``FORMATS``. The resulting document
    contains data belonging only to ``case``.
    """
    report_format = report_format.lower()

    if report_format not in FORMATS:
        raise ValueError(
            f"Unsupported report format: {report_format}"
        )

    data = build_case_report(
        case,
        generated_by=generated_by,
    )

    if report_format in ("md", "markdown"):
        body = _render_markdown(data).encode("utf-8")
    elif report_format == "pdf":
        body = _render_pdf(data)
    else:  # json
        body = json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
            default=str,
        ).encode("utf-8")

    response = HttpResponse(
        body,
        content_type=_CONTENT_TYPES[report_format],
    )

    response["Content-Disposition"] = (
        f"attachment; filename=\"{_report_filename(case, report_format)}\""
    )

    return response