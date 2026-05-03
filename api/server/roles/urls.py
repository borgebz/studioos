"""
Roles app URL routes.
"""

from django.urls import path

from roles import views

app_name = "roles"

urlpatterns = [
    path(
        "permissions/available/",
        views.AvailablePermissionsView.as_view(),
        name="available-permissions",
    ),
    path("", views.RoleListView.as_view(), name="role-list"),
    path(
        "<str:code>/permissions/",
        views.RolePermissionsView.as_view(),
        name="role-permissions",
    ),
    path("<str:code>/", views.RoleDetailView.as_view(), name="role-detail"),
]
