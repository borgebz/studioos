import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"conversation_{self.conversation_id}"

        if not await self.is_participant():
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        # Ephemeral typing indicator. Pure pass-through — no DB, no
        # persistence. Server just fans it out to the other connected
        # participants. Sender is taken from the authenticated scope so
        # clients can't impersonate.
        if msg_type in ("typing", "typing_stopped"):
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "user.typing",
                    "kind": msg_type,
                    "user_id": self.user.id,
                },
            )
            return

        body = data.get("body", "").strip()
        if not body:
            return

        # services.send_message broadcasts on transaction commit, so the
        # message reaches every connected participant (including this one).
        # The consumer just persists it here — no explicit group_send needed.
        await self.save_text_message(body)

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message",
                    "id": event["id"],
                    "sender_id": event["sender_id"],
                    "body": event["body"],
                    "file_url": event["file_url"],
                    "original_filename": event["original_filename"],
                    "created_at": event["created_at"],
                }
            )
        )

    async def message_edited(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message.edited",
                    "id": event["id"],
                    "body": event["body"],
                    "edited_at": event["edited_at"],
                }
            )
        )

    async def message_deleted(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message.deleted",
                    "id": event["id"],
                }
            )
        )

    async def reaction_added(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "reaction.added",
                    "message_id": event["message_id"],
                    "user_id": event["user_id"],
                    "emoji": event["emoji"],
                }
            )
        )

    async def reaction_removed(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "reaction.removed",
                    "message_id": event["message_id"],
                    "user_id": event["user_id"],
                    "emoji": event["emoji"],
                }
            )
        )

    async def participant_added(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "participant.added",
                    "conversation_id": event["conversation_id"],
                    "user_id": event["user_id"],
                    "added_by_id": event["added_by_id"],
                }
            )
        )

    async def participant_removed(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "participant.removed",
                    "conversation_id": event["conversation_id"],
                    "user_id": event["user_id"],
                    "removed_by_id": event["removed_by_id"],
                }
            )
        )

    async def conversation_renamed(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "conversation.renamed",
                    "id": event["id"],
                    "name": event["name"],
                }
            )
        )

    async def user_typing(self, event):
        # Don't echo typing back to the sender.
        if event.get("user_id") == self.user.id:
            return
        await self.send(
            text_data=json.dumps(
                {
                    "type": event["kind"],  # "typing" or "typing_stopped"
                    "user_id": event["user_id"],
                }
            )
        )

    async def message_pinned(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message.pinned",
                    "id": event["id"],
                    "pinned_by_id": event["pinned_by_id"],
                    "pinned_at": event["pinned_at"],
                }
            )
        )

    async def message_unpinned(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message.unpinned",
                    "id": event["id"],
                }
            )
        )

    @database_sync_to_async
    def is_participant(self):
        from .models import ConversationParticipant

        # Default manager already excludes soft-deleted; double-check the
        # filter to make intent explicit for anyone reading this in a year.
        return ConversationParticipant.objects.filter(
            conversation_id=self.conversation_id,
            user=self.user,
            deleted_at__isnull=True,
        ).exists()

    @database_sync_to_async
    def save_text_message(self, body):
        from .models import Conversation
        from . import services

        conversation = Conversation.objects.get(id=self.conversation_id)
        return services.send_message(
            conversation=conversation,
            sender=self.user,
            body=body,
        )


class UserChannelConsumer(AsyncWebsocketConsumer):
    """One-per-user channel for app-wide notifications.

    Opened by the web client as soon as the user is authenticated (regardless
    of which page they are on). Receives lightweight events for new messages
    addressed to the user so the sidebar badge can update + animate without
    polling.

    Events emitted to the client:
        {"type": "incoming_message",
         "conversation_id": int,
         "message_id": int,
         "sender_id": int}
    """

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def incoming_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "incoming_message",
                    "conversation_id": event["conversation_id"],
                    "message_id": event["message_id"],
                    "sender_id": event["sender_id"],
                }
            )
        )

    async def conversation_added(self, event):
        # The current user was just added to a conversation (e.g. a new
        # group). The frontend should refetch the conversation list.
        await self.send(
            text_data=json.dumps(
                {
                    "type": "conversation.added",
                    "conversation_id": event["conversation_id"],
                }
            )
        )
