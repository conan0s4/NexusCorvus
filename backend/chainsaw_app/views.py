import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import ChainsawAnalysisSerializer
from .services.chainsaw_runner import ChainsawRunner
from core.models import EvidenceFile


class ChainsawAnalysisView(APIView):

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = ChainsawAnalysisSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        try:
            evidence_file = EvidenceFile.objects.select_related(
                "case", "uploaded_by"
            ).get(id=data["evidence_file_id"])
        except EvidenceFile.DoesNotExist:
            return Response(
                {"status": "error", "error": "Evidence file not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Authorization: only the uploader or the case owner may run
        # Chainsaw against this evidence.
        if (
            evidence_file.uploaded_by_id != request.user.id
            and evidence_file.case.created_by_id != request.user.id
        ):
            return Response(
                {"status": "error", "error": "Not authorized to analyze this evidence."},
                status=status.HTTP_403_FORBIDDEN
            )

        runner = ChainsawRunner()
        result = runner.run(evidence_file, data)

        # Never expose the underlying command (contains filesystem paths).
        result.pop("command", None)

        if result.get("status") == "success":
            result["events"] = self._normalize_events(result.get("output", ""))
            result.pop("output", None)
            result.pop("stderr", None)
            return Response(result, status=status.HTTP_200_OK)

        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @staticmethod
    def _normalize_events(raw_output):
        """Parse Chainsaw --json output into a list of event dicts."""
        if not raw_output:
            return []
        try:
            data = json.loads(raw_output)
        except (ValueError, TypeError):
            return []
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
        return []