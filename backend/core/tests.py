import shutil
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from django.conf import settings

from . import crud
from .models import Case, Event, EvidenceFile


class EvidenceUploadCleanupTests(TestCase):

    def setUp(self):
        self._tmp = Path(tempfile.mkdtemp(prefix="nexuscorvus_test_"))
        self._override = override_settings(EVIDENCE_ROOT=self._tmp)
        self._override.enable()
        self.user = User.objects.create_user(
            username="alice",
            password="pw",
        )
        self.case = Case.objects.create(
            case_name="c1",
            status="open",
            created_by=self.user,
        )
        self.evidence_root = settings.EVIDENCE_ROOT

    def tearDown(self):
        self._override.disable()
        shutil.rmtree(self._tmp, ignore_errors=True)
        super().tearDown()

    def _abs(self, rel):
        return (self.evidence_root / rel).resolve()

    def _upload(self, name="x.evtx", content=b"EVTX"):
        return SimpleUploadedFile(name, content, content_type="application/octet-stream")

    def test_upload_creates_row_and_file(self):
        f = crud.create_evidence_file(
            case=self.case,
            uploaded_by=self.user,
            uploaded_file=self._upload(),
        )
        self.assertEqual(EvidenceFile.objects.count(), 1)
        self.assertTrue(self._abs(f.file_path).exists())

    def test_upload_failure_removes_partial_file(self):
        # Pre-create a row with the same filename so a second upload
        # triggers FileExistsError before any DB write.
        crud.create_evidence_file(
            case=self.case,
            uploaded_by=self.user,
            uploaded_file=self._upload("dup.evtx"),
        )
        with self.assertRaises(FileExistsError):
            crud.create_evidence_file(
                case=self.case,
                uploaded_by=self.user,
                uploaded_file=self._upload("dup.evtx"),
            )

    def test_delete_removes_physical_file(self):
        f = crud.create_evidence_file(
            case=self.case,
            uploaded_by=self.user,
            uploaded_file=self._upload(),
        )
        path = self._abs(f.file_path)
        self.assertTrue(path.exists())
        crud.delete_evidence_file(f.id)
        self.assertFalse(path.exists())
        self.assertEqual(EvidenceFile.objects.count(), 0)

    def test_delete_nonexistent_row_raises(self):
        with self.assertRaises(EvidenceFile.DoesNotExist):
            crud.delete_evidence_file(999999)


class EvidencePathContainmentTests(TestCase):

    def setUp(self):
        self._tmp = Path(tempfile.mkdtemp(prefix="nexuscorvus_test_"))
        self._override = override_settings(EVIDENCE_ROOT=self._tmp)
        self._override.enable()
        self.user = User.objects.create_user(username="bob", password="pw")
        self.case = Case.objects.create(case_name="c2", status="open", created_by=self.user)

    def tearDown(self):
        self._override.disable()
        shutil.rmtree(self._tmp, ignore_errors=True)
        super().tearDown()

    def test_delete_does_not_touch_paths_outside_root(self):
        # A DB row whose stored path escapes EVIDENCE_ROOT must be safe to delete.
        ev = EvidenceFile.objects.create(
            case=self.case,
            uploaded_by=self.user,
            file_name="escape.evtx",
            file_type="EVTX",
            file_path="../../etc/passwd",
            file_size=0,
        )
        # Should not raise and should not delete /etc/passwd.
        crud.delete_evidence_file(ev.id)
        self.assertEqual(EvidenceFile.objects.filter(id=ev.id).count(), 0)


