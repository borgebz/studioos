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

        body = data.get("body", "").strip()
        if not body:
            return

        msg = await self.save_text_message(body)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "id": msg.id,
                "sender_id": self.user.id,
                "body": msg.body,
                "file_url": None,
                "original_filename": "",
                "created_at": msg.created_at.isoformat(),
            },
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "id": event["id"],
                    "sender_id": event["sender_id"],
                    "body": event["body"],
                    "file_url": event["file_url"],
                    "original_filename": event["original_filename"],
                    "created_at": event["created_at"],
                }
            )
        )

    @database_sync_to_async
    def is_participant(self):
        from .models import ConversationParticipant

        return ConversationParticipant.objects.filter(
            conversation_id=self.conversation_id,
            user=self.user,
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
