import os

from django.conf import settings


ACCESS_COOKIE_NAME = "studioos_access"
REFRESH_COOKIE_NAME = "studioos_refresh"


def set_auth_cookies(response, access_token, refresh_token):
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES"),  # 15 min
        httponly=True,
        secure=settings.DEBUG is False,
        samesite="Lax",
    )

    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=os.environ.get("JWT_REFRESH_TOKEN_LIFETIME_DAYS"),  # 7 dias
        httponly=True,
        secure=settings.DEBUG is False,
        samesite="Lax",
    )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME)
    response.delete_cookie(REFRESH_COOKIE_NAME)