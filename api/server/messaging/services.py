import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from .models import Conversation, ConversationParticipant, Message, MessageReaction

logger = logging.getLogger(__name__)


def get_or_create_direct_conversation(*, user_a, user_b, created_by=None):
    from django.contrib.auth import get_user_model

    User = get_user_model()

    with transaction.atomic():
        # Lock the two user rows to serialise concurrent conversation creation
        # for the same pair, preventing duplicate conversations.
        list(
            User.objects.select_for_update()
            .filter(pk__in=[user_a.id, user_b.id])
            .order_by("pk")
        )

        existing = (
            Conversation.objects.filter(
                conversation_participants__user=user_a,
                conversation_participants__deleted_at__isnull=True,
            )
            .filter(
                conversation_participants__user=user_b,
                conversation_participants__deleted_at__isnull=True,
            )
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
    # Use all_objects so soft-deleted messages still appear as tombstones in
    # the conversation history. The serializer hides body/file when deleted_at
    # is set.
    return Message.all_objects.filter(
        conversation_id=conversation_id
    ).prefetch_related("reactions")


def get_message(*, message_id, user):
    """Fetch a message visible to the user (must be a conversation participant).

    Includes soft-deleted messages so callers (e.g. PATCH/DELETE) can reject
    operations on tombstones with a meaningful error.
    """
    try:
        msg = (
            Message.all_objects.select_related("conversation")
            .prefetch_related("reactions")
            .get(pk=message_id)
        )
    except Message.DoesNotExist:
        raise AppNotFound("MessageNotFound")
    if not ConversationParticipant.objects.filter(
        conversation_id=msg.conversation_id, user=user
    ).exists():
        raise AppNotFound("MessageNotFound")
    return msg


def _broadcast_message_event(*, conversation_id, event_type, payload):
    """Fire-and-forget broadcast to the conversation's WebSocket group.

    Safe to call from sync code; silently no-ops if the channel layer is not
    configured (e.g. during unit tests without Channels in-memory backend).
    """
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(
            f"conversation_{conversation_id}",
            {"type": event_type, **payload},
        )
    except Exception:
        logger.exception(
            "broadcast_message_event failed: conversation=%s event=%s",
            conversation_id,
            event_type,
        )


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


def get_unread_counts(*, user):
    """Return per-conversation unread counts for the given user.

    Counts messages in conversations the user participates in, excluding
    messages sent by the user and messages they've already marked as read.
    """
    from django.db.models import Count, Q

    rows = (
        Conversation.objects.filter(participants=user)
        .annotate(
            unread=Count(
                "messages",
                filter=~Q(messages__sender=user) & ~Q(messages__read_by=user),
                distinct=True,
            )
        )
        .values_list("id", "unread")
    )
    by_conversation = {str(cid): count for cid, count in rows if count > 0}
    total = sum(by_conversation.values())
    return {"total": total, "by_conversation": by_conversation}


def edit_message(*, message, user, body):
    """Edit the body of the user's own message.

    Constraints:
    - Only the original sender can edit.
    - Edit window: MESSAGE_EDIT_WINDOW_MINUTES from created_at.
    - Cannot edit a soft-deleted (tombstoned) message.
    - Body must be non-empty after stripping (a message with only a file
      cannot have its body wiped via edit — they should delete and resend).
    """
    if message.deleted_at is not None:
        raise ValidationError({"messages": ["MessageAlreadyDeleted"]})
    if message.sender_id != user.id:
        raise PermissionDenied({"messages": ["NotMessageSender"]})

    window = timedelta(minutes=settings.MESSAGE_EDIT_WINDOW_MINUTES)
    if timezone.now() - message.created_at > window:
        raise ValidationError({"messages": ["MessageEditWindowExpired"]})

    body = (body or "").strip()
    if not body:
        raise ValidationError({"body": ["MessageBodyRequired"]})

    message.body = body
    message.edited_at = timezone.now()
    message.updated_by = user
    message.full_clean()
    message.save(update_fields=["body", "edited_at", "updated_by", "updated_at"])

    transaction.on_commit(
        lambda cid=message.conversation_id, mid=message.pk, b=message.body,
        ea=message.edited_at: _broadcast_message_event(
            conversation_id=cid,
            event_type="message.edited",
            payload={
                "id": mid,
                "body": b,
                "edited_at": ea.isoformat(),
            },
        )
    )

    logger.info("edit_message: message %s edited by user %s", message.pk, user.pk)
    return message


def delete_message(*, message, user):
    """Soft-delete the user's own message. Renders as a tombstone in history.

    Auto-unpins the message if it was pinned, so the conversation's pinned
    list doesn't carry tombstones.
    """
    if message.deleted_at is not None:
        raise ValidationError({"messages": ["MessageAlreadyDeleted"]})
    if message.sender_id != user.id:
        raise PermissionDenied({"messages": ["NotMessageSender"]})

    was_pinned = message.pinned_at is not None
    if was_pinned:
        message.pinned_at = None
        message.pinned_by = None
        message.save(update_fields=["pinned_at", "pinned_by"])

    message.delete(deleted_by=user)

    conversation_id = message.conversation_id
    message_pk = message.pk

    def _broadcast():
        if was_pinned:
            _broadcast_message_event(
                conversation_id=conversation_id,
                event_type="message.unpinned",
                payload={"id": message_pk},
            )
        _broadcast_message_event(
            conversation_id=conversation_id,
            event_type="message.deleted",
            payload={"id": message_pk},
        )

    transaction.on_commit(_broadcast)

    logger.info(
        "delete_message: message %s deleted by user %s (was_pinned=%s)",
        message.pk, user.pk, was_pinned,
    )
    return message


def add_reaction(*, message, user, emoji):
    """Add (or restore) a user's reaction on a message.

    Idempotent: re-reacting with the same emoji is a no-op. If the user had
    previously soft-deleted the same reaction, restore it instead of creating
    a duplicate row.
    """
    emoji = (emoji or "").strip()
    if not emoji:
        raise ValidationError({"emoji": ["EmojiRequired"]})
    if len(emoji) > 16:
        raise ValidationError({"emoji": ["EmojiTooLong"]})
    if message.deleted_at is not None:
        raise ValidationError({"messages": ["MessageAlreadyDeleted"]})

    existing = MessageReaction.all_objects.filter(
        message=message, user=user, emoji=emoji
    ).first()
    if existing is not None:
        if existing.deleted_at is None:
            return existing, False
        existing.restore()
        existing.updated_by = user
        existing.save(update_fields=["updated_by", "updated_at"])
        reaction = existing
        created = True
    else:
        reaction = MessageReaction(
            message=message,
            user=user,
            emoji=emoji,
            created_by=user,
        )
        reaction.full_clean()
        reaction.save()
        created = True

    transaction.on_commit(
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id, e=emoji:
        _broadcast_message_event(
            conversation_id=cid,
            event_type="reaction.added",
            payload={"message_id": mid, "user_id": uid, "emoji": e},
        )
    )

    logger.info(
        "add_reaction: message=%s user=%s emoji=%s created=%s",
        message.pk, user.pk, emoji, created,
    )
    return reaction, created


def remove_reaction(*, message, user, emoji):
    """Remove a user's reaction. No-op if the reaction does not exist."""
    emoji = (emoji or "").strip()
    if not emoji:
        raise ValidationError({"emoji": ["EmojiRequired"]})

    reaction = MessageReaction.objects.filter(
        message=message, user=user, emoji=emoji
    ).first()
    if reaction is None:
        return False

    reaction.delete(deleted_by=user)

    transaction.on_commit(
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id, e=emoji:
        _broadcast_message_event(
            conversation_id=cid,
            event_type="reaction.removed",
            payload={"message_id": mid, "user_id": uid, "emoji": e},
        )
    )

    logger.info(
        "remove_reaction: message=%s user=%s emoji=%s",
        message.pk, user.pk, emoji,
    )
    return True


def pin_message(*, message, user):
    """Pin a message in its conversation. Idempotent — already-pinned is a no-op.

    Cannot pin a soft-deleted message.
    """
    if message.deleted_at is not None:
        raise ValidationError({"messages": ["MessageAlreadyDeleted"]})
    if message.pinned_at is not None:
        return message, False

    message.pinned_at = timezone.now()
    message.pinned_by = user
    message.updated_by = user
    message.save(update_fields=["pinned_at", "pinned_by", "updated_by", "updated_at"])

    transaction.on_commit(
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id,
        pa=message.pinned_at: _broadcast_message_event(
            conversation_id=cid,
            event_type="message.pinned",
            payload={"id": mid, "pinned_by_id": uid, "pinned_at": pa.isoformat()},
        )
    )

    logger.info("pin_message: message %s pinned by user %s", message.pk, user.pk)
    return message, True


def unpin_message(*, message, user):
    """Unpin a message. Idempotent — already-unpinned is a no-op."""
    if message.pinned_at is None:
        return message, False

    message.pinned_at = None
    message.pinned_by = None
    message.updated_by = user
    message.save(update_fields=["pinned_at", "pinned_by", "updated_by", "updated_at"])

    transaction.on_commit(
        lambda cid=message.conversation_id, mid=message.pk:
        _broadcast_message_event(
            conversation_id=cid,
            event_type="message.unpinned",
            payload={"id": mid},
        )
    )

    logger.info("unpin_message: message %s unpinned by user %s", message.pk, user.pk)
    return message, True


def mark_read(*, conversation_id, user):
    unread = (
        Message.objects.filter(conversation_id=conversation_id)
        .exclude(read_by=user)
        .exclude(sender=user)
    )
    through_model = Message.read_by.through
    through_objects = [
        through_model(message_id=msg.id, user_id=user.id) for msg in unread
    ]
    through_model.objects.bulk_create(through_objects, ignore_conflicts=True)


def get_or_create_coaching_conversation(*, coaching, created_by=None):
    recurring = coaching.recurring_coaching

    if recurring is not None:
        existing = Conversation.objects.filter(
            recurring_coaching=recurring,
        ).first()
        if existing:
            return existing, False

    existing = Conversation.objects.filter(coaching=coaching).first()
    if existing:
        return existing, False

    with transaction.atomic():
        conversation = Conversation(
            coaching=coaching,
            recurring_coaching=recurring,
            created_by=created_by,
        )
        conversation.full_clean()
        conversation.save()

        participant_user_ids = set()
        participant_user_ids.add(coaching.teacher_id)

        from coachings.models import CoachingParticipant

        student_ids = CoachingParticipant.objects.filter(
            coaching_class=coaching,
        ).values_list("student_id", flat=True)
        participant_user_ids.update(student_ids)

        for user_id in participant_user_ids:
            cp = ConversationParticipant(
                conversation=conversation,
                user_id=user_id,
                created_by=created_by,
            )
            cp.full_clean()
            cp.save()

        logger.info(
            "get_or_create_coaching_conversation: created conversation %s for coaching %s",
            conversation.pk,
            coaching.pk,
        )
        return conversation, True


def sync_coaching_conversation_participants(*, coaching):
    recurring = coaching.recurring_coaching
    if recurring is not None:
        conversation = Conversation.objects.filter(recurring_coaching=recurring).first()
    else:
        conversation = Conversation.objects.filter(coaching=coaching).first()

    if conversation is None:
        return

    from coachings.models import CoachingParticipant

    expected_user_ids = set()
    expected_user_ids.add(coaching.teacher_id)

    student_ids = CoachingParticipant.objects.filter(
        coaching_class=coaching,
    ).values_list("student_id", flat=True)
    expected_user_ids.update(student_ids)

    existing_user_ids = set(
        ConversationParticipant.objects.filter(
            conversation=conversation,
        ).values_list("user_id", flat=True)
    )

    for user_id in expected_user_ids - existing_user_ids:
        cp = ConversationParticipant(
            conversation=conversation,
            user_id=user_id,
        )
        cp.full_clean()
        cp.save()


def get_user_for_conversation(*, user_id):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise AppNotFound("UserNotFound")
