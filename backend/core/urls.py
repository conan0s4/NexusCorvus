from django.urls import path


from .views import (
    LoginView,

    CaseListCreateView,
    CaseDetailView,
    EventListCreateView,
    EventDetailView,
    DetectionListCreateView,
    DetectionDetailView,
    NoteListCreateView,
    NoteDetailView,
    EvidenceFileListCreateView,
    EvidenceFileDetailView,
)


urlpatterns = [

    # AUTH
    path(
        'auth/login/',
        LoginView.as_view(),
        name='login'
    ),

    # CASE
    path(
        'cases/',
        CaseListCreateView.as_view(),
        name='case-list-create'
    ),

    path(
        'cases/<int:case_id>/',
        CaseDetailView.as_view(),
        name='case-detail'
    ),

    # EVENT
    path(
        'events/',
        EventListCreateView.as_view(),
        name='event-list-create'
    ),

    path(
        'events/<int:event_id>/',
        EventDetailView.as_view(),
        name='event-detail'
    ),

    # DETECTION
    path(
        'detections/',
        DetectionListCreateView.as_view(),
        name='detection-list-create'
    ),

    path(
        'detections/<int:detection_id>/',
        DetectionDetailView.as_view(),
        name='detection-detail'
    ),

    # NOTE
    path(
        'notes/',
        NoteListCreateView.as_view(),
        name='note-list-create'
    ),

    path(
        'notes/<int:note_id>/',
        NoteDetailView.as_view(),
        name='note-detail'
    ),

    # EVIDENCE FILE
    path(
        'evidence/',
        EvidenceFileListCreateView.as_view(),
        name='evidence-list-create'
    ),

    path(
        'evidence/<int:evidence_file_id>/',
        EvidenceFileDetailView.as_view(),
        name='evidence-detail'
    ),
]