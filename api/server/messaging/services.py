import json
import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from .models import (
    Conversation,
    ConversationKind,
    ConversationParticipant,
    Message,
    MessageKind,
    MessageReaction,
)

GROUP_MIN_MEMBERS = 3
GROUP_MAX_MEMBERS = 50

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


def create_listing_conversation(*, listing, variant, buyer, seller, created_by=None):
    """Create a fresh listing-scoped thread — never reuses an existing one."""
    with transaction.atomic():
        conversation = Conversation(
            kind=ConversationKind.LISTING,
            listing=listing,
            variant=variant,
            name=(listing.title or "")[:120],
            created_by=created_by,
        )
        conversation.full_clean()
        conversation.save()

        for user in (buyer, seller):
            if user is None:
                continue
            participant = ConversationParticipant(
                conversation=conversation,
                user=user,
                created_by=created_by,
            )
            participant.full_clean()
            participant.save()

        logger.info(
            "create_listing_conversation: conversation %s for listing %s",
            conversation.pk,
            listing.pk,
        )
        return conversation


def list_conversations(*, user):
    from django.db.models import Prefetch
    from django.contrib.auth import get_user_model

    User = get_user_model()
    participants_qs = User.objects.select_related("profile")
    return (
        Conversation.objects.filter(participants=user)
        .select_related("listing__product", "variant", "listing_offer__variant__size")
        .prefetch_related(
            Prefetch("participants", queryset=participants_qs),
            "messages",
            "listing__product__media",
            "variant__media_links__product_media",
            "variant__product__media",
        )
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
    return Message.all_objects.filter(conversation_id=conversation_id).prefetch_related(
        "reactions"
    )


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


def _broadcast_user_notifications(
    *, recipient_ids, conversation_id, message_id, sender_id
):
    """Push a lightweight ``incoming_message`` event to every recipient's
    app-wide WebSocket channel. Used by the sidebar badge so it can react
    in real time when the user is not inside the conversation."""
    layer = get_channel_layer()
    if layer is None:
        return
    payload = {
        "type": "incoming_message",
        "conversation_id": conversation_id,
        "message_id": message_id,
        "sender_id": sender_id,
    }
    for uid in recipient_ids:
        try:
            async_to_sync(layer.group_send)(f"user_{uid}", payload)
        except Exception:
            logger.exception(
                "broadcast_user_notification failed: user=%s message=%s",
                uid,
                message_id,
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

    file_url = msg.file.url if msg.file else None
    transaction.on_commit(
        lambda cid=conversation.pk, mid=msg.pk, sid=sender.id, b=msg.body, fu=file_url, ofn=msg.original_filename, ca=msg.created_at: _broadcast_message_event(
            conversation_id=cid,
            event_type="chat.message",
            payload={
                "id": mid,
                "sender_id": sid,
                "body": b,
                "file_url": fu,
                "original_filename": ofn,
                "created_at": ca.isoformat(),
            },
        )
    )

    # Notify each recipient on their app-wide user channel so the sidebar
    # badge updates instantly even when they're not viewing this thread.
    recipient_ids = list(
        ConversationParticipant.objects.filter(conversation=conversation)
        .exclude(user=sender)
        .values_list("user_id", flat=True)
    )
    transaction.on_commit(
        lambda cid=conversation.pk, mid=msg.pk, sid=sender.id, rids=recipient_ids: _broadcast_user_notifications(
            recipient_ids=rids,
            conversation_id=cid,
            message_id=mid,
            sender_id=sid,
        )
    )

    logger.info(
        "send_message: message %s created in conversation %s", msg.pk, conversation.pk
    )
    return msg


def get_unread_counts(*, user):
    """Return per-conversation unread counts for the given user.

    Counts messages in conversations the user participates in, excluding
    messages sent by the user and messages they've already marked as read.

    Implementation note: an earlier version used ``annotate(Count(...,
    filter=~Q(messages__read_by=user)))`` directly, but Django's negation
    across an M2M join produces SQL that doesn't correctly exclude rows
    where the through-row for ``user`` exists. Counting via a per-message
    subquery + group-by sidesteps that.
    """
    rows = (
        Message.objects.filter(conversation__participants=user)
        .exclude(sender=user)
        .exclude(read_by=user)
        .values("conversation_id")
        .annotate(unread=models.Count("id", distinct=True))
    )
    by_conversation = {
        str(r["conversation_id"]): r["unread"] for r in rows if r["unread"] > 0
    }
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
        lambda cid=message.conversation_id, mid=message.pk, b=message.body, ea=message.edited_at: _broadcast_message_event(
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
        message.pk,
        user.pk,
        was_pinned,
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
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id, e=emoji: _broadcast_message_event(
            conversation_id=cid,
            event_type="reaction.added",
            payload={"message_id": mid, "user_id": uid, "emoji": e},
        )
    )

    logger.info(
        "add_reaction: message=%s user=%s emoji=%s created=%s",
        message.pk,
        user.pk,
        emoji,
        created,
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
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id, e=emoji: _broadcast_message_event(
            conversation_id=cid,
            event_type="reaction.removed",
            payload={"message_id": mid, "user_id": uid, "emoji": e},
        )
    )

    logger.info(
        "remove_reaction: message=%s user=%s emoji=%s",
        message.pk,
        user.pk,
        emoji,
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
        lambda cid=message.conversation_id, mid=message.pk, uid=user.id, pa=message.pinned_at: _broadcast_message_event(
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
        lambda cid=message.conversation_id, mid=message.pk: _broadcast_message_event(
            conversation_id=cid,
            event_type="message.unpinned",
            payload={"id": mid},
        )
    )

    logger.info("unpin_message: message %s unpinned by user %s", message.pk, user.pk)
    return message, True


def mark_read(*, conversation_id, user):
    """Mark every unread message in the conversation as read for the user.

    Authorization: caller must be a conversation participant — enforced by
    callers that look up the conversation first. Idempotent: re-running is a
    no-op once everything is read.
    """
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


# ---------------------------------------------------------------------------
# Group conversations (ad-hoc)
# ---------------------------------------------------------------------------


def _broadcast_conversation_event(*, conversation_id, event_type, payload):
    """Sibling of _broadcast_message_event for conversation-shape events."""
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
            "broadcast_conversation_event failed: conversation=%s event=%s",
            conversation_id,
            event_type,
        )


def _notify_users_conversation_added(*, recipient_ids, conversation_id):
    """Push a 'conversation.added' event to each user's app-wide channel so
    their inbox refreshes when they're added to a new group."""
    layer = get_channel_layer()
    if layer is None:
        return
    for uid in recipient_ids:
        try:
            async_to_sync(layer.group_send)(
                f"user_{uid}",
                {"type": "conversation.added", "conversation_id": conversation_id},
            )
        except Exception:
            logger.exception(
                "broadcast conversation.added failed: user=%s conv=%s",
                uid,
                conversation_id,
            )


def _system_message_body(event, **fields):
    """Serialize a system event into a JSON body the client can localise."""
    return json.dumps({"event": event, **fields})


def _emit_system_message(*, conversation, actor, event, **fields):
    """Persist a SYSTEM message (member changes, rename) and broadcast it on
    the conversation's WS group. ``actor`` is the user who triggered the
    event (e.g. the admin who removed someone)."""
    msg = Message(
        conversation=conversation,
        sender=actor,
        kind=MessageKind.SYSTEM,
        body=_system_message_body(event, **fields),
        created_by=actor,
    )
    msg.save()

    conversation.updated_by = actor
    conversation.save(update_fields=["updated_at", "updated_by"])

    transaction.on_commit(
        lambda cid=conversation.pk, mid=msg.pk, sid=actor.id, b=msg.body, ca=msg.created_at: _broadcast_message_event(
            conversation_id=cid,
            event_type="chat.message",
            payload={
                "id": mid,
                "sender_id": sid,
                "body": b,
                "file_url": None,
                "original_filename": "",
                "kind": MessageKind.SYSTEM,
                "created_at": ca.isoformat(),
            },
        )
    )
    return msg


def create_group_conversation(*, name, participant_ids, created_by):
    """Create an ad-hoc group conversation.

    Validation:
      - ``name`` required, ≤ 120 chars.
      - At least GROUP_MIN_MEMBERS distinct active participants (creator
        included). Below that, the user should use a DM.
      - At most GROUP_MAX_MEMBERS. Above that, request a larger cap.
      - Creator is automatically a participant and an admin.
    """
    from django.contrib.auth import get_user_model

    name = (name or "").strip()
    if not name:
        raise ValidationError({"name": ["GroupNameRequired"]})

    User = get_user_model()
    # Dedup, drop the creator, then add them back as admin.
    unique_others = {int(i) for i in participant_ids if int(i) != created_by.id}

    with transaction.atomic():
        others = list(
            User.objects.filter(pk__in=unique_others).select_for_update().order_by("pk")
        )
        if len(others) != len(unique_others):
            # Some ids didn't resolve to real users.
            raise ValidationError({"participant_ids": ["UnknownParticipant"]})

        total_members = len(others) + 1
        if total_members < GROUP_MIN_MEMBERS:
            raise ValidationError({"messages": ["GroupMinMembersNotMet"]})
        if total_members > GROUP_MAX_MEMBERS:
            raise ValidationError({"messages": ["GroupMaxMembersExceeded"]})

        conv = Conversation(
            kind=ConversationKind.GROUP,
            name=name,
            created_by=created_by,
        )
        conv.full_clean()
        conv.save()

        ConversationParticipant.objects.create(
            conversation=conv,
            user=created_by,
            is_admin=True,
            created_by=created_by,
        )
        for u in others:
            ConversationParticipant.objects.create(
                conversation=conv,
                user=u,
                is_admin=False,
                created_by=created_by,
            )

    # System message + per-user inbox refresh for all members (creator skipped
    # on the inbox bump — they're about to land on it).
    _emit_system_message(
        conversation=conv,
        actor=created_by,
        event="group_created",
        name=name,
    )
    transaction.on_commit(
        lambda cid=conv.pk, rids=[
            u.id for u in others
        ]: _notify_users_conversation_added(
            recipient_ids=rids,
            conversation_id=cid,
        )
    )
    logger.info(
        "create_group_conversation: %s by user %s with %d members",
        conv.pk,
        created_by.id,
        total_members,
    )
    return conv


def _require_group(conversation):
    if conversation.kind != ConversationKind.GROUP:
        raise ValidationError({"messages": ["NotAGroupConversation"]})


def _participant_for(conversation, user):
    try:
        return ConversationParticipant.objects.get(conversation=conversation, user=user)
    except ConversationParticipant.DoesNotExist:
        return None


def _require_admin(conversation, user):
    cp = _participant_for(conversation, user)
    if cp is None or not cp.is_admin:
        raise PermissionDenied({"messages": ["NotGroupAdmin"]})
    return cp


def _require_member(conversation, user):
    cp = _participant_for(conversation, user)
    if cp is None:
        raise PermissionDenied({"messages": ["NotGroupMember"]})
    return cp


def rename_conversation(*, conversation, name, updated_by):
    _require_group(conversation)
    _require_admin(conversation, updated_by)

    name = (name or "").strip()
    if not name:
        raise ValidationError({"name": ["GroupNameRequired"]})
    if name == conversation.name:
        return conversation

    old = conversation.name
    conversation.name = name
    conversation.updated_by = updated_by
    conversation.save(update_fields=["name", "updated_by", "updated_at"])

    _emit_system_message(
        conversation=conversation,
        actor=updated_by,
        event="renamed",
        old_name=old,
        new_name=name,
    )
    transaction.on_commit(
        lambda cid=conversation.pk, n=name: _broadcast_conversation_event(
            conversation_id=cid,
            event_type="conversation.renamed",
            payload={"id": cid, "name": n},
        )
    )
    logger.info(
        "rename_conversation: %s renamed by user %s",
        conversation.pk,
        updated_by.id,
    )
    return conversation


def add_participants(*, conversation, user_ids, added_by):
    """Add one or more users to a group conversation. Any active member can
    add — we trust the group to self-moderate growth (admin removal exists
    as the escape hatch). Idempotent for already-active participants.
    """
    from django.contrib.auth import get_user_model

    _require_group(conversation)
    _require_member(conversation, added_by)

    User = get_user_model()
    target_ids = {int(i) for i in user_ids if int(i) != added_by.id}
    targets = list(User.objects.filter(pk__in=target_ids).order_by("pk"))
    if len(targets) != len(target_ids):
        raise ValidationError({"user_ids": ["UnknownParticipant"]})

    existing_ids = set(
        ConversationParticipant.objects.filter(conversation=conversation).values_list(
            "user_id", flat=True
        )
    )
    new_targets = [u for u in targets if u.id not in existing_ids]
    if not new_targets:
        return []

    if (len(existing_ids) + len(new_targets)) > GROUP_MAX_MEMBERS:
        raise ValidationError({"messages": ["GroupMaxMembersExceeded"]})

    added = []
    with transaction.atomic():
        for u in new_targets:
            cp = ConversationParticipant.objects.filter(
                conversation=conversation, user=u
            ).first()
            if cp and cp.deleted_at is not None:
                # Soft-deleted previously — restore + clear admin flag.
                cp.restore()
                cp.is_admin = False
                cp.updated_by = added_by
                cp.save(update_fields=["is_admin", "updated_by", "updated_at"])
            elif cp is None:
                ConversationParticipant.objects.create(
                    conversation=conversation,
                    user=u,
                    is_admin=False,
                    created_by=added_by,
                )
            added.append(u)

    for u in added:
        _emit_system_message(
            conversation=conversation,
            actor=added_by,
            event="participant_added",
            target_id=u.id,
        )
        transaction.on_commit(
            lambda cid=conversation.pk, uid=u.id, by=added_by.id: _broadcast_conversation_event(
                conversation_id=cid,
                event_type="participant.added",
                payload={"conversation_id": cid, "user_id": uid, "added_by_id": by},
            )
        )

    transaction.on_commit(
        lambda cid=conversation.pk, rids=[
            u.id for u in added
        ]: _notify_users_conversation_added(
            recipient_ids=rids,
            conversation_id=cid,
        )
    )

    logger.info(
        "add_participants: %d added to conv %s by user %s",
        len(added),
        conversation.pk,
        added_by.id,
    )
    return added


def remove_participant(*, conversation, target_user, removed_by):
    """Admin removes a member from a group."""
    _require_group(conversation)
    _require_admin(conversation, removed_by)

    if target_user.id == removed_by.id:
        # Admin removing themself = leave_conversation.
        return leave_conversation(conversation=conversation, user=removed_by)

    cp = ConversationParticipant.objects.filter(
        conversation=conversation, user=target_user
    ).first()
    if cp is None:
        raise AppNotFound("ParticipantNotFound")

    cp.delete(deleted_by=removed_by)

    _emit_system_message(
        conversation=conversation,
        actor=removed_by,
        event="participant_removed",
        target_id=target_user.id,
    )
    transaction.on_commit(
        lambda cid=conversation.pk, uid=target_user.id, by=removed_by.id: _broadcast_conversation_event(
            conversation_id=cid,
            event_type="participant.removed",
            payload={"conversation_id": cid, "user_id": uid, "removed_by_id": by},
        )
    )
    # Tell the removed user's inbox to refresh (so the convo disappears).
    transaction.on_commit(
        lambda cid=conversation.pk, uid=target_user.id: _notify_users_conversation_added(
            recipient_ids=[uid],
            conversation_id=cid,
        )
    )
    logger.info(
        "remove_participant: user %s removed from conv %s by user %s",
        target_user.id,
        conversation.pk,
        removed_by.id,
    )


def leave_conversation(*, conversation, user):
    """Current user voluntarily leaves the conversation. If they were the
    last admin, the oldest remaining member is auto-promoted so the group
    never becomes admin-less.
    """
    _require_group(conversation)
    cp = _require_member(conversation, user)

    with transaction.atomic():
        was_admin = cp.is_admin
        cp.delete(deleted_by=user)

        if was_admin:
            remaining_admins = ConversationParticipant.objects.filter(
                conversation=conversation,
                is_admin=True,
            ).exists()
            if not remaining_admins:
                next_admin = (
                    ConversationParticipant.objects.filter(
                        conversation=conversation,
                    )
                    .order_by("created_at")
                    .first()
                )
                if next_admin is not None:
                    next_admin.is_admin = True
                    next_admin.updated_by = user
                    next_admin.save(
                        update_fields=["is_admin", "updated_by", "updated_at"]
                    )
                    _emit_system_message(
                        conversation=conversation,
                        actor=user,
                        event="admin_auto_promoted",
                        target_id=next_admin.user_id,
                    )

    _emit_system_message(
        conversation=conversation,
        actor=user,
        event="participant_left",
        target_id=user.id,
    )
    transaction.on_commit(
        lambda cid=conversation.pk, uid=user.id: _broadcast_conversation_event(
            conversation_id=cid,
            event_type="participant.removed",
            payload={"conversation_id": cid, "user_id": uid, "removed_by_id": uid},
        )
    )
    transaction.on_commit(
        lambda cid=conversation.pk, uid=user.id: _notify_users_conversation_added(
            recipient_ids=[uid],
            conversation_id=cid,
        )
    )
    logger.info(
        "leave_conversation: user %s left conv %s",
        user.id,
        conversation.pk,
    )


def get_user_for_conversation(*, user_id):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise AppNotFound("UserNotFound")
