from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0004_seed_unread_digest_task"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
