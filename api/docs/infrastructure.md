# Infrastructure

## Docker services

| Service | Role | Local port |
|---------|------|-----------|
| `api` | Django dev server | 8000 |
| `db` | PostgreSQL | 5432 |
| `redis` | Celery broker + future cache | 6379 |
| `worker` | Celery worker | — |
| `beat` | Celery Beat (periodic scheduler) | — |
| `mailpit` | Dev SMTP capture | 1025 (SMTP), 8025 (UI) |

---

## Common commands

### First-time setup

```bash
docker compose up --build

# second terminal
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py seed_permissions
docker compose exec api uv run python manage.py seed_roles
docker compose exec api uv run python manage.py seed_modalities
docker compose exec api uv run python manage.py bootstrap_user \
  --email dev@test.com --password '123456' --role direction
```

### After pulling new code

```bash
docker compose up --build   # only if pyproject.toml or Dockerfile changed
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py seed_permissions
docker compose exec api uv run python manage.py seed_roles
docker compose exec api uv run python manage.py seed_modalities
```

### Daily development

```bash
docker compose up           # start all services
docker compose logs -f api  # tail API logs
docker compose exec api bash # shell inside container
```

---

## Celery architecture

```
Django (api)
  └── .delay() → writes task to Redis

Redis (broker)
  └── holds the task queue

Celery Worker
  └── watches Redis → picks up task → executes

Celery Beat
  └── reads schedule from Postgres (django-celery-beat tables)
  └── triggers periodic tasks → writes to Redis
```

### Task definition

Always `@shared_task` — never import the Celery app directly in tasks:

```python
# coachings/tasks.py
from celery import shared_task

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def advance_coaching_status_task(self):
    try:
        advance_scheduled_to_waiting_confirmation()
    except Exception as exc:
        raise self.retry(exc=exc)
```

### Periodic task registration — always via data migration

```python
def seed_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    schedule, _ = IntervalSchedule.objects.get_or_create(every=5, period="minutes")
    PeriodicTask.objects.update_or_create(
        name="advance-scheduled-to-waiting-confirmation",
        defaults={
            "task": "coachings.tasks.advance_coaching_status_task",
            "interval": schedule,
            "enabled": True,
        },
    )
```

Never register via Django admin. Always via `migrations.RunPython`.

### Calling tasks from services

```python
# Correct — inside on_commit with default-argument capture
transaction.on_commit(lambda uid=user.pk: send_welcome_email_task.delay(uid))

# Wrong — inside transaction (fires even on rollback)
send_welcome_email_task.delay(user.pk)

# Wrong — closure bug (captures variable by reference)
transaction.on_commit(lambda: send_welcome_email_task.delay(user.pk))
```

---

## Redis roles

| Use | DB index | Config key |
|-----|---------|------------|
| Celery broker | `/0` | `CELERY_BROKER_URL` |
| Django cache (future) | `/1` | `CACHES` |

---

## Real-time / WebSockets (future consideration)

Current setup is WSGI-only — no WebSocket support. When real-time messaging is needed (e.g. internal marketplace chat), the stack must move to ASGI (Daphne or Uvicorn) + Django Channels. Plan before building the messaging system — it's a breaking infra change.

---

## Package management

```bash
uv add <package>   # add dependency
uv sync            # install all deps from uv.lock
uv run <command>   # run inside the venv
```

Always commit `uv.lock`. On merge conflicts: resolve one version, run `uv sync` to regenerate.

---

## File storage

- **Dev:** local filesystem (`MEDIA_ROOT`)
- **Prod target:** Cloudflare R2 (S3-compatible) — migration not yet done

Upload paths always use UUIDs:
```python
def upload_to(instance, filename):
    ext = filename.rsplit(".", 1)[-1]
    return f"subfolder/{uuid.uuid4()}.{ext}"
```

**Default assets** (landing page photos, etc.) live under `media/defaults/` and are tracked in git. They must be copied into the production media root on first deploy — see [media-defaults.md](media-defaults.md).

---

## CI (Azure DevOps)

Pipeline enforces `black` and `ruff`. Run locally before pushing:

```bash
docker compose exec api uv run black .
docker compose exec api uv run ruff check --fix .
```
