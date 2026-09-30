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
from sigma_app.models import SigmaDetectionResult


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
        "sha256": file.sha256 or None,
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


def _sigma_result_record(result):
    """A persisted Sigma run: wrapper metadata plus the verbatim run data.

    ``run_data`` is exactly what :class:`sigma_app.services.sigma_runner.SigmaRunner`
    produced (scan summary and the actual matched rules/events), so the report
    exposes real detection results rather than only database metadata.
    """
    run = dict(result.run_data or {})

    return {
        "id": result.id,
        "case_id": result.case_id,
        "evidence_file_id": result.evidence_file_id,
        "created_by": {
            "id": result.created_by_id,
            "username": _username(result.created_by),
        },
        "created_at": _iso(result.created_at),
        "run_data": run,
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
    sigma_results = list(
        SigmaDetectionResult.objects.filter(
            case=case
        ).select_related("created_by").order_by("-created_at")
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
                "sigma_results": len(sigma_results),
            },
        },
        "evidence": [_evidence_record(file) for file in evidence],
        "events": [_event_record(event) for event in events],
        "detections": [_detection_record(detection) for detection in detections],
        "notes": [_note_record(note) for note in notes],
        "sigma_results": [
            _sigma_result_record(result) for result in sigma_results
        ],
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


def _md_evidence_blocks(evidence):
    """Per-file evidence blocks with metadata and the SHA-256 integrity hash.

    A dedicated block (instead of a wide table) keeps the long SHA-256 values
    and the related metadata together and readable.
    """
    blocks = []

    for file in evidence:
        uploaded_by = file.get("uploaded_by") or {}
        author = uploaded_by.get("username") or uploaded_by.get("id") or "unknown"
        sha256 = file.get("sha256")

        lines = [
            f"### Evidence #{str(file['id']).zfill(3)} — {_md_escape(file['file_name'])}",
            "",
            f"- **Type**: {_md_escape(file['file_type'])}",
            f"- **Size**: {_md_escape(format(file['file_size'], ','))} bytes",
            f"- **Storage path**: `{_md_escape(file['file_path'])}`",
            f"- **Uploaded by**: {_md_escape(author)}",
            f"- **Uploaded at**: {_md_escape(file['uploaded_at'])}",
        ]

        if sha256:
            lines.append(f"- **SHA-256**: `{sha256}`")
        else:
            lines.append("- **SHA-256**: _not recorded_")

        lines.append("")
        blocks.append("\n".join(lines))

    return "\n".join(blocks).strip()


