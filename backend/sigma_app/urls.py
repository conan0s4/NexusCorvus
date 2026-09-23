from django.urls import path

from .views import SigmaDetectView, SigmaMetaView, SigmaStopView


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
]