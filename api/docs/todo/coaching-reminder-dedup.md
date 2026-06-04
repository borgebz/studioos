# TODO — Coaching reminder deduplication

## Problem

`send_waiting_confirmation_reminders` (Celery, runs hourly) has no idempotency guard.
If the task runs twice inside the same 1-hour window (worker restart, clock drift), the
same reminder email is sent twice to the teacher and participants.

## Solution

Add a `CoachingReminder` model to track which reminder windows have already been sent.

### Model

```python
class CoachingReminder(BaseModel):
    coaching_class = models.ForeignKey(CoachingClass, on_delete=models.CASCADE, related_name="reminders")
    window_hours = models.PositiveIntegerField()  # matches _REMINDER_WINDOWS value (e.g. 24, 42)
    sent_at = models.DateTimeField()

    class Meta:
        db_table = "coaching_reminders"
        constraints = [
            models.UniqueConstraint(
                fields=["coaching_class", "window_hours"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_coaching_reminder_per_window",
            )
        ]
```

### Task change

Before sending, use `get_or_create` on the unique constraint as the deduplication gate:

```python
_, created = CoachingReminder.objects.get_or_create(
    coaching_class=coaching,
    window_hours=target_hours,
    defaults={"sent_at": now},
)
if not created:
    continue  # already sent this window
```

No `select_for_update` needed — the DB constraint handles concurrent races.
