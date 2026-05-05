import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from messaging.middleware import JWTAuthMiddleware
from messaging.routing import websocket_urlpatterns

# Browsers send Origin; CLI/desktop clients (Bruno, wscat, Postman) often omit it.
# AllowedHostsOriginValidator treats missing Origin as invalid → 403 before JWT runs.
_ws_inner = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
if settings.DEBUG:
    _websocket = OriginValidator(_ws_inner, ["*"])
else:
    _websocket = AllowedHostsOriginValidator(_ws_inner)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": _websocket,
    }
)
