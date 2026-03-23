from .views import UserListView, LoginView
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

app_name = "accounts"

urlpatterns = [
    path("users/", UserListView.as_view(), name="user-list"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
]
