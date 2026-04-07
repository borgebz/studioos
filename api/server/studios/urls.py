from django.urls import path
from . import views

urlpatterns = [
    # Studios (Root of the application)
    path("", views.StudioListCreateView.as_view(), name="studio-list-create"),
    path(
        "<int:pk>/",
        views.StudioRetrieveUpdateDestroyView.as_view(),
        name="studio-detail",
    ),
    # Modalities
    path(
        "modalities/",
        views.ModalityListCreateView.as_view(),
        name="modality-list-create",
    ),
    path(
        "modalities/<int:pk>/",
        views.ModalityRetrieveUpdateDestroyView.as_view(),
        name="modality-detail",
    ),
]
