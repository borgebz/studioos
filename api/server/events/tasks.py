import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_event_notification_emails_task(self, event_id, requesting_user_id, delivery):
    """
    Send notification emails to the event audience after publication.
    """
    try:
        from django.contrib.auth import get_user_model
        from events.models import Event
        from events.emails import send_event_notification_emails

        User = get_user_model()

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            logger.warning(
                "send_event_notification_emails_task: event %s not found, skipping.",
                event_id,
            )
            return

        try:
            requesting_user = User.objects.get(pk=requesting_user_id)
        except User.DoesNotExist:
            requesting_user = None

        send_event_notification_emails(
            event=event,
            requesting_user=requesting_user,
            delivery=delivery,
        )
        logger.info(
            "send_event_notification_emails_task: emails sent for event %s (delivery=%s).",
            event_id,
            delivery,
        )
    except Exception as exc:
        logger.error(
            "send_event_notification_emails_task failed for event %s: %s",
            event_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_event_post_notification_emails_task(
    self, post_id, requesting_user_id, delivery
):
    """
    Send notification emails to the event audience after post publication.
    """
    try:
        from django.contrib.auth import get_user_model
        from events.models import EventPost
        from events.emails import send_event_post_notification_emails

        User = get_user_model()

        try:
            post = EventPost.objects.select_related("event").get(pk=post_id)
        except EventPost.DoesNotExist:
            logger.warning(
                "send_event_post_notification_emails_task: post %s not found, skipping.",
                post_id,
            )
            return

        try:
            requesting_user = User.objects.get(pk=requesting_user_id)
        except User.DoesNotExist:
            requesting_user = None

        send_event_post_notification_emails(
            post=post,
            requesting_user=requesting_user,
            delivery=delivery,
        )
        logger.info(
            "send_event_post_notification_emails_task: emails sent for post %s (delivery=%s).",
            post_id,
            delivery,
        )
    except Exception as exc:
        logger.error(
            "send_event_post_notification_emails_task failed for post %s: %s",
            post_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)
