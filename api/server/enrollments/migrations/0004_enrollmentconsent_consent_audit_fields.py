from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("enrollments", "0003_enrollmentfile_content_hash"),
    ]

    operations = [
        migrations.AddField(
            model_name="enrollmentconsent",
            name="policy_version",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="enrollmentconsent",
            name="locale",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AddField(
            model_name="enrollmentconsent",
            name="device",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
