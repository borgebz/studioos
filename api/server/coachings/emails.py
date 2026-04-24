import logging

from django.conf import settings

from core.emails import send_templated_email

logger = logging.getLogger(__name__)


def send_waiting_confirmation_reminder(*, coaching, teacher, is_final_reminder=False):
    """
    Send a confirmation reminder to the teacher for a coaching in WAITING_CONFIRMATION.
    Uses the teacher's preferred language.
    """
    coaching_url = f"{settings.FRONTEND_URL}/coachings/{coaching.pk}/"

    coaching_date = coaching.end_datetime.strftime("%d/%m/%Y %H:%M")

    context = {
        "teacher": teacher,
        "modality": coaching.modality.name if coaching.modality else "",
        "studio": coaching.studio.name if coaching.studio else "",
        "coaching_date": coaching_date,
        "coaching_url": coaching_url,
        "is_final_reminder": is_final_reminder,
    }

    subjects = {
        "pt": "Confirmação de Aula Pendente — StudioOS",
        "en": "Pending Class Confirmation — StudioOS",
    }

    language = getattr(teacher, "language", "pt") or "pt"
    subject = subjects.get(language, subjects["pt"])

    send_templated_email(
        to=teacher.email,
        subject=subject,
        template_name="coaching_waiting_confirmation_reminder",
        context=context,
        language=language,
    )

    logger.info(
        "Waiting confirmation reminder sent: coaching=%s teacher=%s final=%s",
        coaching.pk,
        teacher.pk,
        is_final_reminder,
    )
