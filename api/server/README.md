## Running without Docker

```bash
cd server
uv sync
cp .env.example .env                        # fill in values
uv run python manage.py migrate
uv run python manage.py seed_permissions
uv run python manage.py seed_roles
uv run python manage.py seed_modalities
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
docker compose exec api uv run python manage.py bootstrap_user --email dev@test.com --password '123456' --role direction
```

Services:

- API: http://localhost:8000
- Mailpit UI: http://localhost:8025
- Postgres: localhost:5433

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
