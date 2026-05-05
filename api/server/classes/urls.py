from django.urls import path

from classes.views import (
    ClasseDetailView,
    ClasseListCreateView,
    ClasseMemberListCreateView,
    ClasseMemberRemoveView,
)

app_name = "classes"

urlpatterns = [
    path(
        "<int:classe_id>/members/<int:pk>/",
        ClasseMemberRemoveView.as_view(),
        name="classe-member-remove",
    ),
    path(
        "<int:classe_id>/members/",
        ClasseMemberListCreateView.as_view(),
        name="classe-member-list-create",
    ),
    path("<int:pk>/", ClasseDetailView.as_view(), name="classe-detail"),
    path("", ClasseListCreateView.as_view(), name="classe-list-create"),
]
