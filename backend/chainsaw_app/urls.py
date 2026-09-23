from django.urls import path

from .views import ChainsawAnalysisView, ChainsawStopView


urlpatterns = [
    path(
        "analyze/",
        ChainsawAnalysisView.as_view(),
        name="chainsaw-analyze"
    ),
    path(
        "stop/",
        ChainsawStopView.as_view(),
        name="chainsaw-stop"
    ),
]