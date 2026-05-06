"""Thin adapters around SimpleJWT serializers — kept out of services.py for layering."""

from rest_framework_simplejwt.serializers import (
    TokenBlacklistSerializer,
    TokenRefreshSerializer,
)


def refresh_session_tokens(*, refresh_token_str):
    """
    Rotate refresh (when configured) and return new access / refresh strings.
    Delegates to SimpleJWT ``TokenRefreshSerializer``.
    """
    serializer = TokenRefreshSerializer(data={"refresh": refresh_token_str})
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def blacklist_refresh_token(*, refresh_token_str):
    """Blacklist a refresh token (logout). Uses SimpleJWT ``TokenBlacklistSerializer``."""
    serializer = TokenBlacklistSerializer(data={"refresh": refresh_token_str})
    serializer.is_valid(raise_exception=True)
