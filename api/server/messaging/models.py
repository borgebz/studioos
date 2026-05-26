import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from core.models import BaseModel


def message_file_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"messaging/files/{uuid.uuid4()}{ext}"


class ConversationKind(models.TextChoices):
    DIRECT = "direct", "Direct"
    GROUP = "group", "Group"
    COACHING = "coaching", "Coaching"
    LISTING = "listing", "Listing"


class Conversation(BaseModel):
    kind = models.CharField(
        max_length=16,
        choices=ConversationKind.choices,
        default=ConversationKind.DIRECT,
    )
    # User-set name. Required for GROUP, blank otherwise (DM label is derived
    # from participants; coaching label from the linked CoachingClass).
    name = models.CharField(max_length=120, blank=True, default="")
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
        return f"Conversation {self.pk} ({self.kind})"


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
    # Admins of a GROUP conversation can rename, add, and remove others.
    # Ignored on DIRECT / COACHING / LISTING conversations.
    is_admin = models.BooleanField(default=False)

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


class MessageKind(models.TextChoices):
    USER = "user", "User message"
    SYSTEM = "system", "System message"


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
    # USER messages have free-text content typed by a participant.
    # SYSTEM messages are emitted by the server for membership changes etc.
    # ``body`` holds a JSON-encoded event payload (e.g.
    # ``{"event":"participant_added","actor_id":1,"target_id":2}``) so the
    # client can localise its own rendering. Sender is set to the actor.
    kind = models.CharField(
        max_length=16,
        choices=MessageKind.choices,
        default=MessageKind.USER,
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
