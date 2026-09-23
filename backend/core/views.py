from django.shortcuts import render

# Create your views here.

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth import logout
from django.http import JsonResponse
from django.middleware.csrf import get_token


from . import crud, reports
from .models import Case, Event
from .serializers import (
    CaseSerializer,
    EventSerializer,
    DetectionSerializer,
    NoteSerializer,
    EvidenceFileSerializer
)


# ============================================================
# CSRF
# ============================================================

def csrf_token(request):
    token = get_token(request)

    return JsonResponse({
        "csrfToken": token
    })


# ============================================================
# AUTH API
# ============================================================

class LogoutView(APIView):

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        logout(request)

        return Response({
            'detail': 'Logout successful.'
        })


class ChangePasswordView(APIView):

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {
                    'detail': 'Current password and new password are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(current_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()

        # Keep the user logged in after changing the password
        update_session_auth_hash(request, request.user)

        return Response({
            'detail': 'Password changed successfully.'
        })


class CurrentUserView(APIView):

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            'id': request.user.id,
            'username': request.user.username
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        username = request.data.get('username')

        if not username:
            return Response(
                {'detail': 'Username is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.__class__.objects.filter(
            username=username
        ).exclude(
            id=request.user.id
        ).exists():
            return Response(
                {'detail': 'Username is already taken.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.username = username
        request.user.save()

        return Response({
            'id': request.user.id,
            'username': request.user.username
        })


class LoginView(APIView):

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is None:
            return Response(
                {'detail': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        login(request, user)

        return Response({
            'id': user.id,
            'username': user.username
        })


# ============================================================
# CASE API
# ============================================================

class CaseListCreateView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        cases = crud.get_cases()
        serializer = CaseSerializer(cases, many=True)

        return Response(serializer.data)

    def post(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case = crud.create_case(
            case_name=request.data.get('case_name'),
            description=request.data.get('description'),
            status=request.data.get('status'),
            created_by=request.user
        )

        serializer = CaseSerializer(case)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class CaseDetailView(APIView):

    def get(self, request, case_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case = crud.get_case(case_id)
        serializer = CaseSerializer(case)

        return Response(serializer.data)

    def put(self, request, case_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case = crud.update_case(
            case_id=case_id,
            case_name=request.data.get('case_name'),
            description=request.data.get('description'),
            status=request.data.get('status')
        )

        serializer = CaseSerializer(case)

        return Response(serializer.data)

    def delete(self, request, case_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            crud.delete_case(case_id)
        except ValueError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except OSError as error:
            return Response(
                {'detail': f"Failed to delete case artifacts: {error}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class CaseReportView(APIView):
    """Generate and download a report for a single case.

    The ``report_format`` query parameter selects the output (``json``,
    ``md`` or ``pdf``). The parameter is deliberately not named ``format``
    because Django REST Framework reserves that name for renderer suffix
    negotiation. The document is built from the data already persisted
    against the requested case and contains nothing outside of it.
    """

    def get(self, request, case_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        report_format = (
            request.query_params.get('report_format', 'json')
            or 'json'
        ).lower().strip()

        if report_format not in reports.FORMATS:
            return Response(
                {
                    'detail': (
                        "Unsupported report format. "
                        "Use 'json', 'md' or 'pdf'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            case = crud.get_case(case_id)
        except Case.DoesNotExist:
            return Response(
                {'detail': 'Case not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            return reports.render_case_report(
                case,
                report_format,
                generated_by=request.user.username
            )
        except Exception as error:
            return Response(
                {'detail': f'Failed to generate report: {error}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
# EVENT API
# ============================================================

class EventListCreateView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        events = crud.get_events()
        serializer = EventSerializer(events, many=True)

        return Response(serializer.data)

    def post(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case_id = request.data.get('case_id')
        file_name = request.data.get('file_name')
        content = request.data.get('content')

        if not case_id:
            return Response(
                {'detail': 'case_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file_name:
            return Response(
                {'detail': 'file_name is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not content:
            return Response(
                {'detail': 'content is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            case = crud.get_case(case_id)
        except Exception:
            return Response(
                {'detail': 'Case not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            event = crud.create_event_file(
                case=case,
                file_name=file_name,
                json_content=content
            )
        except FileExistsError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_409_CONFLICT
            )

        serializer = EventSerializer(event)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class EventDetailView(APIView):

    def get(self, request, event_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        event = crud.get_event(event_id)
        serializer = EventSerializer(event)

        return Response(serializer.data)


class EventJsonView(APIView):
    """Serve the raw on-disk JSON content for a saved Event record."""

    def get(self, request, event_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            event = crud.get_event(event_id)
            content = crud.read_event_file(event)
        except Event.DoesNotExist:
            return Response(
                {'detail': 'Event not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except FileNotFoundError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except OSError as error:
            return Response(
                {'detail': f"Failed to read event JSON: {error}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'id': event.id,
            'case': event.case_id,
            'file_name': event.file_name,
            'file_type': event.file_type,
            'file_size': event.file_size,
            'created_at': event.created_at,
            'content': content,
        })

    def delete(self, request, event_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            crud.delete_event(event_id)
        except ValueError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except OSError as error:
            return Response(
                {'detail': f"Failed to delete event artifacts: {error}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# DETECTION API
# ============================================================

class DetectionListCreateView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        detections = crud.get_detections()

        serializer = DetectionSerializer(
            detections,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case = crud.get_case(
            request.data.get('case_id')
        )

        detection = crud.create_detection(
            case=case,
            time=request.data.get('time'),
            event_type=request.data.get('event_type'),
            description=request.data.get('description'),
            host=request.data.get('host'),
            user=request.data.get('user'),
            severity=request.data.get('severity'),
            detection_rule=request.data.get('detection_rule'),
            rule_id=request.data.get('rule_id'),
            mitre_tactic=request.data.get('mitre_tactic'),
            mitre_technique=request.data.get('mitre_technique')
        )

        serializer = DetectionSerializer(detection)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class DetectionDetailView(APIView):

    def get(self, request, detection_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        detection = crud.get_detection(detection_id)
        serializer = DetectionSerializer(detection)

        return Response(serializer.data)

    def put(self, request, detection_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        detection = crud.update_detection(
            detection_id=detection_id,
            time=request.data.get('time'),
            event_type=request.data.get('event_type'),
            description=request.data.get('description'),
            host=request.data.get('host'),
            user=request.data.get('user'),
            severity=request.data.get('severity'),
            detection_rule=request.data.get('detection_rule'),
            rule_id=request.data.get('rule_id'),
            mitre_tactic=request.data.get('mitre_tactic'),
            mitre_technique=request.data.get('mitre_technique')
        )

        serializer = DetectionSerializer(detection)

        return Response(serializer.data)

    def delete(self, request, detection_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        crud.delete_detection(detection_id)

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# NOTE API
# ============================================================

class NoteListCreateView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        notes = crud.get_notes()
        serializer = NoteSerializer(notes, many=True)

        return Response(serializer.data)

    def post(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case_id = request.data.get('case_id')

        if not case_id:
            return Response(
                {'detail': 'case_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            case = crud.get_case(case_id)
        except Case.DoesNotExist:
            return Response(
                {'detail': 'Case not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        note = crud.create_note(
            case=case,
            created_by=request.user,
            content=request.data.get('content')
        )

        serializer = NoteSerializer(note)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class NoteDetailView(APIView):

    def get(self, request, note_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        note = crud.get_note(note_id)
        serializer = NoteSerializer(note)

        return Response(serializer.data)

    def put(self, request, note_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        note = crud.update_note(
            note_id=note_id,
            content=request.data.get('content')
        )

        serializer = NoteSerializer(note)

        return Response(serializer.data)

    def delete(self, request, note_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        crud.delete_note(note_id)

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# EVIDENCE FILE API
# ============================================================

class EvidenceFileListCreateView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        files = crud.get_evidence_files()

        serializer = EvidenceFileSerializer(
            files,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        case_id = request.data.get('case_id')
        uploaded_file = request.FILES.get('file')

        if not case_id:
            return Response(
                {'detail': 'case_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not uploaded_file:
            return Response(
                {'detail': 'EVTX file is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_name = uploaded_file.name.lower()

        if not file_name.endswith('.evtx'):
            return Response(
                {'detail': 'Only EVTX files are allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            case = crud.get_case(case_id)

        except Exception:
            return Response(
                {'detail': 'Case not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            evidence_file = crud.create_evidence_file(
                case=case,
                uploaded_by=request.user,
                uploaded_file=uploaded_file
            )

        except FileExistsError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_409_CONFLICT
            )

        serializer = EvidenceFileSerializer(
            evidence_file
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

class EvidenceFileDetailView(APIView):

    def get(self, request, evidence_file_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        evidence_file = crud.get_evidence_file(
            evidence_file_id
        )

        serializer = EvidenceFileSerializer(evidence_file)

        return Response(serializer.data)

    def delete(self, request, evidence_file_id):

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            crud.delete_evidence_file(
                evidence_file_id
            )
        except ValueError as error:
            return Response(
                {'detail': str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except OSError as error:
            return Response(
                {'detail': f"Failed to delete evidence file: {error}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )