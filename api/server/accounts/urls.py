from .views import UserListView, MeView, MyProfileView
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

app_name = "accounts"

urlpatterns = [
    # Auth
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),

    # Users
    path("users/", UserListView.as_view(), name="user-list"),
    
    # Profile
    path("profile/me/", MyProfileView.as_view(), name="profile-me"),
]
