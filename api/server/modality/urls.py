from django.urls import path

from modality import views

app_name = "modality"

urlpatterns = [
    path("", views.ModalityListCreateView.as_view(), name="modality-list-create"),
    path(
        "users/<int:user_id>/modalities/",
        views.UserModalityListCreateView.as_view(),
        name="user-modality-list-create",
    ),
    path(
        "users/<int:user_id>/modalities/<int:pk>/",
        views.UserModalityDestroyView.as_view(),
        name="user-modality-destroy",
    ),
    path(
        "<int:pk>/",
        views.ModalityRetrieveUpdateDestroyView.as_view(),
        name="modality-detail",
    ),
]
