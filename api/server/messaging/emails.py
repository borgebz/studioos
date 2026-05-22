import logging

from django.conf import settings

from core.emails import send_templated_email

logger = logging.getLogger(__name__)

_SUBJECTS = {
    "unread_messages_digest": {
        "pt": "Tem mensagens por ler — StudioOS",
        "en": "You have unread messages — StudioOS",
    },
}


def _language(user):
    return getattr(user, "language", "pt") or "pt"


def _subject(template_name, language):
    return _SUBJECTS.get(template_name, {}).get(
        language, _SUBJECTS[template_name]["pt"]
    )


def send_unread_messages_digest(*, recipient, messages):
    lang = _language(recipient)
    items = []
    for msg in messages:
        sender = msg.sender
        sender_name = (
            getattr(sender, "first_name", None)
            or getattr(sender, "email", None)
            or "—"
        )
        preview = (msg.body or "").strip()
        if not preview and msg.original_filename:
            preview = msg.original_filename
        if len(preview) > 140:
            preview = preview[:137] + "…"
        items.append(
            {
                "sender_name": sender_name,
                "preview": preview,
                "conversation_url": f"{settings.FRONTEND_URL}/messages/{msg.conversation_id}/",
                "created_at": msg.created_at,
            }
        )

    context = {
        "recipient": recipient,
        "messages": items,
        "messages_url": f"{settings.FRONTEND_URL}/messages/",
    }
    send_templated_email(
        to=recipient.email,
        subject=_subject("unread_messages_digest", lang),
        template_name="unread_messages_digest",
        context=context,
        language=lang,
    )
    logger.info(
        "Unread messages digest sent: recipient=%s count=%d",
        recipient.pk,
        len(items),
    )
