## Running without Docker

```bash
cd server
uv sync
cp .env.example .env                        # fill in values
uv run python manage.py migrate
uv run python manage.py seed_permissions
uv run python manage.py seed_roles
uv run python manage.py seed_modalities
uv run python manage.py seed_size_systems
uv run python manage.py seed_sizes
uv run python manage.py seed_categories
uv run python manage.py seed_colors
uv run python manage.py bootstrap_user --email dev@test.com --password '123456' --role direction
uv run python manage.py runserver
```

## Running with Docker

Requires Docker Desktop running.

```bash
# from repo root
docker compose up --build
```

First time only — in a separate terminal:

```bash
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py seed_permissions
docker compose exec api uv run python manage.py seed_roles
docker compose exec api uv run python manage.py seed_modalities
docker compose exec api uv run python manage.py seed_size_systems
docker compose exec api uv run python manage.py seed_sizes
docker compose exec api uv run python manage.py seed_categories
docker compose exec api uv run python manage.py seed_colors
docker compose exec api uv run python manage.py bootstrap_user --email dev@test.com --password '123456' --role direction
```

Services:

- API: [http://localhost:8000](http://localhost:8000)
- Mailpit UI: [http://localhost:8025](http://localhost:8025)
- Postgres: localhost:5433
- Flower (Celery monitor): [http://localhost:5555](http://localhost:5555)
- RedisInsight: [http://localhost:5540](http://localhost:5540)
- Portainer (container monitor): [http://localhost:9000](http://localhost:9000)

## Seeding demo data

Populates the database with multiple users (one per role) and minimum data for
every page on the web client — studios, classes, modality links, an open
enrollment period with submissions in different statuses, coachings (scheduled,
requested, completed), billing entries and fines, events, school + member
inventory, marketplace listings, and teacher availability.

The command also applies migrations and runs every catalog seeder in the
codebase (`seed_roles`, `seed_permissions`, `seed_modalities`,
`seed_size_systems`, `seed_sizes`, `seed_colors`, `seed_categories`), so a
single invocation is enough.

All seeded users share the same email host and password (defaults:
`@studioos.dev` / `123456`).

With `docker compose up` running:

```bash
docker compose exec api uv run python manage.py seed_demo_data
```

Optional flags for a custom email host or password:

```bash
docker compose exec api uv run python manage.py seed_demo_data \
  --host example.test --password mypwd
```

Works identically on macOS, Linux and Windows (PowerShell or cmd) — no shell
wrapper required.

The command is idempotent — re-running creates missing rows and refreshes
passwords on existing ones.

Seeded accounts:


| Email                                                         | Role             |
| ------------------------------------------------------------- | ---------------- |
| [direction@studioos.dev](mailto:direction@studioos.dev)       | direction        |
| [coordination@studioos.dev](mailto:coordination@studioos.dev) | coordination     |
| [collaborator@studioos.dev](mailto:collaborator@studioos.dev) | collaborator     |
| [teacher1@studioos.dev](mailto:teacher1@studioos.dev)         | teacher          |
| [teacher2@studioos.dev](mailto:teacher2@studioos.dev)         | teacher          |
| [teacherext@studioos.dev](mailto:teacherext@studioos.dev)     | teacher_external |
| [parent1@studioos.dev](mailto:parent1@studioos.dev)           | parent           |
| [parent2@studioos.dev](mailto:parent2@studioos.dev)           | parent           |
| [student1@studioos.dev](mailto:student1@studioos.dev) … 4     | student          |


### Wiping the database

To start from a clean slate (drops every row by recreating the database inside
the docker Postgres container), stop the apps, drop & recreate the DB, then
re-seed:

```bash
docker compose stop api worker beat flower
docker compose exec db psql -U studioos -d postgres -c "DROP DATABASE studioos;"
docker compose exec db psql -U studioos -d postgres -c "CREATE DATABASE studioos OWNER studioos;"
docker compose up -d api worker beat
docker compose exec api uv run python manage.py seed_demo_data
```

The seed command takes care of migrations and catalog data on its own.

## Tests

```bash
uv run pytest -s
```

## Adding a dependency

```bash
uv add <package-name>
```

## Before committing

After every change run the following commands; they format and lint code:

```bash
uv run black .
uv run ruff check --fix .
```

## PR review

Paste the following prompt to review your changes:

```
Review against .github/studioos-backend-rules-full.md (repository root). Violations only; by severity (blocker, should-fix, nit); cite files and lines where useful. No code rewrites.
Optional focus — commit(s): [...]
```

