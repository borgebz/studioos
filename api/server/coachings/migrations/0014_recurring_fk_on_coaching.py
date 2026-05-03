# Recurring pattern linked from CoachingClass; drop boolean flags and RecurringCoaching.coaching_class.

import django.db.models.deletion
from django.db import migrations, models


def link_recurring_to_coaching(apps, schema_editor):
    RecurringCoaching = apps.get_model("coachings", "RecurringCoaching")
    CoachingClass = apps.get_model("coachings", "CoachingClass")
    for r in RecurringCoaching.objects.exclude(coaching_class_id__isnull=True):
        CoachingClass.objects.filter(pk=r.coaching_class_id).update(
            recurring_coaching_id=r.pk
        )


def noop_rev(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("coachings", "0013_coordination_schedule_and_recurring"),
    ]

    operations = [
        migrations.AddField(
            model_name="coachingclass",
            name="recurring_coaching",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="anchored_coaching_class",
                to="coachings.recurringcoaching",
                help_text=(
                    "When set, this session anchors a recurrence pattern (same row implies recurring)."
                ),
            ),
        ),
        migrations.RunPython(link_recurring_to_coaching, noop_rev),
        migrations.RemoveField(
            model_name="recurringcoaching",
            name="coaching_class",
        ),
        migrations.RemoveField(
            model_name="coachingclass",
            name="is_coordination_schedule",
        ),
        migrations.RemoveField(
            model_name="coachingclass",
            name="is_schedule",
        ),
        migrations.RemoveField(
            model_name="coachingclass",
            name="is_recurring",
        ),
    ]
