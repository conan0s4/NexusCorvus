from django.urls import path

from .views import (
    SigmaDetectView,
    SigmaMetaView,
    SigmaResultsDetailView,
    SigmaResultsListView,
    SigmaStopView,
)


urlpatterns = [
    path(
        "detect/",
        SigmaDetectView.as_view(),
        name="sigma-detect",
    ),
    path(
        "stop/",
        SigmaStopView.as_view(),
        name="sigma-stop",
    ),
    path(
        "meta/",
        SigmaMetaView.as_view(),
        name="sigma-meta",
    ),
    path(
        "results/",
        SigmaResultsListView.as_view(),
        name="sigma-results-list",
    ),
    path(
        "results/<int:result_id>/",
        SigmaResultsDetailView.as_view(),
        name="sigma-results-detail",
    ),
]