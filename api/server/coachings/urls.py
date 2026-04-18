"""
Coachings app URL routes.
"""

from django.urls import path

from coachings import views

urlpatterns = [
    # --- Scheduled coaching ---
    path(
        "scheduled/",
        views.CoachingScheduledCreateView.as_view(),
        name="coaching-scheduled-create",
    ),

    # --- Teacher availability (per teacher user) ---
    path(
        "teachers/<int:user_id>/availability/<int:pk>/",
        views.TeacherAvailabilityDetailView.as_view(),
        name="teacher-availability-detail",
    ),
    path(
        "teachers/<int:user_id>/availability/",
        views.TeacherAvailabilityListCreateView.as_view(),
        name="teacher-availability-list-create",
    ),

    # --- Coaching participants ---
    path(
        "<int:coaching_id>/participants/<int:pk>/cancel/",
        views.ParticipantCancelView.as_view(),
        name="participant-cancel",
    ),
    path(
        "<int:coaching_id>/participants/",
        views.ParticipantListCreateView.as_view(),
        name="participant-list-create",
    ),

    # --- Coaching workflow (single coaching by pk) ---
    path(
        "<int:pk>/accept/",
        views.CoachingAcceptView.as_view(),
        name="coaching-accept",
    ),
    path(
        "<int:pk>/reject/",
        views.CoachingRejectView.as_view(),
        name="coaching-reject",
    ),
    path(
        "<int:pk>/approve/",
        views.CoachingApproveView.as_view(),
        name="coaching-approve",
    ),
    path(
        "<int:pk>/complete/",
        views.CoachingCompleteView.as_view(),
        name="coaching-complete",
    ),
    path(
        "<int:pk>/cancel/",
        views.CoachingCancelView.as_view(),
        name="coaching-cancel",
    ),

    # --- Coaching CRUD ---
    path(
        "<int:pk>/",
        views.CoachingDetailView.as_view(),
        name="coaching-detail",
    ),
    path(
        "",
        views.CoachingListCreateView.as_view(),
        name="coaching-list-create",
    ),
]
