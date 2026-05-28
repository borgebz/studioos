from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/conversations/(?P<conversation_id>\d+)/$",
        consumers.ChatConsumer.as_asgi(),
    ),
    re_path(
        r"ws/user/$",
        consumers.UserChannelConsumer.as_asgi(),
    ),
]
