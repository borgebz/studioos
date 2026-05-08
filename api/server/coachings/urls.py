"""
Coachings app URL routes.
"""

from django.urls import path

from coachings import views

urlpatterns = [
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
        "<int:coaching_id>/participants/<int:pk>/approve/",
        views.ParticipantStaffApproveView.as_view(),
        name="participant-staff-approve",
    ),
    path(
        "<int:coaching_id>/participants/<int:pk>/cancel/",
        views.ParticipantCancelView.as_view(),
        name="participant-cancel",
    ),
    path(
        "<int:coaching_id>/participants/accept/",
        views.ParticipantAcceptInviteView.as_view(),
        name="participant-accept-invite",
    ),
    path(
        "<int:coaching_id>/participants/<int:pk>/confirm-attendance/",
        views.ParticipantConfirmAttendanceView.as_view(),
        name="participant-confirm-attendance",
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
        "<int:pk>/teacher-confirm/",
        views.CoachingTeacherConfirmView.as_view(),
        name="coaching-teacher-confirm",
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
    # --- Recurring series ---
    path(
        "recurring/<int:recurring_id>/cancel/",
        views.RecurringSeriesCancelView.as_view(),
        name="recurring-series-cancel",
    ),
    # --- Coaching CRUD ---
    path(
        "<int:pk>/",
        views.CoachingDetailView.as_view(),
        name="coaching-detail",
    ),
    path(
        "request/",
        views.CoachingRequestCreateView.as_view(),
        name="coaching-request-create",
    ),
    path(
        "",
        views.CoachingCollectionView.as_view(),
        name="coaching-collection",
    ),
]
