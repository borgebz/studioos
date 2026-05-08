import logging

from celery import shared_task
from django.conf import settings
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
                "notify_participant_cancelled: participant %s not found.",
                participant_id,
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
                CoachingClass.objects.select_related("teacher", "modality", "studio")
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_coaching_approved: coaching %s not found.", coaching_id
            )
            return

        recipients = set()
        for p in coaching.participants.all():
            if p.status in _NOTIFY_STATUSES:
                recipients.add(p.student)

        for recipient in recipients:
            send_coaching_approved_notification(coaching=coaching, recipient=recipient)

        # Notify teacher separately with their own language
        send_coaching_approved_notification(
            coaching=coaching, recipient=coaching.teacher
        )

        logger.info(
            "notify_coaching_approved: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error(
            "notify_coaching_approved failed for coaching %s: %s",
            coaching_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_coaching_cancelled(self, coaching_id):
    """
    Notify all participants and the teacher that the coaching has been cancelled.
    Participants will already be in CANCELLED status (cascaded by cancel_coaching),
    so we notify all of them regardless of status — excluding only LATE_CANCELLED rows
    which had already exited before the coaching was cancelled.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipantStatus
        from coachings.emails import send_coaching_cancelled_notification

        try:
            coaching = (
                CoachingClass.objects.select_related("teacher", "modality", "studio")
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_coaching_cancelled: coaching %s not found.", coaching_id
            )
            return

        recipients = set()
        for p in coaching.participants.all():
            if p.status != CoachingParticipantStatus.LATE_CANCELLED:
                recipients.add(p.student)

        for recipient in recipients:
            send_coaching_cancelled_notification(coaching=coaching, recipient=recipient)

        send_coaching_cancelled_notification(
            coaching=coaching, recipient=coaching.teacher
        )

        logger.info(
            "notify_coaching_cancelled: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error(
            "notify_coaching_cancelled failed for coaching %s: %s",
            coaching_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_coaching_completed(self, coaching_id):
    """
    Notify attended and absent participants, and the teacher, that the session
    has been completed and billing entries / fine candidates have been generated.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipantStatus
        from coachings.emails import send_coaching_completed_notification

        _NOTIFY_STATUSES = {
            CoachingParticipantStatus.ATTENDED,
            CoachingParticipantStatus.ABSENT,
        }

        try:
            coaching = (
                CoachingClass.objects.select_related("teacher", "modality", "studio")
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_coaching_completed: coaching %s not found.", coaching_id
            )
            return

        recipients = set()
        for p in coaching.participants.all():
            if p.status in _NOTIFY_STATUSES:
                recipients.add(p.student)

        for recipient in recipients:
            send_coaching_completed_notification(coaching=coaching, recipient=recipient)

        send_coaching_completed_notification(
            coaching=coaching, recipient=coaching.teacher
        )

        logger.info(
            "notify_coaching_completed: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error(
            "notify_coaching_completed failed for coaching %s: %s",
            coaching_id,
            exc,
            exc_info=True,
        )
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
            coaching = CoachingClass.objects.select_related(
                "teacher", "modality", "studio", "requested_by"
            ).get(pk=coaching_id)
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_new_coaching_request: coaching %s not found.", coaching_id
            )
            return

        send_new_coaching_request_notification(
            coaching=coaching, teacher=coaching.teacher
        )
        logger.info(
            "notify_new_coaching_request: notified teacher for coaching %s.",
            coaching_id,
        )
    except Exception as exc:
        logger.error(
            "notify_new_coaching_request failed for coaching %s: %s",
            coaching_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_coordination_coaching_created(self, coaching_id):
    """
    Notify the teacher and all participants that a coordination coaching was created.
    For recurring series, only the anchor coaching triggers this task — the notification
    mentions the total session count so recipients aren't spammed per session.
    """
    try:
        from coachings.models import CoachingClass, CoachingParticipantStatus, CoachingStatus
        from coachings.emails import send_coordination_coaching_created_notification

        _NOTIFY_STATUSES = {
            CoachingParticipantStatus.ACTIVE,
            CoachingParticipantStatus.INVITED,
        }

        try:
            coaching = (
                CoachingClass.objects.select_related(
                    "teacher", "modality", "studio", "recurring_coaching"
                )
                .prefetch_related("participants__student")
                .get(pk=coaching_id)
            )
        except CoachingClass.DoesNotExist:
            logger.warning(
                "notify_coordination_coaching_created: coaching %s not found.",
                coaching_id,
            )
            return

        is_scheduled = coaching.status == CoachingStatus.SCHEDULED
        is_recurring = coaching.recurring_coaching_id is not None
        total_sessions = 1
        if is_recurring:
            total_sessions = CoachingClass.objects.filter(
                recurring_coaching_id=coaching.recurring_coaching_id,
            ).count()

        recipients = set()
        for p in coaching.participants.all():
            if p.status in _NOTIFY_STATUSES:
                recipients.add(p.student)

        for recipient in recipients:
            send_coordination_coaching_created_notification(
                coaching=coaching,
                recipient=recipient,
                is_scheduled=is_scheduled,
                is_recurring=is_recurring,
                total_sessions=total_sessions,
            )

        send_coordination_coaching_created_notification(
            coaching=coaching,
            recipient=coaching.teacher,
            is_scheduled=is_scheduled,
            is_recurring=is_recurring,
            total_sessions=total_sessions,
        )

        logger.info(
            "notify_coordination_coaching_created: notified %d recipient(s) + teacher for coaching %s.",
            len(recipients),
            coaching_id,
        )
    except Exception as exc:
        logger.error(
            "notify_coordination_coaching_created failed for coaching %s: %s",
            coaching_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_waiting_confirmation_reminders(self):
    """
    Runs every hour. For each coaching in WAITING_CONFIRMATION, sends reminders
    at the 24h and 42h marks after end_datetime to whoever has not yet confirmed:
    - Teacher, if teacher_confirmed_at is still null.
    - Each ACTIVE participant who has not yet moved to ATTENDED or ABSENT.
    """
    try:
        from coachings.models import (
            CoachingClass,
            CoachingParticipantStatus,
            CoachingStatus,
        )
        from coachings.emails import (
            send_waiting_confirmation_reminder,
            send_attendance_confirmation_reminder,
        )

        now = timezone.now()
        sent = 0

        pending = (
            CoachingClass.objects.filter(
                status=CoachingStatus.WAITING_CONFIRMATION,
            )
            .select_related("teacher", "modality", "studio")
            .prefetch_related("participants__student")
        )

        for coaching in pending:
            hours_since_end = (now - coaching.end_datetime).total_seconds() / 3600

            in_window = False
            is_final = False
            for target_hours, _is_final in settings.COACHING_REMINDER_WINDOWS:
                if target_hours <= hours_since_end < target_hours + 1:
                    in_window = True
                    is_final = _is_final
                    break

            if not in_window:
                continue

            # Notify teacher if not yet confirmed.
            if coaching.teacher_confirmed_at is None:
                send_waiting_confirmation_reminder(
                    coaching=coaching,
                    teacher=coaching.teacher,
                    is_final_reminder=is_final,
                )
                sent += 1
                logger.info(
                    "Reminder sent to teacher: coaching=%s hours_since_end=%.1f final=%s",
                    coaching.pk,
                    hours_since_end,
                    is_final,
                )

            # Notify each PENDING_COMPLETION participant who has not yet confirmed attendance.
            for participant in coaching.participants.all():
                if participant.status == CoachingParticipantStatus.PENDING_COMPLETION:
                    send_attendance_confirmation_reminder(
                        coaching=coaching,
                        recipient=participant.student,
                        is_final_reminder=is_final,
                    )
                    sent += 1
                    logger.info(
                        "Reminder sent to participant: coaching=%s student=%s hours_since_end=%.1f final=%s",
                        coaching.pk,
                        participant.student_id,
                        hours_since_end,
                        is_final,
                    )

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
