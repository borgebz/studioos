import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from core.models import BaseModel


def message_file_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"messaging/files/{uuid.uuid4()}{ext}"


class Conversation(BaseModel):
    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    coaching = models.ForeignKey(
        "coachings.CoachingClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    recurring_coaching = models.ForeignKey(
        "coachings.RecurringCoaching",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ConversationParticipant",
        through_fields=("conversation", "user"),
        related_name="conversations",
    )

    class Meta:
        ordering = ["-updated_at"]
        permissions = [
            ("can_send_message", "Can send messages"),
            ("can_list_conversations", "Can list conversations"),
        ]

    def __str__(self):
        return f"Conversation {self.pk}"


class ConversationParticipant(BaseModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="conversation_participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_participants",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_conversation_participant",
            )
        ]

    def __str__(self):
        return f"Participant {self.user_id} in Conversation {self.conversation_id}"


class Message(BaseModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField(blank=True)
    file = models.FileField(upload_to=message_file_path, null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    edited_at = models.DateTimeField(null=True, blank=True)
    pinned_at = models.DateTimeField(null=True, blank=True)
    pinned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pinned_messages",
    )
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="read_messages",
        blank=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.pk} in Conversation {self.conversation_id}"


class MessageReaction(BaseModel):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reactions",
    )
    emoji = models.CharField(max_length=16)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user", "emoji"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_message_reaction",
            ),
        ]

    def __str__(self):
        return f"Reaction {self.emoji} on Message {self.message_id} by {self.user_id}"
