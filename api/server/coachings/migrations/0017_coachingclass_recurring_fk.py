import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coachings", "0016_alter_coachingclass_is_billable"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coachingclass",
            name="recurring_coaching",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sessions",
                to="coachings.recurringcoaching",
                help_text="Links this session to a recurrence series.",
            ),
        ),
    ]
