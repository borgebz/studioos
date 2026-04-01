from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from core.emails import send_templated_email

# Reuse Django's built-in token generator.
# Tokens are one-time-use (invalidated when password changes)
# and time-limited (PASSWORD_RESET_TIMEOUT in settings, default 3 days).
account_activation_token = PasswordResetTokenGenerator()


def send_activation_email(user):
    """
    Send an account activation email to a newly created user.
    The link points to the frontend, which collects the new password
    and sends uid + token + password to the API activation endpoint.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = account_activation_token.make_token(user)

    activation_url = f"{settings.FRONTEND_URL}/activate/{uid}/{token}/"

    send_templated_email(
        to=user.email,
        subject="StudioOS",
        template_name="activation",
        language=user.language,
        context={
            "user": user,
            "activation_url": activation_url,
        },
    )
