from typing import Optional

from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.auth_cookies import ACCESS_COOKIE_NAME


class CookieJWTAuthentication(JWTAuthentication):
    """
    Prefer ``Authorization: Bearer …`` when present; otherwise use the access
    token from the httpOnly cookie set at login.
    """

    def authenticate(self, request: Request) -> Optional[tuple]:
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get(ACCESS_COOKIE_NAME)
        if not raw_token:
            return None

        if isinstance(raw_token, str):
            raw_token = raw_token.encode()

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
