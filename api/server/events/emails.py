import logging

from django.contrib.auth import get_user_model

from core import emails as core_emails
from events.models import NotificationDelivery

logger = logging.getLogger(__name__)


def _distinct_registered_emails():
    User = get_user_model()
    raw = (
        User.objects.exclude(email__isnull=True)
        .exclude(email="")
        .values_list("email", flat=True)
    )
    seen_lower = set()
    result = []
    for addr in raw:
        n = addr.strip()
        if not n:
            continue
        key = n.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        result.append(n)
    return result


def _recipient_emails_for_delivery(*, requesting_user, delivery):
    if delivery == NotificationDelivery.NONE:
        return []

    if delivery == NotificationDelivery.NOTIFICATION_TEST:
        if not requesting_user or not getattr(requesting_user, "email", "").strip():
            logger.info(
                "Notification test skipped — requester has no email (user_id=%s)",
                getattr(requesting_user, "pk", None),
            )
            return []
        return [requesting_user.email.strip()]

    if delivery == NotificationDelivery.NOTIFICATION:
        return _distinct_registered_emails()

    return []


def notify_event_audience(*, requesting_user, delivery, subject, body):
    recipients = _recipient_emails_for_delivery(
        requesting_user=requesting_user,
        delivery=delivery,
    )
    if not recipients:
        return

    for addr in recipients:
        core_emails.send_simple_email(to=addr, subject=subject, body=body)

    logger.info(
        "Notification emails sent (count=%s, delivery=%s)",
        len(recipients),
        delivery,
    )


def send_event_notification_emails(*, event, requesting_user, delivery):
    """Subject = event title; body = event.body (rich text HTML allowed)."""
    if delivery == NotificationDelivery.NONE:
        return
    notify_event_audience(
        requesting_user=requesting_user,
        delivery=delivery,
        subject=event.title,
        body=event.body or "",
    )


def send_event_post_notification_emails(*, post, requesting_user, delivery):
    """Subject = post title; body = post.body."""
    if delivery == NotificationDelivery.NONE:
        return
    notify_event_audience(
        requesting_user=requesting_user,
        delivery=delivery,
        subject=post.title,
        body=post.body or "",
    )
