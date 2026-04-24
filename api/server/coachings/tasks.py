import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def advance_scheduled_to_waiting_confirmation(self):
    """
    Periodically move coachings from SCHEDULED to WAITING_CONFIRMATION
    when their end_datetime has passed.
    """
    try:
        from coachings.services import advance_scheduled_to_waiting_confirmation_batch

        now = timezone.now()
        count = advance_scheduled_to_waiting_confirmation_batch(now=now)
        logger.info(
            "advance_scheduled_to_waiting_confirmation: advanced %d coaching(s) at %s",
            count,
            now.isoformat(),
        )
        return count
    except Exception as exc:
        logger.error(
            "advance_scheduled_to_waiting_confirmation failed: %s", exc, exc_info=True
        )
        raise self.retry(exc=exc)
