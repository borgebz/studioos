import logging
from collections import defaultdict
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_unread_message_digests(self):
    """Daily digest of unread messages.

    Selects messages created between 24h ago and 12h ago that the recipient
    has not yet read, groups them by recipient, and sends one email per
    recipient. The 12h-24h window doubles as a dedup mechanism: a message
    falls inside the window for exactly one daily run.
    """
    try:
        from messaging.models import Message
        from messaging.emails import send_unread_messages_digest

        now = timezone.now()
        window_start = now - timedelta(hours=24)
        window_end = now - timedelta(hours=12)

        messages = (
            Message.objects.filter(
                created_at__gte=window_start,
                created_at__lte=window_end,
            )
            .select_related("sender", "conversation")
            .prefetch_related("conversation__participants", "read_by")
        )

        by_recipient = defaultdict(list)
        for msg in messages:
            read_by_ids = {u.id for u in msg.read_by.all()}
            for participant in msg.conversation.participants.all():
                if participant.id == msg.sender_id:
                    continue
                if participant.id in read_by_ids:
                    continue
                if not getattr(participant, "email", None):
                    continue
                by_recipient[participant].append(msg)

        sent = 0
        for recipient, msgs in by_recipient.items():
            msgs.sort(key=lambda m: m.created_at)
            send_unread_messages_digest(recipient=recipient, messages=msgs)
            sent += 1

        logger.info(
            "send_unread_message_digests: %d digest(s) sent for %d message(s) "
            "in window [%s, %s]",
            sent,
            messages.count(),
            window_start.isoformat(),
            window_end.isoformat(),
        )
        return sent
    except Exception as exc:
        logger.error("send_unread_message_digests failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
