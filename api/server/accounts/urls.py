from django.urls import path

from .views import (
    ActivateAccountView,
    BulkInviteCreateView,
    EmailExportView,
    InviteCreateView,
    LoginView,
    LogoutView,
    MeView,
    MyProfileView,
    OnboardingTokenView,
    RefreshView,
    ResendInviteView,
    TeacherListView,
    UserDetailView,
    UserListView,
)

app_name = "accounts"

urlpatterns = [
    path(
        "users/<int:pk>/resend-invite/",
        ResendInviteView.as_view(),
        name="user-resend-invite",
    ),
    # Invites & onboarding (bulk route before single ``invites/`` if we add slug later)
    path("invites/bulk/", BulkInviteCreateView.as_view(), name="invite-bulk"),
    path("invites/", InviteCreateView.as_view(), name="invite-create"),
    path(
        "onboard/<uuid:token>/",
        OnboardingTokenView.as_view(),
        name="onboarding-token",
    ),
    # Auth
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    # Users
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("teachers/", TeacherListView.as_view(), name="teacher-list"),
    # Email export
    path("emails/export/", EmailExportView.as_view(), name="email-export"),
    # Profile
    path("profile/me/", MyProfileView.as_view(), name="profile-me"),
    # Activate
    path("activate/", ActivateAccountView.as_view(), name="account-activate"),
]
