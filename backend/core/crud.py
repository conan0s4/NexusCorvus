import shutil
from .models import Case, Event, Detection, Note, EvidenceFile
from pathlib import Path
from django.conf import settings
from django.db import transaction

# CASE CRUD

def create_case(case_name, description, status, created_by):
    return Case.objects.create(
        case_name=case_name,
        description=description,
        status=status,
        created_by=created_by
    )


def get_cases():
    return Case.objects.all()


def get_case(case_id):
    return Case.objects.get(id=case_id)


def update_case(case_id, case_name, description, status):
    case = Case.objects.get(id=case_id)

    case.case_name = case_name
    case.description = description
    case.status = status

    case.save()

    return case


def delete_case(case_id):
    case = Case.objects.get(id=case_id)

    # Remove the on-disk case folders before deleting the row so that a
    # failed removal surfaces an error instead of silently leaving the
    # artifacts behind while the database record disappears.
    _delete_physical_case_dir(settings.EVIDENCE_ROOT, case.id)
    _delete_physical_case_dir(settings.EVENT_ROOT, case.id)

    case.delete()


def _delete_physical_case_dir(root, case_id):
    """Recursively remove the case_X folder underneath ``root``.

    The folder is created relative to the managed root (EVIDENCE_ROOT or
    EVENT_ROOT), so we resolve it and verify it stays inside that root
    before deleting. Because a case may be deleted before any file was
    ever uploaded, a missing folder is not an error.
    """
    root_path = Path(root).resolve()
    case_dir = (root_path / f"case_{case_id}").resolve()

    try:
        case_dir.relative_to(root_path)
    except ValueError:
        raise ValueError(
            f"Case directory escapes its managed root: {case_dir}"
        ) from None

    if not case_dir.exists():
        return

    shutil.rmtree(case_dir)


# EVENT CRUD


@transaction.atomic
def create_event_file(case, file_name, json_content):
    """Save a Chainsaw-generated JSON result as an Event artifact.

    Mirrors ``create_evidence_file``: creates the per-case Event directory,
    writes the JSON content to disk, and creates the corresponding Event
    database record.
    """
    # Create case event directory
    case_dir = (
        settings.EVENT_ROOT
        / f"case_{case.id}"
    )

    case_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # Keep only the filename, never a client-supplied path
    safe_name = Path(file_name).name

    file_path = case_dir / safe_name

    # Prevent accidental overwrite
    if file_path.exists():
        raise FileExistsError(
            f"Event file already exists: {safe_name}"
        )

    # Encode content to bytes so we can write in binary mode and
    # report an accurate file_size.
    if isinstance(json_content, bytes):
        content_bytes = json_content
    else:
        content_bytes = str(json_content).encode("utf-8")

    try:
        with open(file_path, "wb+") as destination:
            destination.write(content_bytes)
    except Exception:
        try:
            file_path.unlink()
        except OSError:
            pass
        raise

    try:
        return Event.objects.create(
            case=case,
            file_name=safe_name,
            file_type="json",
            file_path=str(
                file_path.relative_to(
                    settings.EVENT_ROOT
                )
            ),
            file_size=len(content_bytes)
        )
    except Exception:
        try:
            file_path.unlink()
        except OSError:
            pass
        raise


def create_event(
    case,
    file_name,
    file_type,
    file_path,
    file_size
):
    return Event.objects.create(
        case=case,
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        file_size=file_size
    )


def get_events():
    return Event.objects.all()


def get_event(event_id):
    return Event.objects.get(id=event_id)


def delete_event(event_id):
    event = Event.objects.get(id=event_id)

    _delete_physical_event_file(event)

    event.delete()


MAX_EVENT_CONTENT_BYTES = 25 * 1024 * 1024


def read_event_file(event):
    """Return the on-disk Event JSON content as text.

    Mirrors ``_delete_physical_event_file``: the stored path is relative
    to EVENT_ROOT, we re-derive the absolute path, verify it stays inside
    EVENT_ROOT, and guard against oversized files so viewing a record can
    never exhaust server memory.
    """
    if not event.file_path:
        raise ValueError("Event record has no file path.")

    event_root = Path(settings.EVENT_ROOT).resolve()
    candidate = (event_root / event.file_path).resolve()

    try:
        candidate.relative_to(event_root)
    except ValueError:
        raise ValueError(
            f"Event file path escapes EVENT_ROOT: {event.file_path}"
        ) from None

    if not candidate.exists():
        raise FileNotFoundError(
            f"Event file is missing from disk: {event.file_path}"
        )

    if candidate.is_dir():
        raise ValueError(
            f"Event path is not a file: {event.file_path}"
        )

    if candidate.stat().st_size > MAX_EVENT_CONTENT_BYTES:
        raise ValueError("Event file is too large to view inline.")

    return candidate.read_text(encoding="utf-8", errors="replace")