class EventSaveTests(TestCase):

    def setUp(self):
        self._tmp = Path(tempfile.mkdtemp(prefix="nexuscorvus_test_"))
        self._override = override_settings(EVENT_ROOT=self._tmp)
        self._override.enable()
        self.user = User.objects.create_user(
            username="alice",
            password="pw",
        )
        self.case = Case.objects.create(
            case_name="c1",
            status="open",
            created_by=self.user,
        )
        self.event_root = settings.EVENT_ROOT

    def tearDown(self):
        self._override.disable()
        shutil.rmtree(self._tmp, ignore_errors=True)
        super().tearDown()

    def _abs(self, rel):
        return (self.event_root / rel).resolve()

    def test_save_creates_row_and_file(self):
        json_content = '[{"Event": "test"}]'
        event = crud.create_event_file(
            case=self.case,
            file_name="Securitysample02.json",
            json_content=json_content,
        )
        self.assertEqual(Event.objects.count(), 1)
        self.assertTrue(self._abs(event.file_path).exists())
        self.assertEqual(event.file_type, "json")

    def test_save_existing_case_dir_reuses_directory(self):
        # Pre-create the case directory with an existing file.
        case_dir = self.event_root / f"case_{self.case.id}"
        case_dir.mkdir(parents=True, exist_ok=True)
        existing = case_dir / "existing.json"
        existing.write_text("existing")

        json_content = '[{"Event": "test"}]'
        event = crud.create_event_file(
            case=self.case,
            file_name="Securitysample02.json",
            json_content=json_content,
        )

        # Existing file must still be there.
        self.assertTrue(existing.exists())
        self.assertTrue(self._abs(event.file_path).exists())
        # Case directory was reused, not recreated.
        self.assertTrue(case_dir.exists())

    def test_save_new_case_creates_directory(self):
        case2 = Case.objects.create(
            case_name="c2",
            status="open",
            created_by=self.user,
        )
        case_dir = self.event_root / f"case_{case2.id}"
        self.assertFalse(case_dir.exists())

        event = crud.create_event_file(
            case=case2,
            file_name="sample.json",
            json_content="[]",
        )
        self.assertTrue(case_dir.exists())
        self.assertTrue(self._abs(event.file_path).exists())

    def test_save_invalid_case_raises(self):
        # A non-existent Case raises DoesNotExist, not a filesystem write.
        nonexistent = Case(id=999999)
        with self.assertRaises(Case.DoesNotExist):
            crud.get_case(999999)

        case_dir = self.event_root / "case_999999"
        self.assertFalse(case_dir.exists())

    def test_db_file_consistency(self):
        json_content = '[{"Event": "test"}]'
        event = crud.create_event_file(
            case=self.case,
            file_name="Securitysample02.json",
            json_content=json_content,
        )
        physical = self._abs(event.file_path)

        self.assertEqual(event.case_id, self.case.id)
        self.assertEqual(event.file_name, "Securitysample02.json")
        self.assertEqual(event.file_type, "json")
        self.assertTrue(physical.exists())
        self.assertEqual(event.file_size, len(json_content.encode("utf-8")))
        self.assertEqual(
            physical.read_text(encoding="utf-8"),
            json_content,
        )

    def test_save_duplicate_filename_raises(self):
        crud.create_event_file(
            case=self.case,
            file_name="dup.json",
            json_content="[]",
        )
        with self.assertRaises(FileExistsError):
            crud.create_event_file(
                case=self.case,
                file_name="dup.json",
                json_content="[]",
            )

    def test_save_strips_path_traversal_from_filename(self):
        event = crud.create_event_file(
            case=self.case,
            file_name="../../malicious.json",
            json_content="[]",
        )
        # Only the basename should be used.
        self.assertEqual(event.file_name, "malicious.json")
        # The physical file must live inside the case directory.
        physical = self._abs(event.file_path)
        self.assertTrue(physical.exists())
        case_dir = self.event_root / f"case_{self.case.id}"
        physical.relative_to(case_dir)

    def test_delete_removes_physical_file(self):
        event = crud.create_event_file(
            case=self.case,
            file_name="to_delete.json",
            json_content="[]",
        )
        path = self._abs(event.file_path)
        self.assertTrue(path.exists())
        crud.delete_event(event.id)
        self.assertFalse(path.exists())
        self.assertEqual(Event.objects.count(), 0)

    def test_delete_nonexistent_row_raises(self):
        with self.assertRaises(Event.DoesNotExist):
            crud.delete_event(999999)

    def test_delete_does_not_touch_paths_outside_root(self):
        ev = Event.objects.create(
            case=self.case,
            file_name="escape.json",
            file_type="json",
            file_path="../../etc/passwd",
            file_size=0,
        )
        # Should not raise and should not delete /etc/passwd.
        crud.delete_event(ev.id)
        self.assertEqual(Event.objects.filter(id=ev.id).count(), 0)