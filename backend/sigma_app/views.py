import threading

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

# Active Sigma scans keyed by (user_id, evidence_file_id). The scan runs
# in-process, so "stopping" sets a threading.Event the runner checks between
# events; the pending request then returns partial results.
_ACTIVE_SIGMA = {}
_ACTIVE_SIGMA_LOCK = threading.Lock()


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

        stop_event = threading.Event()
        key = (request.user.id, data["evidence_file_id"])

        with _ACTIVE_SIGMA_LOCK:
            _ACTIVE_SIGMA[key] = stop_event

        try:
            runner = SigmaRunner()
            result = runner.run(
                evidence_file,
                data,
                stop_event=stop_event,
            )
        finally:
            with _ACTIVE_SIGMA_LOCK:
                _ACTIVE_SIGMA.pop(key, None)

        if result.get("status") == "success":
            return Response(result, status=status.HTTP_200_OK)

        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SigmaStopView(APIView):
    """Request cancellation of the in-process Sigma scan for an evidence file."""

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        evidence_file_id = request.data.get("evidence_file_id")

        if not evidence_file_id:
            return Response(
                {
                    "status": "error",
                    "error": "evidence_file_id is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        key = (request.user.id, evidence_file_id)

        with _ACTIVE_SIGMA_LOCK:
            stop_event = _ACTIVE_SIGMA.get(key)

        if stop_event is None:
            return Response({
                "status": "ok",
                "stopped": False,
                "detail": "No detection is currently running.",
            })

        stop_event.set()

        return Response({
            "status": "ok",
            "stopped": True,
            "detail": "Scan stop requested.",
        })


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