# Generated manually — links recurring rows to CoachingClass; clears legacy recurring rows.

import django.db.models.deletion
from django.db import migrations, models


def clear_recurring_rows(apps, schema_editor):
    RecurringCoaching = apps.get_model("coachings", "RecurringCoaching")
    RecurringCoaching.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("coachings", "0012_remove_recurringcoaching_modality_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="coachingclass",
            name="is_coordination_schedule",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "True when this coaching was created via coordination direct scheduling "
                    "(scheduled endpoint), not via student request + approval."
                ),
            ),
        ),
        migrations.AddField(
            model_name="coachingclass",
            name="is_schedule",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When is_coordination_schedule: roster mode — True fills ACTIVE "
                    "participants from enrollments; False uses staff-invite (INVITED) for that roster."
                ),
            ),
        ),
        migrations.AddField(
            model_name="coachingclass",
            name="is_recurring",
            field=models.BooleanField(
                default=False,
                help_text="True when a RecurringCoaching row defines the repetition pattern.",
            ),
        ),
        migrations.AlterModelOptions(
            name="coachingclass",
            options={
                "ordering": ["start_datetime"],
                "permissions": [
                    (
                        "can_accept_coaching_as_teacher",
                        "Can accept coaching requests as the assigned teacher",
                    ),
                    (
                        "can_reject_coaching_as_teacher",
                        "Can reject coaching requests as the assigned teacher",
                    ),
                    (
                        "can_schedule_coaching",
                        "Can create coachings via coordination scheduling (direct schedule)",
                    ),
                ],
            },
        ),
        migrations.AddField(
            model_name="recurringcoaching",
            name="coaching_class",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recurring_definition",
                to="coachings.coachingclass",
            ),
        ),
        migrations.RunPython(clear_recurring_rows, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="recurringcoaching",
            name="end_datetime",
        ),
        migrations.RemoveField(
            model_name="recurringcoaching",
            name="start_datetime",
        ),
        migrations.AlterField(
            model_name="recurringcoaching",
            name="coaching_class",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recurring_definition",
                to="coachings.coachingclass",
            ),
        ),
        migrations.AlterModelOptions(
            name="recurringcoaching",
            options={"ordering": ["id"]},
        ),
    ]
