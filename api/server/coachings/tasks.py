import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Reminder windows in hours after coaching end_datetime.
_REMINDER_WINDOWS = [
    (24, False),  # first reminder at 24h — (hours_since_end, is_final_reminder)
    (42, True),   # final reminder at 42h
]


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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_waiting_confirmation_reminders(self):
    """
    Runs every hour. For each coaching in WAITING_CONFIRMATION with no teacher
    confirmation, sends a reminder at the 24h and 42h marks after end_datetime.
    Each window is 1 hour wide (hours_since_end >= target and < target + 1).
    """
    try:
        from coachings.models import CoachingClass, CoachingStatus
        from coachings.emails import send_waiting_confirmation_reminder
        from django.contrib.auth import get_user_model

        User = get_user_model()
        now = timezone.now()
        sent = 0

        pending = CoachingClass.objects.filter(
            status=CoachingStatus.WAITING_CONFIRMATION,
            teacher_confirmed_at__isnull=True,
        ).select_related("teacher", "modality", "studio")

        for coaching in pending:
            hours_since_end = (now - coaching.end_datetime).total_seconds() / 3600

            for target_hours, is_final in _REMINDER_WINDOWS:
                if target_hours <= hours_since_end < target_hours + 1:
                    send_waiting_confirmation_reminder(
                        coaching=coaching,
                        teacher=coaching.teacher,
                        is_final_reminder=is_final,
                    )
                    sent += 1
                    logger.info(
                        "Reminder sent: coaching=%s teacher=%s hours_since_end=%.1f final=%s",
                        coaching.pk,
                        coaching.teacher_id,
                        hours_since_end,
                        is_final,
                    )
                    break

        logger.info(
            "send_waiting_confirmation_reminders: %d reminder(s) sent at %s",
            sent,
            now.isoformat(),
        )
        return sent

    except Exception as exc:
        logger.error(
            "send_waiting_confirmation_reminders failed: %s", exc, exc_info=True
        )
        raise self.retry(exc=exc)
