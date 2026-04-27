import logging

from celery import shared_task
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_activation_email_task(self, user_id):
    """
    Send an account activation email to a newly created user.
    Retries up to 3 times with a 60-second delay on failure.
    """
    try:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            logger.warning(
                "send_activation_email_task: user %s not found, skipping.", user_id
            )
            return

        if user.is_active:
            logger.info(
                "send_activation_email_task: user %s already active, skipping.",
                user_id,
            )
            return

        from accounts.emails import send_activation_email

        send_activation_email(user)
        logger.info("send_activation_email_task: email sent to user %s.", user_id)

    except Exception as exc:
        logger.error(
            "send_activation_email_task failed for user %s: %s",
            user_id,
            exc,
            exc_info=True,
        )
        raise self.retry(exc=exc)
