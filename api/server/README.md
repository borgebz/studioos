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

- API: http://localhost:8000
- Mailpit UI: http://localhost:8025
- Postgres: localhost:5433
- Flower (Celery monitor): http://localhost:5555
- RedisInsight: http://localhost:5540
- Portainer (container monitor): http://localhost:9000

## Seeding demo data

Populates the database with multiple users (one per role) and minimum data for
every page on the web client — studios, classes, modality links, an open
enrollment period with submissions in different statuses, coachings (scheduled,
requested, completed), billing entries and fines, events, school + member
inventory, marketplace listings, and teacher availability.

The seed command also runs every catalog seeder in the codebase
(`seed_roles`, `seed_permissions`, `seed_modalities`, `seed_size_systems`,
`seed_sizes`, `seed_colors`, `seed_categories`), so you do **not** need to
invoke those separately.

All seeded users share the same email host and password (defaults:
`@studioos.dev` / `123456`).

**macOS / Linux / WSL / Git Bash:**

```bash
# From the repo root, with docker compose up
./scripts/seed_demo_data.sh

# Custom email host or password
./scripts/seed_demo_data.sh --host example.test --password mypwd
```

**Windows (PowerShell):**

```powershell
.\scripts\seed_demo_data.ps1

# Custom email host or password
.\scripts\seed_demo_data.ps1 -EmailHost example.test -Password mypwd
```

Or call the management command directly (works on any OS):

```bash
docker compose exec api uv run python manage.py seed_demo_data
```

The command is idempotent — re-running creates missing rows and refreshes
passwords on existing ones.

Seeded accounts:

| Email                          | Role              |
|--------------------------------|-------------------|
| direction@studioos.dev         | direction         |
| coordination@studioos.dev      | coordination      |
| collaborator@studioos.dev      | collaborator      |
| teacher1@studioos.dev          | teacher           |
| teacher2@studioos.dev          | teacher           |
| teacherext@studioos.dev        | teacher_external  |
| parent1@studioos.dev           | parent            |
| parent2@studioos.dev           | parent            |
| student1@studioos.dev … 4      | student           |

### Wiping the database

To start from a clean slate (drops every row in every table by recreating the
database inside the docker Postgres container):

**macOS / Linux / WSL / Git Bash:**

```bash
./scripts/reset_db.sh           # prompts for confirmation
./scripts/reset_db.sh --yes     # skip the confirmation prompt
```

**Windows (PowerShell):**

```powershell
.\scripts\reset_db.ps1
.\scripts\reset_db.ps1 -Yes     # skip the confirmation prompt
```

After resetting, re-run the seed:

```bash
./scripts/seed_demo_data.sh      # or .\scripts\seed_demo_data.ps1 on Windows
```

The reset script handles migrations on the next seed run automatically — the
seed wrapper applies them before populating data.

> **Windows note:** the `.ps1` scripts require Docker Desktop. If PowerShell
> blocks execution, run them once with
> `powershell -ExecutionPolicy Bypass -File .\scripts\seed_demo_data.ps1` or
> set the policy with
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

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
