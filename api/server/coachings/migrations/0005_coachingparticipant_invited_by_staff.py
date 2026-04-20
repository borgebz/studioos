from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coachings", "0004_alter_coachingparticipant_unique_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="coachingparticipant",
            name="invited_by_staff",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "True when a coordination/direction user invited this student "
                    "(invite → accept becomes active without a pending approval step)."
                ),
            ),
        ),
    ]
