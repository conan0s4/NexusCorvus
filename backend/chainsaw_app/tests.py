from django.test import TestCase
from unittest.mock import patch, MagicMock
from pathlib import Path

from .services.chainsaw_runner import ChainsawRunner
from .serializers import ChainsawAnalysisSerializer


class ChainsawRunnerCommandBuilderTests(TestCase):

    def setUp(self):
        self.runner = ChainsawRunner()

    def _build(self, **overrides):
        data = {
            "evidence_file_id": 1,
            "pattern": "all",
            "event_id": "all",
            "host": "all",
            "user": "all",
            "timerange": "all",
            "ignore_case": False,
        }
        data.update(overrides)
        return self.runner._build_command(Path("/tmp/fake.evtx"), data)

    def test_minimal_command_uses_dump_for_all_events(self):
        cmd = self._build()
        # No filter => dump (returns every event in the EVTX).
        self.assertIn("dump", cmd)
        self.assertIn("--json", cmd)
        self.assertIn("-q", cmd)
        self.assertNotIn("search", cmd)

    def test_event_id_uses_tau_not_pattern(self):
        cmd = self._build(event_id="4624")
        self.assertIn("-t", cmd)
        idx = cmd.index("-t")
        self.assertEqual(cmd[idx + 1], "Event.System.EventID: =4624")

    def test_host_uses_regex_not_tau(self):
        cmd = self._build(host="WORKSTATION1")
        # Host filtering uses -e (regex) because Chainsaw's tau
        # `Event.System.Computer: =...` does not match in practice.
        self.assertIn("-e", cmd)
        idx = cmd.index("-e")
        self.assertEqual(cmd[idx + 1], "WORKSTATION1")
        self.assertNotIn("-t", cmd)

    def test_user_uses_regex_not_tau(self):
        cmd = self._build(user="jdoe")
        self.assertIn("-e", cmd)
        idx = cmd.index("-e")
        self.assertEqual(cmd[idx + 1], "jdoe")

    def test_pattern_uses_positional_argument(self):
        cmd = self._build(pattern="mimikatz")
        self.assertIn("mimikatz", cmd)
        self.assertFalse(any(a.startswith("--pattern") for a in cmd))

    def test_ignore_case_adds_ignore_case_flag(self):
        cmd = self._build(pattern="mimikatz", ignore_case=True)
        self.assertIn("-i", cmd)

    def test_timerange_adds_from_and_to(self):
        cmd = self._build(timerange={"start": "2022-01-01T00:00:00", "end": "2022-01-02T00:00:00"})
        self.assertIn("--from", cmd)
        self.assertIn("2022-01-01T00:00:00", cmd)
        self.assertIn("--to", cmd)
        self.assertIn("2022-01-02T00:00:00", cmd)

    def test_evidence_path_is_last_argument(self):
        cmd = self._build()
        # The evidence path is passed through str(Path(...)) so it is
        # platform-normalised. Compare via Path to avoid / vs \ issues.
        self.assertEqual(Path(cmd[-1]).name, "fake.evtx")

    def test_invalid_event_id_raises(self):
        with self.assertRaises(ValueError):
            self._build(event_id="abc")

    def test_invalid_host_raises(self):
        with self.assertRaises(ValueError):
            self._build(host="bad;host")

    def test_invalid_user_raises(self):
        with self.assertRaises(ValueError):
            self._build(user="bad/user")


class ChainsawRunnerValidationTests(TestCase):

    def setUp(self):
        self.runner = ChainsawRunner()

    def test_safe_event_id_accepts_zero(self):
        self.assertTrue(self.runner._is_safe_event_id("0"))

    def test_safe_event_id_rejects_negative(self):
        self.assertFalse(self.runner._is_safe_event_id("-1"))

    def test_safe_event_id_rejects_non_numeric(self):
        self.assertFalse(self.runner._is_safe_event_id("abc"))

    def test_safe_event_id_rejects_too_large(self):
        self.assertFalse(self.runner._is_safe_event_id("1000000"))

    def test_safe_filter_value_rejects_semicolon(self):
        self.assertFalse(self.runner._is_safe_filter_value("a;b"))

    def test_safe_filter_value_rejects_backtick(self):
        self.assertFalse(self.runner._is_safe_filter_value("a`b"))

    def test_safe_filter_value_rejects_pipe(self):
        self.assertFalse(self.runner._is_safe_filter_value("a|b"))

    def test_safe_timestamp_rejects_semicolon(self):
        self.assertFalse(self.runner._is_safe_timestamp("2022-01-01T00:00:00;rm -rf /"))


class ChainsawSerializerTests(TestCase):

    def test_valid_payload(self):
        s = ChainsawAnalysisSerializer(data={
            "evidence_file_id": 1,
            "event_id": "4624",
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_missing_evidence_file_id(self):
        s = ChainsawAnalysisSerializer(data={})
        self.assertFalse(s.is_valid())
        self.assertIn("evidence_file_id", s.errors)

    def test_invalid_event_id_rejected(self):
        s = ChainsawAnalysisSerializer(data={
            "evidence_file_id": 1,
            "event_id": "not-a-number",
        })
        self.assertFalse(s.is_valid())

    def test_timerange_must_be_dict_or_all(self):
        s = ChainsawAnalysisSerializer(data={
            "evidence_file_id": 1,
            "timerange": "just-a-string",
        })
        self.assertFalse(s.is_valid())

    def test_timerange_dict_missing_end(self):
        s = ChainsawAnalysisSerializer(data={
            "evidence_file_id": 1,
            "timerange": {"start": "2022-01-01T00:00:00"},
        })
        self.assertFalse(s.is_valid())