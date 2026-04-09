import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

DEFAULT_LANGUAGE = "pt"


def send_templated_email(*, to, subject, template_name, context=None, language=None):
    """
    Send an email using Django templates, resolved by language.

    Args:
        to: email address or list of email addresses
        subject: email subject line
        template_name: base name without extension (e.g. "activation")
                       resolves to emails/{language}/{template_name}.txt/.html
        context: dict of template context variables
        language: language code (e.g. "pt", "en"). Defaults to DEFAULT_LANGUAGE.
    """
    if isinstance(to, str):
        to = [to]

    context = context or {}
    language = language or DEFAULT_LANGUAGE

    template_path = f"emails/{language}/{template_name}"
    text_body = render_to_string(f"{template_path}.txt", context)
    html_body = render_to_string(f"{template_path}.html", context)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
    )
    email.attach_alternative(html_body, "text/html")

    try:
        email.send()
        logger.info("Email sent to %s: %s", to, subject)
    except Exception:
        logger.exception("Failed to send email to %s: %s", to, subject)
        # Do not re-raise: email failure should not abort the caller.
        # The exception is fully logged above for monitoring and alerting.
