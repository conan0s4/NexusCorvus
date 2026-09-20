from django.urls import path

from .views import SigmaDetectView, SigmaMetaView


urlpatterns = [
    path(
        "detect/",
        SigmaDetectView.as_view(),
        name="sigma-detect",
    ),
    path(
        "meta/",
        SigmaMetaView.as_view(),
        name="sigma-meta",
    ),
]