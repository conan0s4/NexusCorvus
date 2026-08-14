from .models import Case, Event, Detection, Note, EvidenceFile


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
    case.delete()


# EVENT CRUD


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
    event.delete()


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


def create_evidence_file(
    case,
    uploaded_by,
    file_name,
    file_type,
    file_path,
    file_size
):
    return EvidenceFile.objects.create(
        case=case,
        uploaded_by=uploaded_by,
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        file_size=file_size
    )


def get_evidence_files():
    return EvidenceFile.objects.all()


def get_evidence_file(evidence_file_id):
    return EvidenceFile.objects.get(id=evidence_file_id)


def delete_evidence_file(evidence_file_id):
    evidence_file = EvidenceFile.objects.get(id=evidence_file_id)
    evidence_file.delete()