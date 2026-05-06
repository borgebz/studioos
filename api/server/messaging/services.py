import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from .models import Conversation, ConversationParticipant, Message

logger = logging.getLogger(__name__)


def get_or_create_direct_conversation(*, user_a, user_b, created_by=None):
    with transaction.atomic():
        existing = (
            Conversation.objects.filter(conversation_participants__user=user_a)
            .filter(conversation_participants__user=user_b)
            .first()
        )
        if existing:
            return existing, False

        conversation = Conversation(created_by=created_by)
        conversation.full_clean()
        conversation.save()

        for user in (user_a, user_b):
            participant = ConversationParticipant(
                conversation=conversation,
                user=user,
                created_by=created_by,
            )
            participant.full_clean()
            participant.save()

        logger.info(
            "get_or_create_direct_conversation: created conversation %s",
            conversation.pk,
        )
        return conversation, True


def list_conversations(*, user):
    return Conversation.objects.filter(participants=user).prefetch_related(
        "participants", "messages"
    )


def get_conversation(*, conversation_id, user):
    try:
        return Conversation.objects.get(id=conversation_id, participants=user)
    except Conversation.DoesNotExist:
        raise AppNotFound("ConversationNotFound")


def get_messages(*, conversation_id, user):
    get_conversation(conversation_id=conversation_id, user=user)
    return Message.objects.filter(conversation_id=conversation_id)


def send_message(
    *, conversation, sender, body="", file=None, original_filename="", mime_type=""
):
    if not body and not file:
        raise ValidationError({"messages": ["MessageBodyOrFileRequired"]})

    msg = Message(
        conversation=conversation,
        sender=sender,
        body=body,
        original_filename=original_filename,
        mime_type=mime_type,
        created_by=sender,
    )
    if file:
        msg.file = file
    msg.full_clean()
    msg.save()

    conversation.updated_by = sender
    conversation.save(update_fields=["updated_at", "updated_by"])

    logger.info(
        "send_message: message %s created in conversation %s", msg.pk, conversation.pk
    )
    return msg


def mark_read(*, conversation_id, user):
    unread = (
        Message.objects.filter(conversation_id=conversation_id)
        .exclude(read_by=user)
        .exclude(sender=user)
    )
    for msg in unread:
        msg.read_by.add(user)


def get_user_for_conversation(*, user_id):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise AppNotFound("UserNotFound")
