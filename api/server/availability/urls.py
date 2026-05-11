from django.urls import path

from availability import views

urlpatterns = [
    path(
        "teachers/<int:user_id>/<int:pk>/",
        views.AvailabilityDetailView.as_view(),
        name="availability-detail",
    ),
    path(
        "teachers/<int:user_id>/",
        views.AvailabilityListCreateView.as_view(),
        name="availability-list-create",
    ),
]
