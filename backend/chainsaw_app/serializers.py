from rest_framework import serializers


class ChainsawAnalysisSerializer(serializers.Serializer):
    evidence_file_id = serializers.IntegerField()

    # Free-text keyword / regex search pattern.
    # Empty or "all" means "no keyword filter".
    pattern = serializers.CharField(required=False, allow_blank=True, default="all")

    # Numeric Windows Event ID (e.g. 4624). "all" = no filter.
    event_id = serializers.CharField(required=False, default="all")

    # Host / computer name filter. "all" = no filter.
    host = serializers.CharField(required=False, default="all")

    # Username filter. "all" = no filter.
    user = serializers.CharField(required=False, default="all")

    # {"start": "YYYY-MM-ddTHH:mm:SS", "end": "..."} or "all".
    timerange = serializers.JSONField(required=False, default="all")

    # Case-insensitive search.
    ignore_case = serializers.BooleanField(required=False, default=False)

    def validate_evidence_file_id(self, value):
        if not value:
            raise serializers.ValidationError("evidence_file_id is required.")
        return value

    def validate_event_id(self, value):
        if value and value != "all":
            try:
                event_id = int(value)
                if not (0 <= event_id <= 999999):
                    raise ValueError
            except (TypeError, ValueError):
                raise serializers.ValidationError("Invalid event ID.")
        return value

    def validate_host(self, value):
        if value and value != "all":
            allowed = set(
                "abcdefghijklmnopqrstuvwxyz"
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                "0123456789._-\\"
            )
            if not value or len(value) > 255 or any(c not in allowed for c in value):
                raise serializers.ValidationError("Invalid host value.")
        return value

    def validate_user(self, value):
        if value and value != "all":
            allowed = set(
                "abcdefghijklmnopqrstuvwxyz"
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                "0123456789._-\\"
            )
            if not value or len(value) > 255 or any(c not in allowed for c in value):
                raise serializers.ValidationError("Invalid user value.")
        return value

    def validate_timerange(self, value):
        if value == "all" or value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Timerange must be 'all' or an object.")
        if "start" not in value or "end" not in value:
            raise serializers.ValidationError("Timerange must contain 'start' and 'end'.")
        return value