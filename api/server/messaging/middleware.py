from http.cookies import SimpleCookie
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.auth_cookies import ACCESS_COOKIE_NAME


@database_sync_to_async
def get_user_from_token(token_str):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token["user_id"])
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


def _extract_cookie_token(scope):
    """Read the access JWT from the ``studioos_access`` cookie (httpOnly).

    Same cookie the REST layer uses — set by login, refreshed by the auth
    refresh endpoint. Lets browser clients open a WebSocket without having
    to expose the token to JS.
    """
    for name, value in scope.get("headers", []):
        if name == b"cookie":
            jar = SimpleCookie()
            jar.load(value.decode())
            morsel = jar.get(ACCESS_COOKIE_NAME)
            if morsel:
                return morsel.value
    return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        token_str = token_list[0] if token_list else _extract_cookie_token(scope)
        if token_str:
            scope["user"] = await get_user_from_token(token_str)
        else:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)
