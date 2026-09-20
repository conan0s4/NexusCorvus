from unittest.mock import MagicMock, patch
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status

from core.models import Case, EvidenceFile

from .serializers import SigmaDetectionRequestSerializer
from .services.rule_resolver import SigmaRuleResolver
from .services.sigma_runner import SigmaRunner


class SigmaRunnerPathSafetyTests(TestCase):

    def setUp(self):
        self.runner = SigmaRunner()

    def _evidence(self, file_path):
        return MagicMock(
            id=1,
            file_name="x.evtx",
            file_path=file_path,
        )

    def test_nonexistent_evidence_raises_filenotfound(self):
        evidence = self._evidence("case_9/nope.evtx")
        with self.assertRaises(FileNotFoundError):
            self.runner._resolve_evidence_path(evidence)

    def test_non_evtx_raises_valueerror(self):
        proof_dir = Path(settings.EVIDENCE_ROOT) / "case_1"
        proof_dir.mkdir(parents=True, exist_ok=True)
        tmp_file = proof_dir / "not_evtx.log"
        tmp_file.write_text("fake", encoding="utf-8")
        try:
            evidence = self._evidence("case_1/not_evtx.log")
            with self.assertRaises(ValueError):
                self.runner._resolve_evidence_path(evidence)
        finally:
            tmp_file.unlink(missing_ok=True)

    def test_path_traversal_raises_valueerror(self):
        evidence = self._evidence("../secret.evtx")
        with self.assertRaises(ValueError):
            self.runner._resolve_evidence_path(evidence)

    def test_run_missing_file_returns_error_status(self):
        evidence = self._evidence("case_9/nope.evtx")
        result = self.runner.run(evidence, {})
        self.assertEqual(result["status"], "error")
        self.assertIn("does not exist", result["error"])

    def test_run_corrupt_file_does_not_crash(self):
        evidence = self._evidence("case_4/x.evtx")
        result = self.runner.run(evidence, {"category": "security"})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["events_processed"], 0)
        self.assertGreaterEqual(result["events_malformed"], 1)


class SigmaRuleResolverTests(TestCase):

    def test_windows_rules_api(self):
        resolver = SigmaRuleResolver()
        self.assertIsInstance(resolver.categories(), list)


class SigmaRunnerMitreTests(TestCase):

    def test_mitre_tags_parsed(self):
        tactics, techniques = SigmaRunner._mitre(
            ["attack.stealth", "attack.t1021.001", "attack.lateral-movement"]
        )
        self.assertIn("Stealth", tactics)
        self.assertIn("T1021.001", techniques)
        self.assertIn("Lateral Movement", tactics)

    def test_non_attack_tags_ignored(self):
        tactics, techniques = SigmaRunner._mitre(["foo.bar", "cve.2022-0001"])
        self.assertEqual(tactics, [])
        self.assertEqual(techniques, [])


class SigmaDetectionSerializerTests(TestCase):

    def test_valid_payload(self):
        serializer = SigmaDetectionRequestSerializer(data={
            "evidence_file_id": 1,
            "level": "high",
            "category": "security",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_evidence_file_id_invalid(self):
        serializer = SigmaDetectionRequestSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("evidence_file_id", serializer.errors)

    def test_invalid_level_rejected(self):
        serializer = SigmaDetectionRequestSerializer(data={
            "evidence_file_id": 1,
            "level": "extreme",
        })
        self.assertFalse(serializer.is_valid())

    def test_blank_category_normalized(self):
        serializer = SigmaDetectionRequestSerializer(data={
            "evidence_file_id": 1,
            "category": "  ",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data.get("category"))

    def test_rule_files_list_validated(self):
        serializer = SigmaDetectionRequestSerializer(data={
            "evidence_file_id": 1,
            "rule_files": ["a.yml", "b.yml"],
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_negative_max_events_rejected(self):
        serializer = SigmaDetectionRequestSerializer(data={
            "evidence_file_id": 1,
            "max_events_per_rule": -1,
        })
        self.assertFalse(serializer.is_valid())


class SigmaDetectViewTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user("tester", password="pw")
        self.other = User.objects.create_user("other", password="pw")
        self.case = Case.objects.create(
            case_name="Sigma Test",
            status="open",
            created_by=self.user,
        )
        self.other_case = Case.objects.create(
            case_name="Other Case",
            status="open",
            created_by=self.other,
        )
        self.evidence = EvidenceFile.objects.create(
            case=self.case,
            uploaded_by=self.user,
            file_name="sig.evtx",
            file_type="evtx",
            file_path="case_1/DE_RDP_Tunnel_5156.evtx",
            file_size=1024,
        )

    def _login(self, user):
        self.client.force_login(user)

    def test_unauthenticated_returns_401(self):
        response = self.client.post(
            "/api/sigma/detect/",
            {"evidence_file_id": self.evidence.id},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_not_found_evidence_returns_404(self):
        self._login(self.user)
        response = self.client.post(
            "/api/sigma/detect/",
            {"evidence_file_id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_forbidden_for_non_owner_returns_403(self):
        self._login(self.user)

        foreign = EvidenceFile.objects.create(
            case=self.other_case,
            uploaded_by=self.other,
            file_name="foreign.evtx",
            file_type="evtx",
            file_path="case_5/dup.evtx",
            file_size=1024,
        )

        response = self.client.post(
            "/api/sigma/detect/",
            {"evidence_file_id": foreign.id},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("sigma_app.views.SigmaRunner")
    def test_success_returns_detections(self, runner_cls):
        runner_cls.return_value.run.return_value = {
            "status": "success",
            "evidence_file_id": self.evidence.id,
            "evidence_file_name": "sig.evtx",
            "events_processed": 5,
            "events_malformed": 0,
            "rules_loaded": 10,
            "rules_evaluated": 9,
            "rules_skipped": 1,
            "duration_seconds": 0.2,
            "matches": [
                {
                    "rule": {"title": "Test Rule", "level": "high"},
                    "match_count": 1,
                    "truncated": False,
                    "matches": [],
                }
            ],
        }

        self._login(self.user)

        response = self.client.post(
            "/api/sigma/detect/",
            {"evidence_file_id": self.evidence.id, "level": "high"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["matches"][0]["rule"]["title"], "Test Rule")

    def test_meta_requires_auth(self):
        response = self.client.get("/api/sigma/meta/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("sigma_app.views.SigmaRuleResolver")
    def test_meta_returns_filters(self, resolver_cls):
        resolver_cls.return_value.categories.return_value = ["security"]
        self._login(self.user)

        response = self.client.get("/api/sigma/meta/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("levels", response.json())
        self.assertEqual(response.json()["categories"], ["security"])