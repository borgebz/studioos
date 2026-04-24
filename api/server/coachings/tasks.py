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
def notify_participant_cancelled(self, participant_id, coaching_id, is_late_cancelled):
    """
    Notify the teacher that a participant cancelled their enrolment.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipant
        from coachings.emails import send_participant_cancelled_notification

        try:
            coaching = CoachingClass.objects.select_related(
                "teacher", "modality", "studio"
            ).get(pk=coaching_id)
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_participant_cancelled: coaching %s not found.", coaching_id
            )
            return

        try:
            participant = CoachingParticipant.objects.select_related("student").get(
                pk=participant_id
            )
        except CoachingParticipant.DoesNotExist:
            logger.warning(
                "notify_participant_cancelled: participant %s not found.", participant_id
            )
            return

        send_participant_cancelled_notification(
            coaching=coaching,
            teacher=coaching.teacher,
            student=participant.student,
            is_late_cancelled=is_late_cancelled,
            cancellation_reason=participant.cancellation_reason or "",
        )
        logger.info(
            "notify_participant_cancelled: teacher notified for coaching=%s participant=%s.",
            coaching_id,
            participant_id,
        )
    except Exception as exc:
        logger.error(
            "notify_participant_cancelled failed for participant %s: %s",
            participant_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_coaching_approved(self, coaching_id):
    """
    Notify all active/pending/invited participants and the teacher
    that the coaching has been approved and scheduled.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipantStatus
        from coachings.emails import send_coaching_approved_notification

        _NOTIFY_STATUSES = {
            CoachingParticipantStatus.ACTIVE,
            CoachingParticipantStatus.PENDING,
            CoachingParticipantStatus.INVITED,
        }

        try:
            coaching = (
                CoachingClass.objects
                .select_related("teacher", "modality", "studio")
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning("notify_coaching_approved: coaching %s not found.", coaching_id)
            return

        recipients = set()
        for p in coaching.participants.all():
            if p.status in _NOTIFY_STATUSES:
                recipients.add(p.student)

        for recipient in recipients:
            send_coaching_approved_notification(coaching=coaching, recipient=recipient)

        # Notify teacher separately with their own language
        send_coaching_approved_notification(coaching=coaching, recipient=coaching.teacher)

        logger.info(
            "notify_coaching_approved: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error("notify_coaching_approved failed for coaching %s: %s", coaching_id, exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_coaching_cancelled(self, coaching_id):
    """
    Notify all non-cancelled participants and the teacher
    that the coaching has been cancelled.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipantStatus
        from coachings.emails import send_coaching_cancelled_notification

        _EXCLUDED_STATUSES = {
            CoachingParticipantStatus.CANCELLED,
            CoachingParticipantStatus.LATE_CANCELLED,
        }

        try:
            coaching = (
                CoachingClass.objects
                .select_related("teacher", "modality", "studio")
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning("notify_coaching_cancelled: coaching %s not found.", coaching_id)
            return

        recipients = set()
        for p in coaching.participants.all():
            if p.status not in _EXCLUDED_STATUSES:
                recipients.add(p.student)

        for recipient in recipients:
            send_coaching_cancelled_notification(coaching=coaching, recipient=recipient)

        send_coaching_cancelled_notification(coaching=coaching, recipient=coaching.teacher)

        logger.info(
            "notify_coaching_cancelled: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error("notify_coaching_cancelled failed for coaching %s: %s", coaching_id, exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_new_coaching_request(self, coaching_id):
    """
    Notify the assigned teacher that a new coaching request has been submitted.
    """
    try:
        from coachings.models import CoachingClass
        from coachings.emails import send_new_coaching_request_notification

        try:
            coaching = (
                CoachingClass.objects
                .select_related("teacher", "modality", "studio", "requested_by")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning("notify_new_coaching_request: coaching %s not found.", coaching_id)
            return

        send_new_coaching_request_notification(coaching=coaching, teacher=coaching.teacher)
        logger.info("notify_new_coaching_request: notified teacher for coaching %s.", coaching_id)
    except Exception as exc:
        logger.error("notify_new_coaching_request failed for coaching %s: %s", coaching_id, exc, exc_info=True)
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
