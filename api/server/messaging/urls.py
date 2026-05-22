from django.urls import path

from . import views

urlpatterns = [
    path("conversations/", views.ConversationListView.as_view()),
    path("conversations/unread-count/", views.UnreadCountView.as_view()),
    path(
        "conversations/<int:conversation_id>/messages/",
        views.MessageListView.as_view(),
    ),
    path("messages/<int:message_id>/", views.MessageDetailView.as_view()),
    path(
        "messages/<int:message_id>/reactions/",
        views.MessageReactionView.as_view(),
    ),
    path("messages/<int:message_id>/pin/", views.PinMessageView.as_view()),
    path("messages/<int:message_id>/unpin/", views.UnpinMessageView.as_view()),
]
