from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.models import EvidenceFile

from .serializers import (
    LEVELS,
    SigmaDetectionRequestSerializer,
)
from .services.rule_resolver import SigmaRuleResolver
from .services.sigma_runner import SigmaRunner


class SigmaDetectView(APIView):
    """Scan an EVTX evidence file against the bundled Sigma rules."""

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = SigmaDetectionRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        try:
            evidence_file = EvidenceFile.objects.select_related(
                "case", "uploaded_by"
            ).get(id=data["evidence_file_id"])
        except EvidenceFile.DoesNotExist:
            return Response(
                {"status": "error", "error": "Evidence file not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Authorization: only the uploader or the case owner may run
        # Sigma detection against this evidence.
        if (
            evidence_file.uploaded_by_id != request.user.id
            and evidence_file.case.created_by_id != request.user.id
        ):
            return Response(
                {
                    "status": "error",
                    "error": "Not authorized to analyze this evidence.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        runner = SigmaRunner()
        result = runner.run(evidence_file, data)

        if result.get("status") == "success":
            return Response(result, status=status.HTTP_200_OK)

        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SigmaMetaView(APIView):
    """Expose Sigma metadata so the UI can build filter controls."""

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        resolver = SigmaRuleResolver()

        return Response({
            "levels": LEVELS,
            "categories": resolver.categories(),
        })