def _delete_physical_event_file(event):
    """Delete the on-disk Event JSON referenced by this row.

    The stored path is relative to EVENT_ROOT. We re-derive the
    absolute path and verify it stays inside EVENT_ROOT before
    unlinking, so a corrupted/malicious DB row can never cause us to
    delete an arbitrary file.

    Raises if the artifact cannot be removed, so the caller can surface
    the failure instead of silently deleting the DB record.
    """
    if not event.file_path:
        return

    event_root = Path(settings.EVENT_ROOT).resolve()
    candidate = (event_root / event.file_path).resolve()

    try:
        candidate.relative_to(event_root)
    except ValueError:
        raise ValueError(
            f"Event file path escapes EVENT_ROOT: {event.file_path}"
        ) from None

    if not candidate.exists():
        raise FileNotFoundError(
            f"Event file is missing from disk: {candidate}"
        )

    if candidate.is_file():
        candidate.unlink()


# DETECTION CRUD

def create_detection(
    case,
    time,
    event_type,
    description,
    host,
    user,
    severity,
    detection_rule,
    rule_id,
    mitre_tactic,
    mitre_technique
):
    return Detection.objects.create(
        case=case,
        time=time,
        event_type=event_type,
        description=description,
        host=host,
        user=user,
        severity=severity,
        detection_rule=detection_rule,
        rule_id=rule_id,
        mitre_tactic=mitre_tactic,
        mitre_technique=mitre_technique
    )


def get_detections():
    return Detection.objects.all()


def get_detection(detection_id):
    return Detection.objects.get(id=detection_id)


def update_detection(
    detection_id,
    time,
    event_type,
    description,
    host,
    user,
    severity,
    detection_rule,
    rule_id,
    mitre_tactic,
    mitre_technique
):
    detection = Detection.objects.get(id=detection_id)

    detection.time = time
    detection.event_type = event_type
    detection.description = description
    detection.host = host
    detection.user = user
    detection.severity = severity
    detection.detection_rule = detection_rule
    detection.rule_id = rule_id
    detection.mitre_tactic = mitre_tactic
    detection.mitre_technique = mitre_technique

    detection.save()

    return detection


def delete_detection(detection_id):
    detection = Detection.objects.get(id=detection_id)
    detection.delete()


# NOTE CRUD


def create_note(case, created_by, content):
    return Note.objects.create(
        case=case,
        created_by=created_by,
        content=content
    )


def get_notes():
    return Note.objects.all()


def get_note(note_id):
    return Note.objects.get(id=note_id)


def update_note(note_id, content):
    note = Note.objects.get(id=note_id)

    note.content = content

    note.save()

    return note


def delete_note(note_id):
    note = Note.objects.get(id=note_id)
    note.delete()


# EVIDENCE FILE CRUD

@transaction.atomic
def create_evidence_file(
    case,
    uploaded_by,
    uploaded_file
):
    # Create case evidence directory
    case_dir = (
        settings.EVIDENCE_ROOT /
        f"case_{case.id}"
    )

    case_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # Keep only the filename, never a client-supplied path
    file_name = Path(
        uploaded_file.name
    ).name

    file_path = case_dir / file_name

    # Prevent accidental overwrite
    if file_path.exists():
        raise FileExistsError(
            f"Evidence file already exists: {file_name}"
        )

    # Save uploaded file in chunks. If anything fails after this point
    # the transaction rolls back the DB row; we also remove the partial
    # file so we never leave orphans behind.
    try:
        with open(file_path, "wb+") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
    except Exception:
        try:
            file_path.unlink()
        except OSError:
            pass
        raise

    try:
        return EvidenceFile.objects.create(
            case=case,
            uploaded_by=uploaded_by,
            file_name=file_name,
            file_type="EVTX",
            file_path=str(
                file_path.relative_to(
                    settings.EVIDENCE_ROOT
                )
            ),
            file_size=uploaded_file.size
        )
    except Exception:
        try:
            file_path.unlink()
        except OSError:
            pass
        raise


def get_evidence_files():
    return EvidenceFile.objects.all()


def get_evidence_file(evidence_file_id):
    return EvidenceFile.objects.get(
        id=evidence_file_id
    )


def delete_evidence_file(evidence_file_id):
    evidence_file = EvidenceFile.objects.get(
        id=evidence_file_id
    )

    # Remove the physical file (best-effort) before deleting the row.
    _delete_physical_evidence_file(evidence_file)

    evidence_file.delete()


def _delete_physical_evidence_file(evidence_file):
    """Delete the on-disk evidence file referenced by this row.

    The stored path is relative to EVIDENCE_ROOT. We re-derive the
    absolute path and verify it stays inside EVIDENCE_ROOT before
    unlinking, so a corrupted/malicious DB row can never cause us to
    delete an arbitrary file.

    Raises if the artifact cannot be removed, so the caller can surface
    the failure instead of silently deleting the DB record.
    """
    if not evidence_file.file_path:
        return

    evidence_root = Path(settings.EVIDENCE_ROOT).resolve()
    candidate = (evidence_root / evidence_file.file_path).resolve()

    try:
        candidate.relative_to(evidence_root)
    except ValueError:
        raise ValueError(
            f"Evidence file path escapes EVIDENCE_ROOT: "
            f"{evidence_file.file_path}"
        ) from None

    if not candidate.exists():
        raise FileNotFoundError(
            f"Evidence file is missing from disk: {candidate}"
        )

    if candidate.is_file():
        candidate.unlink()