from django.urls import path

from .views import (
    ActivateAccountView,
    LoginView,
    LogoutView,
    MeView,
    MyProfileView,
    RefreshView,
    TeacherListView,
    UserListView,
)

app_name = "accounts"

urlpatterns = [
    # Auth
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    # Users
    path("users/", UserListView.as_view(), name="user-list"),
    path("teachers/", TeacherListView.as_view(), name="teacher-list"),
    # Profile
    path("profile/me/", MyProfileView.as_view(), name="profile-me"),
    # Activate
    path("activate/", ActivateAccountView.as_view(), name="account-activate"),
]
