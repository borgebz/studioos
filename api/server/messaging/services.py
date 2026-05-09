import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from .models import Conversation, ConversationParticipant, Message

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
