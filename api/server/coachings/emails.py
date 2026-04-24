import logging

from django.conf import settings

from core.emails import send_templated_email

logger = logging.getLogger(__name__)

_SUBJECTS = {
    "coaching_approved": {
        "pt": "Aula Confirmada — StudioOS",
        "en": "Class Confirmed — StudioOS",
    },
    "coaching_cancelled": {
        "pt": "Aula Cancelada — StudioOS",
        "en": "Class Cancelled — StudioOS",
    },
    "coaching_new_request": {
        "pt": "Novo Pedido de Aula Particular — StudioOS",
        "en": "New Private Class Request — StudioOS",
    },
    "coaching_participant_cancelled": {
        "pt": "Cancelamento de Participante — StudioOS",
        "en": "Participant Cancellation — StudioOS",
    },
    "coaching_waiting_confirmation_reminder": {
        "pt": "Confirmação de Aula Pendente — StudioOS",
        "en": "Pending Class Confirmation — StudioOS",
    },
}


def _language(user):
    return getattr(user, "language", "pt") or "pt"


def _subject(template_name, language):
    return _SUBJECTS.get(template_name, {}).get(language, _SUBJECTS[template_name]["pt"])


def _coaching_context(coaching):
    return {
        "modality": coaching.modality.name if coaching.modality else "",
        "studio": coaching.studio.name if coaching.studio else "",
        "coaching_date": coaching.start_datetime.strftime("%d/%m/%Y %H:%M"),
        "coaching_url": f"{settings.FRONTEND_URL}/coachings/{coaching.pk}/",
        "total_price": coaching.total_price,
        "cancellation_reason": coaching.cancellation_reason or "",
    }


def send_coaching_approved_notification(*, coaching, recipient):
    """Notify a single recipient (participant or teacher) that the coaching was approved."""
    lang = _language(recipient)
    context = {**_coaching_context(coaching), "recipient": recipient}
    send_templated_email(
        to=recipient.email,
        subject=_subject("coaching_approved", lang),
        template_name="coaching_approved",
        context=context,
        language=lang,
    )
    logger.info(
        "Coaching approved notification sent: coaching=%s recipient=%s",
        coaching.pk,
        recipient.pk,
    )


def send_coaching_cancelled_notification(*, coaching, recipient):
    """Notify a single recipient (participant or teacher) that the coaching was cancelled."""
    lang = _language(recipient)
    context = {**_coaching_context(coaching), "recipient": recipient}
    send_templated_email(
        to=recipient.email,
        subject=_subject("coaching_cancelled", lang),
        template_name="coaching_cancelled",
        context=context,
        language=lang,
    )
    logger.info(
        "Coaching cancelled notification sent: coaching=%s recipient=%s",
        coaching.pk,
        recipient.pk,
    )


def send_new_coaching_request_notification(*, coaching, teacher):
    """Notify the teacher of a new coaching request."""
    lang = _language(teacher)
    requested_by = coaching.requested_by
    context = {
        **_coaching_context(coaching),
        "teacher": teacher,
        "requested_by": requested_by.full_name if requested_by else "",
    }
    send_templated_email(
        to=teacher.email,
        subject=_subject("coaching_new_request", lang),
        template_name="coaching_new_request",
        context=context,
        language=lang,
    )
    logger.info(
        "New coaching request notification sent: coaching=%s teacher=%s",
        coaching.pk,
        teacher.pk,
    )


def send_waiting_confirmation_reminder(*, coaching, teacher, is_final_reminder=False):
    """Send a confirmation reminder to the teacher for a coaching in WAITING_CONFIRMATION."""
    lang = _language(teacher)
    context = {
        **_coaching_context(coaching),
        "teacher": teacher,
        "is_final_reminder": is_final_reminder,
    }
    send_templated_email(
        to=teacher.email,
        subject=_subject("coaching_waiting_confirmation_reminder", lang),
        template_name="coaching_waiting_confirmation_reminder",
        context=context,
        language=lang,
    )
    logger.info(
        "Waiting confirmation reminder sent: coaching=%s teacher=%s final=%s",
        coaching.pk,
        teacher.pk,
        is_final_reminder,
    )


def send_participant_cancelled_notification(*, coaching, teacher, student, is_late_cancelled, cancellation_reason=""):
    """Notify the teacher that a participant cancelled their enrolment."""
    lang = _language(teacher)
    context = {
        **_coaching_context(coaching),
        "teacher": teacher,
        "student_name": student.full_name,
        "is_late_cancelled": is_late_cancelled,
        "cancellation_reason": cancellation_reason,
    }
    send_templated_email(
        to=teacher.email,
        subject=_subject("coaching_participant_cancelled", lang),
        template_name="coaching_participant_cancelled",
        context=context,
        language=lang,
    )
    logger.info(
        "Participant cancelled notification sent: coaching=%s teacher=%s student=%s late=%s",
        coaching.pk,
        teacher.pk,
        student.pk,
        is_late_cancelled,
    )
