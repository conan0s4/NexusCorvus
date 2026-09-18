import subprocess
from pathlib import Path


class ChainsawRunner:

    def __init__(self):
        from django.conf import settings

        self.backend_dir = Path(__file__).resolve().parents[2]

        self.chainsaw_path = (
            self.backend_dir
            / "chainsaw_tool"
            / "chainsaw"
            / "chainsaw.exe"
        )

        self.evidence_dir = Path(settings.EVIDENCE_ROOT)

    def run(self, evidence_file, data):
        try:
            evidence_path = self._resolve_evidence_path(evidence_file)
            command = self._build_command(evidence_path, data)
        except (FileNotFoundError, ValueError) as exc:
            return {
                "status": "error",
                "error": str(exc),
            }

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                shell=False,
                timeout=300,
            )

            if result.returncode != 0:
                return {
                    "status": "error",
                    "error": result.stderr.strip()
                    or "Chainsaw execution failed.",
                    "returncode": result.returncode,
                }

            return {
                "status": "success",
                "output": result.stdout,
                "stderr": result.stderr,
                "command": command,
            }

        except subprocess.TimeoutExpired:
            return {
                "status": "error",
                "error": "Chainsaw analysis timed out."
            }

        except FileNotFoundError:
            return {
                "status": "error",
                "error": "Chainsaw executable was not found."
            }

        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc)
            }

    def _has_filter(self, data):
        """True when the caller supplied at least one search constraint."""
        return bool(
            (data.get("pattern") and data.get("pattern") != "all")
            or (data.get("event_id") and data.get("event_id") != "all")
            or (data.get("host") and data.get("host") != "all")
            or (data.get("user") and data.get("user") != "all")
            or (data.get("timerange") != "all" and data.get("timerange"))
        )

    def _resolve_evidence_path(self, evidence_file):
        from django.conf import settings

        evidence_root = Path(settings.EVIDENCE_ROOT).resolve()

        # EvidenceFile.file_path is a CharField holding a path relative to
        # EVIDENCE_ROOT. Join it with EVIDENCE_ROOT before resolving so the
        # result does not depend on the process's current working directory.
        evidence_path = (evidence_root / evidence_file.file_path).resolve()

        # Path traversal protection: the resolved path MUST stay inside
        # EVIDENCE_ROOT. A corrupted/malicious file_path column must not
        # let Chainsaw read arbitrary files off the server.
        try:
            evidence_path.relative_to(evidence_root)
        except ValueError as exc:
            raise ValueError(
                "Evidence path escapes the evidence root directory."
            ) from exc

        if not evidence_path.exists():
            raise FileNotFoundError(
                f"Evidence file does not exist: {evidence_path}"
            )

        if evidence_path.suffix.lower() != ".evtx":
            raise ValueError(
                "Chainsaw search only accepts EVTX files."
            )

        return evidence_path

    def _build_command(self, evidence_path, data):
        event_id = data.get("event_id", "all")
        host = data.get("host", "all")
        user = data.get("user", "all")
        timerange = data.get("timerange", "all")
        pattern = data.get("pattern", "all")
        ignore_case = data.get("ignore_case", False)

        # When no filter is supplied, use `dump` to return every event in
        # the EVTX. `search` with no <PATTERN>/-e/-t exits 1 with no output.
        if not self._has_filter(data):
            command = [
                str(self.chainsaw_path),
                "dump",
                "--json",
                "-q",
            ]
            if timerange != "all" and isinstance(timerange, dict):
                # dump has no --from/--to, so fall back to search for
                # time-bounded "show all" requests.
                command = [
                    str(self.chainsaw_path),
                    "search",
                    "--json",
                    "-q",
                ]
                start = timerange.get("start")
                end = timerange.get("end")
                if self._is_safe_timestamp(start):
                    command.extend(["--from", start])
                if self._is_safe_timestamp(end):
                    command.extend(["--to", end])
            command.append(str(evidence_path))
            return command

        command = [
            str(self.chainsaw_path),
            "search",
            "--json",
            "-q",
        ]

        # Keyword / regex search: positional <PATTERN> argument.
        if pattern and pattern != "all":
            if not self._is_safe_pattern(pattern):
                raise ValueError("Invalid search pattern.")
            command.append(pattern)

        if ignore_case:
            command.append("-i")

        if event_id != "all":
            if not self._is_safe_event_id(event_id):
                raise ValueError("Invalid event ID.")
            command.extend(["-t", f"Event.System.EventID: ={event_id}"])

        if host != "all":
            if not self._is_safe_filter_value(host):
                raise ValueError("Invalid host value.")
            # Chainsaw's tau `Event.System.Computer: =...` does not match
            # reliably, so filter by regex (-e) instead.
            command.extend(["-e", host])

        if user != "all":
            if not self._is_safe_filter_value(user):
                raise ValueError("Invalid user value.")
            command.extend(["-e", user])

        if timerange != "all" and isinstance(timerange, dict):
            start = timerange.get("start")
            end = timerange.get("end")
            if self._is_safe_timestamp(start):
                command.extend(["--from", start])
            if self._is_safe_timestamp(end):
                command.extend(["--to", end])

        command.append(str(evidence_path))

        return command

    @staticmethod
    def _is_safe_pattern(value):
        if not isinstance(value, str):
            return False
        if not value or len(value) > 255:
            return False
        # Block shell metacharacters. The value is still passed as its own
        # argv entry (shell=False), but we keep the allow-list strict.
        allowed = set(
            "abcdefghijklmnopqrstuvwxyz"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789"
            "._-\\/@:()[]{}^$*+?|"
        )
        return all(char in allowed for char in value)

    @staticmethod
    def _is_safe_event_id(value):
        try:
            event_id = int(value)
            return 0 <= event_id <= 999999
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _is_safe_filter_value(value):
        if not isinstance(value, str):
            return False

        if not value or len(value) > 255:
            return False

        allowed = set(
            "abcdefghijklmnopqrstuvwxyz"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789"
            "._-\\@"
        )

        return all(char in allowed for char in value)

    @staticmethod
    def _is_safe_timestamp(value):
        if not isinstance(value, str):
            return False

        if len(value) > 64:
            return False

        allowed = set(
            "abcdefghijklmnopqrstuvwxyz"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789"
            "-:+.TZ "
        )

        return all(char in allowed for char in value)