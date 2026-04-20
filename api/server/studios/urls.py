from django.urls import path

from studios import views

urlpatterns = [
    path("", views.StudioListCreateView.as_view(), name="studio-list-create"),
    path(
        "<int:pk>/",
        views.StudioRetrieveUpdateDestroyView.as_view(),
        name="studio-detail",
    ),
]
