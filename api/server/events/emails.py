import logging

from django.contrib.auth import get_user_model

from classes.models import ClasseMember
from core import emails as core_emails
from events.models import (
    EventClassTarget,
    NotificationDelivery,
    NotificationTarget,
)

logger = logging.getLogger(__name__)


def _distinct_registered_emails(*, event):
    seen_lower = set()
    result = []

    if event.notification_target == NotificationTarget.ALL:
        User = get_user_model()
        raw = (
            User.objects.exclude(email__isnull=True)
            .exclude(email="")
            .values_list("email", flat=True)
        )
    else:
        class_ids = EventClassTarget.objects.filter(event=event).values_list(
            "classe_id", flat=True
        )
        raw = (
            ClasseMember.objects.filter(
                classe_id__in=class_ids,
                deleted_at__isnull=True,
            )
            .select_related("student")
            .exclude(student__email__isnull=True)
            .exclude(student__email="")
            .values_list("student__email", flat=True)
        )

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


def _recipient_emails_for_delivery(*, requesting_user, delivery, event):
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
        return _distinct_registered_emails(event=event)

    return []


def notify_event_audience(*, event, requesting_user, delivery, subject, body):
    recipients = _recipient_emails_for_delivery(
        requesting_user=requesting_user,
        delivery=delivery,
        event=event,
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
        event=event,
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
        event=post.event,
        requesting_user=requesting_user,
        delivery=delivery,
        subject=post.title,
        body=post.body or "",
    )
