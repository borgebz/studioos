from django.db import migrations


def backfill_kind(apps, schema_editor):
    """Existing conversations were created before ``kind`` existed.

    Infer from the linked FK:
      - has coaching / recurring_coaching → 'coaching'
      - has listing → 'listing'
      - otherwise → 'direct' (the old default)
    """
    Conversation = apps.get_model("messaging", "Conversation")
    Conversation.objects.filter(coaching__isnull=False).update(kind="coaching")
    Conversation.objects.filter(
        coaching__isnull=True, recurring_coaching__isnull=False
    ).update(kind="coaching")
    Conversation.objects.filter(
        coaching__isnull=True,
        recurring_coaching__isnull=True,
        listing__isnull=False,
    ).update(kind="listing")
    # Direct is already the default for the rest — explicit pass for safety.
    Conversation.objects.filter(
        coaching__isnull=True,
        recurring_coaching__isnull=True,
        listing__isnull=True,
    ).update(kind="direct")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0008_conversation_kind_conversation_name_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_kind, noop_reverse),
    ]