def _md_sigma_runs(sigma_results):
    """Actual Sigma detection results, grouped by persisted scan run.

    Shows the rule-level result plus the matched events summary for every
    rule that matched during the scan. Full event payloads are intentionally
    left out of the report (they remain available via the API/JSON report).
    """
    blocks = []

    for result in sigma_results:
        run = result.get("run_data") or {}
        evidence_name = run.get("evidence_file_name") or "evidence file"
        author = (result.get("created_by") or {}).get("username") or "unknown"
        matches = run.get("matches") or []

        lines = [
            (
                f"### Sigma scan #{result['id']} — "
                f"{_md_escape(evidence_name)}"
            ),
            "",
            f"- **Evidence file ID**: {result['evidence_file_id']}",
            f"- **Run by**: {_md_escape(author)}",
            f"- **Run at**: {_md_escape(result['created_at'])}",
        ]

        summary = []
        if "events_processed" in run:
            summary.append(f"Events processed: {run['events_processed']}")
        if "rules_evaluated" in run:
            summary.append(f"Rules evaluated: {run['rules_evaluated']}")
        if "rules_skipped" in run:
            summary.append(f"Rules skipped: {run['rules_skipped']}")
        if "events_malformed" in run:
            summary.append(f"Malformed events: {run['events_malformed']}")
        if "duration_seconds" in run:
            summary.append(f"Duration: {run['duration_seconds']}s")

        if summary:
            lines.append(f"- **Scan summary**: {_md_escape(' · '.join(summary))}")

        if run.get("stopped"):
            lines.append("- **Status**: _stopped — partial results_")

        lines.append("")

        if not matches:
            lines.append("_No rules matched during this scan._")
            lines.append("")
            blocks.append("\n".join(lines))
            continue

        for rule in matches:
            rule_info = rule.get("rule") or {}
            rule_matches = rule.get("matches") or []
            count = rule.get("match_count", len(rule_matches))
            truncated = rule.get("truncated", False)

            title = rule_info.get("title") or "Untitled rule"
            level = rule_info.get("level")
            level_label = f"[{level.upper()}] " if level else ""

            rule_lines = [
                f"#### {level_label}{_md_escape(title)} — {_md_escape(rule_info.get('id') or 'no rule id')}",
                "",
            ]

            meta = []
            if rule_info.get("status"):
                meta.append(f"Status: {_md_escape(rule_info['status'])}")
            if rule_info.get("author"):
                meta.append(f"Author: {_md_escape(rule_info['author'])}")

            logsource = rule_info.get("logsource") or {}
            source = " / ".join(
                str(logsource.get(key) or "")
                for key in ("product", "category", "service")
            )
            if source.strip():
                meta.append(f"Logsource: {_md_escape(source.strip(' /'))}")

            if rule_info.get("rule_file"):
                meta.append(f"Rule file: `{_md_escape(rule_info['rule_file'])}`")

            techniques = rule_info.get("mitre_techniques") or []
            tactics = rule_info.get("mitre_tactics") or []
            if techniques or tactics:
                mitre = []
                if techniques:
                    mitre.append(f"Techniques: {_md_escape(', '.join(techniques))}")
                if tactics:
                    mitre.append(f"Tactics: {_md_escape(', '.join(tactics))}")
                meta.append(" | ".join(mitre))

            if meta:
                rule_lines.append(f"- **Rule metadata**: {_md_escape(' · '.join(meta))}")

            if rule_info.get("description"):
                rule_lines.append("")
                rule_lines.append(f"{_md_escape(rule_info['description'])}")

            references = rule_info.get("references") or []
            if references:
                rule_lines.append("")
                rule_lines.append(
                    "**References**: " + " · ".join(_md_escape(ref) for ref in references)
                )

            rule_lines.append("")
            rule_lines.append(
                f"**Matched events**: {count}"
                + (" _(truncated to first " + str(len(rule_matches)) + ")_" if truncated else "")
            )
            rule_lines.append("")

            if rule_matches:
                rule_lines.append(
                    _md_table(
                        ["Time", "Event ID", "Channel", "Computer", "User"],
                        [
                            [
                                event.get("time") or "",
                                event.get("event_id") if event.get("event_id") is not None else "",
                                event.get("channel") or "",
                                event.get("computer") or "",
                                event.get("user") or "",
                            ]
                            for event in rule_matches
                        ],
                    )
                )
                rule_lines.append("")

            rule_lines.append("")
            blocks.append("\n".join(rule_lines))

    return "\n".join(blocks).strip()


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
            ["Evidence Files", "Events", "Detections", "Notes", "Sigma Runs"],
            [[
                counts["evidence_files"],
                counts["events"],
                counts["detections"],
                counts["notes"],
                counts["sigma_results"],
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
        _md_evidence_blocks(data["evidence"])
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

    lines.append("## Sigma Detection Results")
    lines.append("")
    lines.append(
        "The results below are the actual matches produced by the Sigma "
        "detection engine against the registered evidence files."
    )
    lines.append("")
    lines.append(
        _md_sigma_runs(data["sigma_results"])
        or "_No Sigma detection runs are recorded for this case._"
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
    hash_style = ParagraphStyle(
        "Hash",
        fontName="Courier",
        fontSize=8,
        leading=11,
        spaceAfter=6,
        textColor=colors.HexColor("#0f172a"),
        # Break long SHA-256 values instead of overflowing the page.
        wordWrap="CJK",
    )
    rule_heading_style = ParagraphStyle(
        "RuleHeading",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        spaceBefore=8,
        spaceAfter=3,
        textColor=colors.HexColor("#111827"),
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

    counts_headers = ["Evidence Files", "Events", "Detections", "Notes", "Sigma Runs"]
    counts_row = [
        counts["evidence_files"],
        counts["events"],
        counts["detections"],
        counts["notes"],
        counts["sigma_results"],
    ]
    counts_table = Table(
        [counts_headers, counts_row],
        colWidths=[(178 * mm) / len(counts_headers)] * len(counts_headers),
    )
    counts_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, 1), 12),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
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

    def add_evidence_block(file):
        """Render a single evidence file as a labelled block with SHA-256.

        A block (rather than a table row) keeps the long integrity hash
        together with its related metadata and prevents table overflow.
        """
        uploaded_by = file.get("uploaded_by") or {}
        author = (
            uploaded_by.get("username")
            or uploaded_by.get("id")
            or "unknown"
        )

        story.append(
            Paragraph(
                _xml_escape(
                    f"Evidence #{str(file['id']).zfill(3)} - {file['file_name']}"
                ),
                heading_style,
            )
        )

        story.append(
            Paragraph(
                _xml_escape(
                    f"Type: {file['file_type']} &nbsp;|&nbsp; "
                    f"Size: {file['file_size']:,} bytes"
                ),
                body_style,
            )
        )
        story.append(
            Paragraph(
                _xml_escape(
                    f"Storage path: {file['file_path']} &nbsp;|&nbsp; "
                    f"Uploaded by: {author} &nbsp;|&nbsp; "
                    f"Uploaded at: {file['uploaded_at']}"
                ),
                body_style,
            )
        )

        sha256 = file.get("sha256")
        if sha256:
            story.append(
                Paragraph(
                    _xml_escape(f"SHA-256: {sha256}"),
                    hash_style,
                )
            )
        else:
            story.append(
                Paragraph(
                    _xml_escape("SHA-256: not recorded"),
                    note_style,
                )
            )

    def add_plain_table(headers, rows):
        """Table without an accompanying section heading."""
        if not rows:
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

    def add_sigma_results(sigma_results):
        """Render persisted Sigma runs with their actual matched results."""
        if not sigma_results:
            story.append(
                Paragraph(
                    _xml_escape("None recorded for this case."),
                    note_style,
                )
            )
            return

        for result in sigma_results:
            run = result.get("run_data") or {}
            evidence_name = run.get("evidence_file_name") or "evidence file"
            author_label = (result.get("created_by") or {}).get("username") or "unknown"

            story.append(
                Paragraph(
                    _xml_escape(
                        f"Sigma scan #{result['id']} - {evidence_name}"
                    ),
                    heading_style,
                )
            )

            meta_lines = [
                f"Evidence file ID: {result['evidence_file_id']}",
                f"Run by: {author_label}",
                f"Run at: {result['created_at']}",
            ]
            if "events_processed" in run:
                meta_lines.append(f"Events processed: {run['events_processed']}")
            if "rules_evaluated" in run:
                meta_lines.append(f"Rules evaluated: {run['rules_evaluated']}")
            if "rules_skipped" in run:
                meta_lines.append(f"Rules skipped: {run['rules_skipped']}")
            if "events_malformed" in run:
                meta_lines.append(f"Malformed events: {run['events_malformed']}")
            if "duration_seconds" in run:
                meta_lines.append(f"Duration: {run['duration_seconds']}s")
            if run.get("stopped"):
                meta_lines.append("Status: stopped - partial results")

            story.append(
                Paragraph(
                    _xml_escape("<br/>".join(meta_lines)),
                    body_style,
                )
            )

            matches = run.get("matches") or []

            if not matches:
                story.append(
                    Paragraph(
                        _xml_escape("No rules matched during this scan."),
                        note_style,
                    )
                )
                continue

            for rule in matches:
                rule_info = rule.get("rule") or {}
                rule_matches = rule.get("matches") or []
                count = rule.get("match_count", len(rule_matches))
                truncated = rule.get("truncated", False)

                title = rule_info.get("title") or "Untitled rule"
                level = rule_info.get("level")
                level_label = f"[{level.upper()}] " if level else ""
                rule_id = rule_info.get("id") or "no rule id"

                story.append(
                    Paragraph(
                        _xml_escape(f"{level_label}{title} - {rule_id}"),
                        rule_heading_style,
                    )
                )

                meta = []
                if rule_info.get("status"):
                    meta.append(f"Status: {rule_info['status']}")
                if rule_info.get("author"):
                    meta.append(f"Author: {rule_info['author']}")

                logsource = rule_info.get("logsource") or {}
                source = " / ".join(
                    str(logsource.get(key) or "")
                    for key in ("product", "category", "service")
                )
                if source.strip():
                    meta.append(f"Logsource: {source.strip(' /')}")

                if rule_info.get("rule_file"):
                    meta.append(f"Rule file: {rule_info['rule_file']}")

                techniques = rule_info.get("mitre_techniques") or []
                tactics = rule_info.get("mitre_tactics") or []
                if techniques or tactics:
                    mitre = []
                    if techniques:
                        mitre.append(f"Techniques: {', '.join(techniques)}")
                    if tactics:
                        mitre.append(f"Tactics: {', '.join(tactics)}")
                    meta.append(" | ".join(mitre))

                if meta:
                    story.append(
                        Paragraph(
                            _xml_escape(" &nbsp;·&nbsp; ".join(meta)),
                            body_style,
                        )
                    )

                if rule_info.get("description"):
                    story.append(
                        Paragraph(
                            _xml_escape(rule_info["description"]),
                            body_style,
                        )
                    )

                references = rule_info.get("references") or []
                if references:
                    story.append(
                        Paragraph(
                            _xml_escape(
                                "References: " + " · ".join(references)
                            ),
                            body_style,
                        )
                    )

                matched_label = f"Matched events: {count}"
                if truncated:
                    matched_label += (
                        f" (truncated to first {len(rule_matches)})"
                    )
                story.append(
                    Paragraph(
                        _xml_escape(matched_label),
                        body_style,
                    )
                )

                if rule_matches:
                    add_plain_table(
                        ["Time", "Event ID", "Channel", "Computer", "User"],
                        [
                            [
                                m.get("time") or "",
                                m.get("event_id")
                                if m.get("event_id") is not None else "",
                                m.get("channel") or "",
                                m.get("computer") or "",
                                m.get("user") or "",
                            ]
                            for m in rule_matches
                        ],
                    )

    if data["evidence"]:
        for file in data["evidence"]:
            add_evidence_block(file)
    else:
        story.append(
            Paragraph(
                _xml_escape("None recorded for this case."),
                note_style,
            )
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

    story.append(
        Paragraph(
            "Sigma Detection Results",
            heading_style,
        )
    )
    story.append(
        Paragraph(
            "The results below are the actual matches produced by the Sigma "
            "detection engine against the registered evidence files.",
            body_style,
        )
    )
    add_sigma_results(data["sigma_results"])

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