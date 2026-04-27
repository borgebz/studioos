from django.db import migrations


def seed_periodic_tasks(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=5,
        period="minutes",
    )

    PeriodicTask.objects.get_or_create(
        name="advance_scheduled_to_waiting_confirmation",
        defaults={
            "task": "coachings.tasks.advance_scheduled_to_waiting_confirmation",
            "interval": schedule,
            "enabled": True,
        },
    )


def remove_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="advance_scheduled_to_waiting_confirmation"
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("coachings", "0007_coachingparticipant_dependent_attendance_perm"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(seed_periodic_tasks, remove_periodic_tasks),
    ]
