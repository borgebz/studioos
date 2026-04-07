from django.urls import path

from modality import views

urlpatterns = [
    path("", views.ModalityListCreateView.as_view(), name="modality-list-create"),
    path(
        "<int:pk>/",
        views.ModalityRetrieveUpdateDestroyView.as_view(),
        name="modality-detail",
    ),
]
