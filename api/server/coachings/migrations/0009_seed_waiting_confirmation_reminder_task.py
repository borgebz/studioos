from django.db import migrations


def seed_periodic_tasks(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=1,
        period="hours",
    )

    PeriodicTask.objects.get_or_create(
        name="send_waiting_confirmation_reminders",
        defaults={
            "task": "coachings.tasks.send_waiting_confirmation_reminders",
            "interval": schedule,
            "enabled": True,
        },
    )


def remove_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name="send_waiting_confirmation_reminders").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("coachings", "0008_seed_periodic_tasks"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(seed_periodic_tasks, remove_periodic_tasks),
    ]
