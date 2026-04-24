import json
import logging

from celery import shared_task
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def publish_scheduled_event(self, event_id, notification, triggered_by_user_id):
    """
    Fired by Celery Beat at the scheduled publication datetime.
    Guards against state changes: if the event is no longer SCHEDULED
    (manually published, cancelled, archived), skips silently.
    """
    try:
        from events.models import Event, EventVisibilityState
        from events.services import get_event, publish_event

        try:
            event = get_event(pk=event_id)
        except Exception:
            logger.warning(
                "publish_scheduled_event: event %s not found, skipping.", event_id
            )
            return

        if event.visibility_state != EventVisibilityState.SCHEDULED:
            logger.info(
                "publish_scheduled_event: event %s is no longer SCHEDULED (state=%s), skipping.",
                event_id,
                event.visibility_state,
            )
            return

        try:
            triggered_by = User.objects.get(pk=triggered_by_user_id)
        except User.DoesNotExist:
            triggered_by = None

        publish_event(event=event, updated_by=triggered_by, notification=notification)
        logger.info(
            "publish_scheduled_event: event %s published (notification=%s).",
            event_id,
            notification,
        )
    except Exception as exc:
        logger.error(
            "publish_scheduled_event failed for event %s: %s",
            event_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def publish_scheduled_post(self, post_id, notification, triggered_by_user_id):
    """
    Fired by Celery Beat at the scheduled publication datetime.
    Guards against state changes: if the post is already published or deleted, skips silently.
    """
    try:
        from events.models import EventPost
        from events.services import publish_post

        try:
            post = EventPost.objects.select_related("event").get(pk=post_id)
        except EventPost.DoesNotExist:
            logger.warning(
                "publish_scheduled_post: post %s not found, skipping.", post_id
            )
            return

        if post.published_at is not None:
            logger.info(
                "publish_scheduled_post: post %s already published, skipping.", post_id
            )
            return

        if post.publication_scheduled_at is None:
            logger.info(
                "publish_scheduled_post: post %s schedule was cleared, skipping.",
                post_id,
            )
            return

        try:
            triggered_by = User.objects.get(pk=triggered_by_user_id)
        except User.DoesNotExist:
            triggered_by = None

        publish_post(post=post, updated_by=triggered_by, notification=notification)
        logger.info(
            "publish_scheduled_post: post %s published (notification=%s).",
            post_id,
            notification,
        )
    except Exception as exc:
        logger.error(
            "publish_scheduled_post failed for post %s: %s",
            post_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)
