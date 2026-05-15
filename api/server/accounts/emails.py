from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from core.emails import send_templated_email

# Reuse Django's built-in token generator.
# Tokens are one-time-use (invalidated when password changes)
# and time-limited (PASSWORD_RESET_TIMEOUT in settings, default 3 days).
account_activation_token = PasswordResetTokenGenerator()


def send_invite_email(*, user, token):
    """
    Invite email with onboarding link (Redis UUID token, 7-day TTL managed by the caller/store).
    """
    onboarding_url = f"{settings.FRONTEND_URL}/onboarding/{token}/"

    group = user.groups.select_related("role").first()
    role_display = group.name if group is not None else ""

    send_templated_email(
        to=user.email,
        subject="StudioOS",
        template_name="invite",
        language=user.language,
        context={
            "invitee_email": user.email,
            "role_display": role_display,
            "onboarding_url": onboarding_url,
            "expires_days": 7,
        },
    )


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


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = account_activation_token.make_token(user)

    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    send_templated_email(
        to=user.email,
        subject="StudioOS",
        template_name="password_reset",
        language=user.language,
        context={
            "user": user,
            "reset_url": reset_url,
        },
    )
