from django.urls import path

from .views import ChainsawAnalysisView


urlpatterns = [
    path(
        "analyze/",
        ChainsawAnalysisView.as_view(),
        name="chainsaw-analyze"
    ),
]