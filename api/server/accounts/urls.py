from .views import UserListView, MyProfileView, LoginView, LogoutView, MeView, RefreshView
from django.urls import path

app_name = "accounts"

urlpatterns = [
    # Auth
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),

    # Users
    path("users/", UserListView.as_view(), name="user-list"),
    
    # Profile
    path("profile/me/", MyProfileView.as_view(), name="profile-me"),
]
