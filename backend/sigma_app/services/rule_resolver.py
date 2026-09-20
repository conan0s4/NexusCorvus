from pathlib import Path

from django.conf import settings
from sigma.rule import SigmaRule

# Severity levels ordered per Sigma's SigmaLevel enum (1..5).
LEVEL_RANK = {
    "informational": 1,
    "low": 2,
    "medium": 3,
    "high": 4,
    "critical": 5,
}

# Statuses that indicate a rule should never be evaluated.
SKIP_STATUSES = {"deprecated", "unsupported"}


class SigmaRuleResolver:
    """Discover and filter Sigma rules from the bundled SigmaHQ rules repo."""

    def __init__(self, rules_root=None):
        self.rules_root = Path(rules_root) if rules_root else Path(settings.SIGMA_RULES_ROOT)
        self.windows_dir = self.rules_root / "rules" / "windows"

    def categories(self):
        """Return the Windows rule sub-directories (used as UI filters)."""
        if not self.windows_dir.is_dir():
            return []
        return sorted(entry.name for entry in self.windows_dir.iterdir() if entry.is_dir())

    def load(self, level=None, category=None, service=None, rule_files=None):
        """Load parseable Windows Sigma rules matching the given filters.

        Returns a list of ``(path, SigmaRule)`` tuples. Rules that fail to
        parse, whose status is deprecated/unsupported, or that do not match
        the requested filters are silently excluded (counted by the caller).
        """
        rules = []

        for path in sorted(self.windows_dir.rglob("*.yml")):
            if rule_files and not self._matches_rule_files(
                path, rule_files, self.rules_root
            ):
                continue

            try:
                rule = SigmaRule.from_yaml(
                    path.read_text(encoding="utf-8", errors="replace")
                )
            except Exception:
                continue

            if rule is None:
                continue

            if rule.status is None or rule.status.name.lower() in SKIP_STATUSES:
                continue

            logsource = rule.logsource
            if logsource is None:
                continue
            if logsource.product not in (None, "windows"):
                continue

            if category and not self._matches_category(path, rule, category):
                continue

            if service and logsource.service != service:
                continue

            if level and not (
                rule.level and LEVEL_RANK.get(level, 0) <= rule.level.value
            ):
                continue

            rules.append((path, rule))

        return rules

    @staticmethod
    def _matches_rule_files(path, rule_files, rules_root):
        rel = path.relative_to(rules_root).as_posix()
        rel_dir = str(path.relative_to(rules_root).parent).replace("\\", "/")

        for entry in rule_files:
            entry = entry.replace("\\", "/").strip("/")
            if not entry:
                continue

            # Full file path (e.g. "rules/windows/.../x.yml")
            if entry == rel or rel.endswith("/" + entry):
                return True

            # Basename (e.g. "x.yml")
            if entry == path.name:
                return True

            # Directory prefix (e.g. "rules/windows/network_connection")
            if entry == rel_dir or rel_dir.startswith(entry + "/"):
                return True

        return False

    @staticmethod
    def _matches_category(path, rule, category):
        """Match against the rule's logsource category or its parent folder.

        The ``builtin`` folder contains rules with several different
        categories, so matching by folder name keeps the UI categories
        (derived from folder names) usable.
        """
        if rule.logsource and rule.logsource.category == category:
            return True
        rel = path.relative_to(path.parents[2])
        return len(rel.parts) > 1 and rel.parts[1] == category