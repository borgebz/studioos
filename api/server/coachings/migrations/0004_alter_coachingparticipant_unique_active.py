# Generated manually — allow re-enrolment after cancelled / late_cancelled.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "coachings",
            "0003_coachingclass_cancelled_at_coachingclass_rejected_at_and_more",
        ),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="coachingparticipant",
            name="unique_active_coaching_participant",
        ),
        migrations.AddConstraint(
            model_name="coachingparticipant",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True)
                & ~models.Q(
                    status__in=[
                        "cancelled",
                        "late_cancelled",
                    ]
                ),
                fields=("coaching_class", "student"),
                name="unique_active_coaching_participant",
            ),
        ),
    ]
