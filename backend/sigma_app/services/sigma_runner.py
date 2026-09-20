import time
from pathlib import Path

from django.conf import settings

from .evtx_parser import EvtxParser
from .rule_resolver import SigmaRuleResolver

TACTIC_TITLES = {
    "reconnaissance": "Reconnaissance",
    "resource-development": "Resource Development",
    "initial-access": "Initial Access",
    "execution": "Execution",
    "persistence": "Persistence",
    "privilege-escalation": "Privilege Escalation",
    "defense-evasion": "Defense Evasion",
    "credential-access": "Credential Access",
    "discovery": "Discovery",
    "lateral-movement": "Lateral Movement",
    "collection": "Collection",
    "command-and-control": "Command and Control",
    "exfiltration": "Exfiltration",
    "impact": "Impact",
}


class SigmaRunner:
    """Scan an EVTX file against Sigma rules from the bundled repo."""

    DEFAULT_MAX_EVENTS_PER_RULE = 100

    def __init__(self, resolver=None):
        self.resolver = resolver or SigmaRuleResolver()

    def run(self, evidence_file, data):
        try:
            evidence_path = self._resolve_evidence_path(evidence_file)
        except (FileNotFoundError, ValueError) as exc:
            return {"status": "error", "error": str(exc)}

        level = data.get("level") or None
        category = data.get("category") or None
        service = data.get("service") or None
        rule_files = data.get("rule_files") or None

        try:
            max_events_per_rule = int(
                data.get("max_events_per_rule") or self.DEFAULT_MAX_EVENTS_PER_RULE
            )
            max_rules = int(data.get("max_rules") or 0)
        except (TypeError, ValueError):
            return {
                "status": "error",
                "error": "Invalid scan limits.",
            }

        rule_records = self.resolver.load(level, category, service, rule_files)
        rules_loaded = len(rule_records)

        active = self._build_matchers(rule_records)
        rules_skipped = rules_loaded - len(active)

        # Optional safety cap on how many rules are evaluated.
        if max_rules and max_rules > 0:
            active = active[:max_rules]

        start = time.monotonic()

        parser = EvtxParser(evidence_path)
        events_processed = 0

        for event in parser.events():
            events_processed += 1
            for record in active:
                if not record["active"]:
                    continue
                try:
                    hit = record["matcher"].match(event)
                except Exception:
                    # A rule that cannot be evaluated for the current event
                    # is dropped so it does not re-fail for every event.
                    record["active"] = False
                    rules_skipped += 1
                    continue
                if hit:
                    record["match_count"] += 1
                    if len(record["matches"]) < max_events_per_rule:
                        record["matches"].append(self._summarize(event))

        events_malformed = parser.malformed

        duration_seconds = round(time.monotonic() - start, 2)

        matches = []
        for record in active:
            if record["match_count"] == 0:
                continue
            matches.append(self._rule_result(record, max_events_per_rule))

        return {
            "status": "success",
            "evidence_file_id": evidence_file.id,
            "evidence_file_name": evidence_file.file_name,
            "events_processed": events_processed,
            "events_malformed": events_malformed,
            "rules_loaded": rules_loaded,
            "rules_evaluated": len(active),
            "rules_skipped": rules_skipped,
            "duration_seconds": duration_seconds,
            "matches": matches,
        }

    def _build_matchers(self, rule_records):
        active = []

        for path, rule in rule_records:
            try:
                from sigma_rule_matcher import RuleMatcher

                matcher = RuleMatcher(rule)
                # Probe with an empty event so rules that cannot be
                # evaluated (e.g. keyword-only detections, unsupported
                # modifiers) are excluded before the real scan starts.
                matcher.match({})
            except Exception:
                continue

            active.append(
                {
                    "path": path,
                    "rule": rule,
                    "matcher": matcher,
                    "active": True,
                    "match_count": 0,
                    "matches": [],
                }
            )

        return active

    def _rule_result(self, record, max_events_per_rule):
        rule = record["rule"]
        logsource = rule.logsource

        tactics, techniques = self._mitre(rule.tags)

        return {
            "rule": {
                "title": rule.title,
                "id": str(rule.id) if rule.id else None,
                "level": rule.level.name.lower() if rule.level else None,
                "status": rule.status.name.lower() if rule.status else None,
                "description": rule.description or "",
                "references": list(rule.references or []),
                "author": rule.author or "",
                "logsource": {
                    "product": logsource.product,
                    "category": logsource.category,
                    "service": logsource.service,
                },
                "rule_file": self._relative_rule_path(record["path"]),
                "mitre_tactics": tactics,
                "mitre_techniques": techniques,
            },
            "match_count": record["match_count"],
            "truncated": record["match_count"] > len(record["matches"]),
            "matches": record["matches"],
        }

    @staticmethod
    def _relative_rule_path(path):
        roots = getattr(settings, "SIGMA_RULES_ROOT", None)
        if roots:
            return path.relative_to(Path(roots)).as_posix()
        return path.name

    @staticmethod
    def _summarize(event):
        return {
            "time": event.get("time"),
            "event_id": event.get("event_id"),
            "channel": event.get("channel"),
            "computer": event.get("computer"),
            "user": event.get("user"),
            "data": event,
        }

    @staticmethod
    def _mitre(tags):
        tactics = []
        techniques = []

        for tag in tags or []:
            text = str(tag)
            if not text.startswith("attack."):
                continue
            value = text[len("attack."):]
            if value.startswith("t"):
                technique = value.upper()
                if technique not in techniques:
                    techniques.append(technique)
            else:
                title = TACTIC_TITLES.get(value, value.replace("-", " ").title())
                if title not in tactics:
                    tactics.append(title)

        return tactics, techniques

    def _resolve_evidence_path(self, evidence_file):
        """Resolve and validate the on-disk path for an EvidenceFile row.

        Mirrors ChainsawRunner: joins EVIDENCE_ROOT with the stored
        (relative) path, verifies the result stays inside EVIDENCE_ROOT,
        and confirms the file exists and is an EVTX.
        """
        evidence_root = Path(settings.EVIDENCE_ROOT).resolve()
        evidence_path = (evidence_root / evidence_file.file_path).resolve()

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
                "Sigma detection only accepts EVTX files."
            )

        return evidence_path