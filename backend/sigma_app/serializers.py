from rest_framework import serializers

from .models import SigmaDetectionResult

LEVELS = ("informational", "low", "medium", "high", "critical")


class SigmaDetectionRequestSerializer(serializers.Serializer):
    evidence_file_id = serializers.IntegerField()

    # Minimum severity level to include. None = all levels.
    level = serializers.ChoiceField(
        choices=LEVELS,
        required=False,
        allow_null=True,
        default=None,
    )

    # Filter by effective Sigma category (or Windows rules sub-folder).
    category = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
    )

    # Filter by Sigma logsource service.
    service = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
    )

    # Optional explicit subset of rule files (basename or path relative to
    # the rules root, e.g. "rules/windows/process_creation/x.yml").
    rule_files = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_null=True,
        default=None,
    )

    # Response protection: cap matched events stored per rule.
    max_events_per_rule = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=1000,
        allow_null=True,
        default=None,
    )

    # Optional cap on the number of rules to evaluate (0 = no limit).
    max_rules = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=100000,
        default=0,
    )

    def validate_evidence_file_id(self, value):
        if not value:
            raise serializers.ValidationError(
                "evidence_file_id is required."
            )
        return value

    def validate_category(self, value):
        if value is None:
            return None
        value = value.strip()
        return value or None

    def validate_service(self, value):
        if value is None:
            return None
        value = value.strip()
        return value or None


class SigmaDetectionResultSerializer(serializers.ModelSerializer):
    """Serialized access to a persisted Sigma scan run.

    The stored ``run_data`` is the verbatim result produced by
    :class:`sigma_app.services.sigma_runner.SigmaRunner` (scan summary plus
    actual matched rules and matched events).
    """

    class Meta:
        model = SigmaDetectionResult
        fields = [
            "id",
            "case",
            "evidence_file",
            "created_by",
            "created_at",
            "run_data",
        ]
        read_only_fields = fields