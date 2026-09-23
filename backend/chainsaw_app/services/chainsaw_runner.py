import subprocess
import threading
from pathlib import Path
from uuid import uuid4

# Registry of currently running Chainsaw processes, keyed by run id so a
# stop request handled in another thread can locate and terminate a process
# instead of leaving it orphaned. Entries are removed once the process ends.
_ACTIVE = {}
_ACTIVE_LOCK = threading.Lock()


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

    def run(self, evidence_file, data, user_id=None):
        """Synchronous convenience wrapper kept for compatibility."""
        started = self.start(evidence_file, data, user_id=user_id)

        if started.get("status") != "started":
            return started

        return self.wait(started["run_id"])

    def start(self, evidence_file, data, user_id=None):
        """Resolve the evidence + build the command, then launch Chainsaw.

        Launches the subprocess without blocking so a Stop request can
        reach the running process. Returns ``{"status": "started",
        "run_id": ...}`` or an error dict when validation fails.
        """
        try:
            evidence_path = self._resolve_evidence_path(evidence_file)
            command = self._build_command(evidence_path, data)
        except (FileNotFoundError, ValueError) as exc:
            return {
                "status": "error",
                "error": str(exc),
            }

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=False,
            )
        except FileNotFoundError:
            return {
                "status": "error",
                "error": "Chainsaw executable was not found."
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
            }

        run_id = uuid4().hex

        entry = {
            "process": process,
            "stopped": False,
            "user_id": user_id,
            "evidence_file_id": (
                evidence_file.id if evidence_file is not None else None
            ),
            "command": command,
        }

        with _ACTIVE_LOCK:
            _ACTIVE[run_id] = entry

        return {
            "status": "started",
            "run_id": run_id,
        }

    def wait(self, run_id, timeout=300):
        """Block until the launched process finishes (or is stopped)."""
        with _ACTIVE_LOCK:
            entry = _ACTIVE.get(run_id)

        if entry is None:
            return {
                "status": "error",
                "error": "Analysis is no longer running."
            }

        process = entry["process"]
        timed_out = False

        try:
            stdout, stderr = process.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            process.kill()
            stdout, stderr = process.communicate()
        except Exception as exc:
            with _ACTIVE_LOCK:
                _ACTIVE.pop(run_id, None)
            return {
                "status": "error",
                "error": str(exc),
            }

        with _ACTIVE_LOCK:
            was_stopped = entry.get("stopped", False)
            _ACTIVE.pop(run_id, None)

        if was_stopped:
            return {
                "status": "stopped",
                "returncode": process.returncode,
                "detail": "Analysis was stopped.",
            }

        if timed_out:
            return {
                "status": "error",
                "error": "Chainsaw analysis timed out."
            }

        if process.returncode != 0:
            return {
                "status": "error",
                "error": stderr.strip()
                or "Chainsaw execution failed.",
                "returncode": process.returncode,
            }

        return {
            "status": "success",
            "output": stdout,
            "stderr": stderr,
            "command": entry.get("command"),
        }

    @classmethod
    def find_active(cls, user_id, evidence_file_id):
        """Return the run id of the active process for a user+evidence."""
        with _ACTIVE_LOCK:
            for run_id, entry in _ACTIVE.items():
                if (
                    entry.get("user_id") == user_id
                    and entry.get("evidence_file_id") == evidence_file_id
                ):
                    return run_id
        return None

    @classmethod
    def stop(cls, run_id):
        """Terminate the running process for ``run_id`` when still active."""
        with _ACTIVE_LOCK:
            entry = _ACTIVE.get(run_id)

        if entry is None:
            return {
                "status": "ok",
                "stopped": False,
                "detail": "No active analysis for this run."
            }

        process = entry["process"]

        if process.poll() is not None:
            with _ACTIVE_LOCK:
                _ACTIVE.pop(run_id, None)
            return {
                "status": "ok",
                "stopped": False,
                "detail": "Analysis already completed."
            }

        entry["stopped"] = True
        process.terminate()

        # Give the process a moment to exit before forcing a kill.
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)

        return {
            "status": "ok",
            "stopped": True,
            "detail": "Analysis stopped."
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