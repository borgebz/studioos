from django.conf import settings


ACCESS_COOKIE_NAME = "studioos_access"
REFRESH_COOKIE_NAME = "studioos_refresh"


def set_auth_cookies(response, access_token, refresh_token):
    sj = settings.SIMPLE_JWT
    access_max_age = int(sj["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(sj["REFRESH_TOKEN_LIFETIME"].total_seconds())

    cookie_kwargs = {
        "httponly": True,
        "secure": settings.DEBUG is False,
        "samesite": "Lax",
    }

    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=access_max_age,
        **cookie_kwargs,
    )

    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=refresh_max_age,
        **cookie_kwargs,
    )


def clear_auth_cookies(response):
    _samesite = "Lax"
    response.delete_cookie(ACCESS_COOKIE_NAME, samesite=_samesite)
    response.delete_cookie(REFRESH_COOKIE_NAME, samesite=_samesite)
